import { useCallback, useEffect, useMemo, useState } from "react";

import {
  adminCreatePlan,
  adminDeletePlan,
  adminGetPlans,
  adminUpdatePlan
} from "../Services/adminBilling.api.js";

const safeString = (v) => (typeof v === "string" ? v : "");

const FEATURE_GROUPS = [
  {
    label: "PEOPLE & MINISTRIES",
    items: [
      { key: "members", label: "Members" },
      { key: "attendance", label: "Attendance" },
      { key: "programsEvents", label: "Programs & Events" },
      { key: "ministries", label: "Ministries" },
      { key: "announcement", label: "Announcement" }
    ]
  },
  {
    label: "FINANCE",
    items: [
      { key: "tithes", label: "Tithes" },
      { key: "specialFund", label: "Special fund" },
      { key: "offerings", label: "Offerings" },
      { key: "welfare", label: "Welfare" },
      { key: "pledges", label: "Pledges" },
      { key: "businessVentures", label: "Business Ventures" },
      { key: "expenses", label: "Expenses" },
      { key: "financialStatement", label: "Financial statement" }
    ]
  },
  {
    label: "ADMINISTRATION",
    items: [
      { key: "reportsAnalytics", label: "Reports & Analytics" },
      { key: "billing", label: "Billing" },
      { key: "referrals", label: "Referrals" },
      { key: "settings", label: "Settings" },
      { key: "supportHelp", label: "Support & Help" }
    ]
  }
];

const getEmptyFeatures = () => {
  const obj = {};
  for (const group of FEATURE_GROUPS) {
    for (const item of group.items) {
      obj[item.key] = false;
    }
  }
  return obj;
};

const normalizePlanValue = (value) => {
  const v = safeString(value).trim().toLowerCase();
  if (v === "free lite" || v === "basic" || v === "standard" || v === "premium") return v;
  return "free lite";
};

function BillingPlansPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState([]);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [features, setFeatures] = useState(getEmptyFeatures);

  const [prices, setPrices] = useState({
    GHS: { monthly: "", halfYear: "", yearly: "" }
  });

  const planOptions = useMemo(
    () => [
      { value: "free lite", label: "Free Lite" },
      { value: "basic", label: "Basic" },
      { value: "standard", label: "Standard" },
      { value: "premium", label: "Premium" }
    ],
    []
  );

  const sorted = useMemo(() => {
    const arr = Array.isArray(plans) ? [...plans] : [];
    return arr.sort((a, b) => {
      const aName = safeString(a?.name).toLowerCase();
      const bName = safeString(b?.name).toLowerCase();
      const order = (n) => (n === "free lite" ? 0 : n === "basic" ? 1 : n === "standard" ? 2 : n === "premium" ? 3 : 99);
      return order(aName) - order(bName);
    });
  }, [plans]);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    return (Array.isArray(sorted) ? sorted : []).filter((p) => {
      if (activeFilter === "active" && !p?.isActive) return false;
      if (activeFilter === "inactive" && p?.isActive) return false;

      if (!q) return true;
      const desc = safeString(p?.description).toLowerCase();
      const name = safeString(p?.name).toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [activeFilter, search, sorted]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminGetPlans();
      setPlans(Array.isArray(res?.data?.plans) ? res.data.plans : []);
    } catch (e) {
      setPlans([]);
      setError(e?.response?.data?.message || e?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setName("free lite");
    setDescription("");
    setIsActive(true);
    setFeatures(getEmptyFeatures());
    setPrices({
      GHS: { monthly: "", halfYear: "", yearly: "" }
    });
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p?._id || null);
    setName(normalizePlanValue(p?.name));
    setDescription(safeString(p?.description));
    setIsActive(p?.isActive !== false);

    const by = p?.priceByCurrency || p?.pricing || {};
    const nextPrices = {
      GHS: {
        monthly: by?.GHS?.monthly !== undefined && by?.GHS?.monthly !== null ? String(by.GHS.monthly) : "",
        halfYear: by?.GHS?.halfYear !== undefined && by?.GHS?.halfYear !== null ? String(by.GHS.halfYear) : "",
        yearly: by?.GHS?.yearly !== undefined && by?.GHS?.yearly !== null ? String(by.GHS.yearly) : ""
      }
    };
    setPrices(nextPrices);

    const savedFeatures = p?.features || {};
    const nextFeatures = getEmptyFeatures();
    for (const key of Object.keys(nextFeatures)) {
      if (key === "announcement") {
        nextFeatures.announcement = Boolean(savedFeatures?.announcement || savedFeatures?.announcements);
        continue;
      }
      nextFeatures[key] = Boolean(savedFeatures?.[key]);
    }
    setFeatures(nextFeatures);

    setFormOpen(true);
  };

  const onSave = async () => {
    const normalizedName = safeString(name).trim().toLowerCase();
    if (!normalizedName) {
      setError("Plan name is required");
      return;
    }

    const toNumberOrNull = (v) => {
      if (v === "" || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    const priceByCurrency = {};
    const row = prices?.GHS || {};
    const monthly = toNumberOrNull(row.monthly);
    const halfYear = toNumberOrNull(row.halfYear);
    const yearly = toNumberOrNull(row.yearly);

    if (Number.isNaN(monthly) || Number.isNaN(halfYear) || Number.isNaN(yearly)) {
      setError("Plan prices must be numbers");
      return;
    }

    if (monthly !== null || halfYear !== null || yearly !== null) {
      priceByCurrency.GHS = {
        ...(monthly !== null ? { monthly } : {}),
        ...(halfYear !== null ? { halfYear } : {}),
        ...(yearly !== null ? { yearly } : {})
      };
    }

    if (Object.keys(priceByCurrency).length === 0) {
      setError("At least one currency price is required");
      return;
    }

    const featuresPayload = { ...(features || {}) };
    const peopleKeys = FEATURE_GROUPS[0].items.map((x) => x.key);
    const financeKeys = FEATURE_GROUPS[1].items.map((x) => x.key);
    const adminKeys = FEATURE_GROUPS[2].items.map((x) => x.key);

    const peopleMinistriesEnabled = peopleKeys.some((k) => Boolean(featuresPayload?.[k]));
    const financeEnabled = financeKeys.some((k) => Boolean(featuresPayload?.[k]));
    const adminEnabled = adminKeys.some((k) => Boolean(featuresPayload?.[k]));

    featuresPayload.announcements = Boolean(featuresPayload.announcement);
    featuresPayload.financeModule = financeEnabled;

    const featureCategories = {
      peopleMinistries: peopleMinistriesEnabled,
      finance: financeEnabled,
      administration: adminEnabled
    };

    setLoading(true);
    setError("");
    try {
      if (editingId) {
        await adminUpdatePlan(editingId, {
          name: normalizedName,
          description,
          isActive,
          priceByCurrency,
          features: featuresPayload,
          featureCategories
        });
      } else {
        await adminCreatePlan({
          name: normalizedName,
          description,
          isActive,
          priceByCurrency,
          features: featuresPayload,
          featureCategories
        });
      }
      setFormOpen(false);
      resetForm();
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to save plan");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this plan? This cannot be undone.")) return;

    setLoading(true);
    setError("");
    try {
      await adminDeletePlan(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-gray-900">Plans</div>
          <div className="mt-1 text-sm text-gray-600">Create, edit, deactivate, or delete plans.</div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New Plan
        </button>
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search plan name or description..."
          className="w-full md:w-80 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="w-full md:w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All statuses</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
        <div className="flex-1" />
        <div className="text-xs text-gray-500">{filtered.length} plan(s)</div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-gray-400">
            <tr className="border-b">
              <th className="py-3 text-left font-semibold">Name</th>
              <th className="py-3 text-left font-semibold">GHS (M / 6M / Y)</th>
              <th className="py-3 text-left font-semibold">Status</th>
              <th className="py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-500">
                  No plans found.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const fmt = (row) => {
                  const m = row?.monthly;
                  const h = row?.halfYear;
                  const y = row?.yearly;
                  const show = (v) => (v === undefined || v === null ? "—" : v);
                  return `${show(m)} / ${show(h)} / ${show(y)}`;
                };

                const by = p?.priceByCurrency || p?.pricing || {};
                const ghs = by?.GHS || {};
                return (
                  <tr key={p?._id} className="border-b last:border-b-0">
                    <td className="py-3 text-gray-900">{p?.name || "—"}</td>
                    <td className="py-3 text-gray-700">{fmt(ghs)}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p?.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {p?.isActive ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(p?._id)}
                          className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="p-5 overflow-y-auto max-h-[90vh]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{editingId ? "Edit Plan" : "New Plan"}</div>
                  <div className="mt-1 text-sm text-gray-600">Set pricing per currency and billing cycle.</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    resetForm();
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-600">Plan Name</div>
                  <select
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {planOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-600">Description</div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-600">Pricing</div>
                  <div className="mt-2 grid gap-3">
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="text-sm font-semibold text-gray-900">Ghana Cedi (GHS)</div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <div className="text-xs font-semibold text-gray-600">Monthly</div>
                          <input
                            value={prices?.GHS?.monthly || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setPrices((prev) => ({
                                ...(prev || {}),
                                GHS: {
                                  ...(prev?.GHS || {}),
                                  monthly: v
                                }
                              }));
                            }}
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="e.g. 50"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-600">6 months</div>
                          <input
                            value={prices?.GHS?.halfYear || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setPrices((prev) => ({
                                ...(prev || {}),
                                GHS: {
                                  ...(prev?.GHS || {}),
                                  halfYear: v
                                }
                              }));
                            }}
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="e.g. 270"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-600">Yearly</div>
                          <input
                            value={prices?.GHS?.yearly || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setPrices((prev) => ({
                                ...(prev || {}),
                                GHS: {
                                  ...(prev?.GHS || {}),
                                  yearly: v
                                }
                              }));
                            }}
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="e.g. 500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-600">Modules</div>
                  <div className="mt-2 grid gap-4">
                    {FEATURE_GROUPS.map((group) => (
                      <div key={group.label} className="rounded-lg border border-gray-200 p-3">
                        <div className="text-sm font-semibold text-gray-900">{group.label}</div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.items.map((item) => (
                            <label key={item.key} className="inline-flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={Boolean(features?.[item.key])}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setFeatures((prev) => ({
                                    ...(prev || {}),
                                    [item.key]: checked
                                  }));
                                }}
                              />
                              {item.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  Active
                </label>

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormOpen(false);
                      resetForm();
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={loading}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BillingPlansPage;
