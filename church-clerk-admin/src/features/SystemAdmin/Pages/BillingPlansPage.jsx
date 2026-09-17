import { useCallback, useEffect, useMemo, useState } from "react";

import {
  adminCreatePlan,
  adminDeletePlan,
  adminGetPlans,
  adminUpdatePlan,
  getPublicExchangeRate
} from "../Services/adminBilling.api.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import Card from "../../../shared/components/Card/index.jsx";
import StatusChip from "../../../shared/components/StatusChip/index.jsx";
import Button from "../../../shared/components/Button/index.jsx";

const safeString = (v) => (typeof v === "string" ? v : "");

const FEATURE_GROUPS = [
  {
    label: "CORE",
    items: [
      { key: "dashboard", label: "Dashboard" },
      { key: "branchesOverview", label: "Branches Overview" }
    ]
  },
  {
    label: "PEOPLE & ORGANISATIONS",
    items: [
      { key: "members", label: "Members" },
      { key: "attendance", label: "Attendance" },
      { key: "programsEvents", label: "Programs & Events" },
      { key: "organisations", label: "Organisations" },
      { key: "announcements", label: "Announcements" }
    ]
  },
  {
    label: "FINANCE",
    items: [
      { key: "tithes", label: "Tithes" },
      { key: "budgeting", label: "Budgeting" },
      { key: "specialFund", label: "Special fund" },
      { key: "offerings", label: "Offerings" },
      { key: "welfare", label: "Welfare" },
      { key: "pledges", label: "Pledges" },
      { key: "businessVentures", label: "Business Ventures" },
      { key: "expenses", label: "Expenses" },
      { key: "financialStatement", label: "Financial statement" },
      { key: "churchProjects", label: "Church Projects" },
      { key: "specialFunds", label: "Special funds" }
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

const ALL_FEATURE_KEYS = FEATURE_GROUPS.flatMap((g) => g.items.map((i) => i.key));

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

  const [usdToGhsRate, setUsdToGhsRate] = useState(0);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [memberLimit, setMemberLimit] = useState("");
  const [userLimit, setUserLimit] = useState("");
  const [monthlySmsCredits, setMonthlySmsCredits] = useState("0");

  const [features, setFeatures] = useState(getEmptyFeatures);

  const [prices, setPrices] = useState({
    GHS: { hourly: "", daily: "", weekly: "", monthly: "", quarterly: "", halfYear: "", yearly: "" }
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
      const [plansRes, rateRes] = await Promise.allSettled([adminGetPlans(), getPublicExchangeRate()]);
      if (plansRes.status === "fulfilled") {
        setPlans(Array.isArray(plansRes.value?.data?.plans) ? plansRes.value.data.plans : []);
      } else {
        setPlans([]);
        setError(plansRes.reason?.response?.data?.message || plansRes.reason?.message || "Failed to load plans");
      }
      if (rateRes.status === "fulfilled") {
        const r = Number(rateRes.value?.data?.usdToGhsRate);
        setUsdToGhsRate(Number.isFinite(r) && r > 0 ? r : 0);
      }
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
    setMemberLimit("");
    setUserLimit("");
    setMonthlySmsCredits("0");
    setFeatures(getEmptyFeatures());
    setPrices({
      GHS: { hourly: "", daily: "", weekly: "", monthly: "", quarterly: "", halfYear: "", yearly: "" }
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

    setMemberLimit(p?.memberLimit === null || p?.memberLimit === undefined ? "" : String(p.memberLimit));
    setUserLimit(p?.userLimit === null || p?.userLimit === undefined ? "" : String(p.userLimit));
    setMonthlySmsCredits(p?.monthlySmsCredits === null || p?.monthlySmsCredits === undefined ? "0" : String(p.monthlySmsCredits));

    const by = p?.priceByCurrency || p?.pricing || {};
    const toStr = (v) => (v !== undefined && v !== null ? String(v) : "");
    const nextPrices = {
      GHS: {
        hourly:    toStr(by?.GHS?.hourly),
        daily:     toStr(by?.GHS?.daily),
        weekly:    toStr(by?.GHS?.weekly),
        monthly:   toStr(by?.GHS?.monthly),
        quarterly: toStr(by?.GHS?.quarterly),
        halfYear:  toStr(by?.GHS?.halfYear),
        yearly:    toStr(by?.GHS?.yearly)
      }
    };
    setPrices(nextPrices);

    const savedFeatures = p?.features || {};
    const nextFeatures = getEmptyFeatures();
    for (const key of Object.keys(nextFeatures)) {
      nextFeatures[key] = Boolean(savedFeatures?.[key]);
    }

    nextFeatures.announcements = Boolean(savedFeatures?.announcements || savedFeatures?.announcement);
    nextFeatures.specialFunds = Boolean(savedFeatures?.specialFunds || savedFeatures?.specialFund);
    nextFeatures.churchProjects = Boolean(savedFeatures?.churchProjects);
    nextFeatures.dashboard = savedFeatures?.dashboard !== undefined ? Boolean(savedFeatures.dashboard) : true;
    nextFeatures.branchesOverview = Boolean(savedFeatures?.branchesOverview);
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

    const memberLimitNum = toNumberOrNull(memberLimit);
    const userLimitNum = toNumberOrNull(userLimit);
    if (Number.isNaN(memberLimitNum) || Number.isNaN(userLimitNum)) {
      setError("Limits must be numbers");
      return;
    }
    if ((memberLimitNum !== null && memberLimitNum < 0) || (userLimitNum !== null && userLimitNum < 0)) {
      setError("Limits must be 0 or greater");
      return;
    }

    const monthlySmsCreditsNum = Number(monthlySmsCredits);
    if (!Number.isFinite(monthlySmsCreditsNum) || monthlySmsCreditsNum < 0 || !Number.isInteger(monthlySmsCreditsNum)) {
      setError("Monthly SMS Credits must be a whole number >= 0");
      return;
    }

    const priceByCurrency = {};
    const row = prices?.GHS || {};
    const INTERVALS = ["hourly", "daily", "weekly", "monthly", "quarterly", "halfYear", "yearly"];
    const ghsPrices = {};
    for (const k of INTERVALS) {
      const parsed = toNumberOrNull(row[k]);
      if (Number.isNaN(parsed)) { setError(`${k} price must be a number`); return; }
      if (parsed !== null) ghsPrices[k] = parsed;
    }
    if (Object.keys(ghsPrices).length === 0) {
      setError("At least one interval price is required");
      return;
    }
    priceByCurrency.GHS = ghsPrices;

    const featuresPayload = { ...(features || {}) };
    const peopleKeys = FEATURE_GROUPS.find((g) => g.label === "PEOPLE & ORGANISATIONS")?.items.map((x) => x.key) || [];
    const financeKeys = FEATURE_GROUPS.find((g) => g.label === "FINANCE")?.items.map((x) => x.key) || [];
    const adminKeys = FEATURE_GROUPS.find((g) => g.label === "ADMINISTRATION")?.items.map((x) => x.key) || [];

    const peopleMinistriesEnabled = peopleKeys.some((k) => Boolean(featuresPayload?.[k]));
    const financeEnabled = financeKeys.some((k) => Boolean(featuresPayload?.[k]));
    const adminEnabled = adminKeys.some((k) => Boolean(featuresPayload?.[k]));

    featuresPayload.announcements = Boolean(featuresPayload.announcements);
    featuresPayload.announcement = Boolean(featuresPayload.announcements);
    featuresPayload.specialFunds = Boolean(featuresPayload.specialFunds);
    featuresPayload.specialFund = Boolean(featuresPayload.specialFunds || featuresPayload.specialFund);
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
          memberLimit: memberLimitNum,
          userLimit: userLimitNum,
          monthlySmsCredits: monthlySmsCreditsNum,
          priceByCurrency,
          features: featuresPayload,
          featureCategories
        });
      } else {
        await adminCreatePlan({
          name: normalizedName,
          description,
          isActive,
          memberLimit: memberLimitNum,
          userLimit: userLimitNum,
          monthlySmsCredits: monthlySmsCreditsNum,
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
    <Card className="!rounded-xl !gap-0">
      <Card.Header
        title="Plans"
        actions={
          <Button variant="primary" size="sm" onClick={openCreate}>
            New Plan
          </Button>
        }
      />
      <div className="mt-1 text-sm text-gray-600">Create, edit, deactivate, or delete plans.</div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search plan name or description..."
        searchWidth="md:w-80"
        selects={[
          {
            key: "status",
            value: activeFilter,
            onChange: setActiveFilter,
            placeholder: "All statuses",
            options: [
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" }
            ]
          }
        ]}
        className="mt-4"
      >
        <div className="text-xs text-gray-500 ml-auto self-center">{filtered.length} plan(s)</div>
      </FilterBar>

      {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

      <div className="mt-3 flex items-center gap-2">
        {usdToGhsRate > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
            USD rate: 1 USD = GHS {usdToGhsRate.toFixed(2)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
            USD rate not set — USD column uses live market rate
          </span>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-gray-400">
            <tr className="border-b">
              <th className="py-3 text-left font-semibold">Name</th>
              <th className="py-3 text-left font-semibold">GHS (Hr / Day / Wk / Mo / Qtr / 6M / Yr)</th>
              {usdToGhsRate > 0 && (
                <th className="py-3 text-left font-semibold text-blue-700">USD equiv. (Hr / Day / Wk / Mo / Qtr / 6M / Yr)</th>
              )}
              <th className="py-3 text-left font-semibold">Monthly SMS Credits</th>
              <th className="py-3 text-left font-semibold">Status</th>
              <th className="py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-gray-200" /></td>
                  </tr>
                ))}
              </>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={usdToGhsRate > 0 ? 6 : 5}>
                  <EmptyState
                    compact
                    illustration="billing"
                    title="No plans found"
                    description="Try adjusting your search or filters, or create a new plan."
                  />
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const INTERVALS = ["hourly","daily","weekly","monthly","quarterly","halfYear","yearly"];
                const by = p?.priceByCurrency || p?.pricing || {};
                const ghs = by?.GHS || {};

                const fmtGhs = () => {
                  const show = (v) => (v === undefined || v === null || v === "" ? "—" : v);
                  return INTERVALS.map((k) => show(ghs?.[k])).join(" / ");
                };

                const fmtUsd = () => {
                  if (!usdToGhsRate) return null;
                  return INTERVALS.map((k) => {
                    const g = Number(ghs?.[k]);
                    if (!g || !Number.isFinite(g)) return "—";
                    return "$" + (g / usdToGhsRate).toFixed(2);
                  }).join(" / ");
                };

                return (
                  <tr key={p?._id} className="border-b last:border-b-0">
                    <td className="py-3 text-gray-900" title={p?.name || ""}>
                      <span className="sm:hidden">{truncateMobileName(p?.name)}</span>
                      <span className="hidden sm:inline">{truncateDesktopName(p?.name)}</span>
                    </td>
                    <td className="py-3 text-gray-700">{fmtGhs()}</td>
                    {usdToGhsRate > 0 && (
                      <td className="py-3 text-blue-700 font-medium">{fmtUsd()}</td>
                    )}
                    <td className="py-3 text-gray-900 font-semibold">
                      {Number(p?.monthlySmsCredits || 0).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <StatusChip value={p?.isActive ? "active" : "inactive"} />
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEdit(p)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => onDelete(p?._id)}
                        >
                          Delete
                        </Button>
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFormOpen(false);
                    resetForm();
                  }}
                >
                  Close
                </Button>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-600">Member Limit</div>
                    <input
                      value={memberLimit}
                      onChange={(e) => setMemberLimit(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="Leave empty for unlimited"
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-600">User Limit</div>
                    <input
                      value={userLimit}
                      onChange={(e) => setUserLimit(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="Leave empty for unlimited"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-600">Monthly Included SMS Credits</div>
                  <input
                    value={monthlySmsCredits}
                    onChange={(e) => setMonthlySmsCredits(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. 0, 100, 500, 1000"
                    inputMode="numeric"
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    Included SMS credits granted each billing period. Resets when the subscription renews. Set 0 for no included credits.
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-600">Pricing</div>
                  <div className="mt-2 grid gap-3">
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="text-sm font-semibold text-gray-900">Ghana Cedi (GHS) — leave blank to skip that interval</div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { key: "hourly",    label: "Hourly",      placeholder: "e.g. 2" },
                          { key: "daily",     label: "Daily",       placeholder: "e.g. 10" },
                          { key: "weekly",    label: "Weekly",      placeholder: "e.g. 50" },
                          { key: "monthly",   label: "Monthly",     placeholder: "e.g. 150" },
                          { key: "quarterly", label: "Quarterly (3M)", placeholder: "e.g. 400" },
                          { key: "halfYear",  label: "Half-Yearly (6M)", placeholder: "e.g. 750" },
                          { key: "yearly",    label: "Yearly",      placeholder: "e.g. 1400" }
                        ].map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <div className="text-xs font-semibold text-gray-600">{label}</div>
                            <input
                              value={prices?.GHS?.[key] || ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPrices((prev) => ({
                                  ...(prev || {}),
                                  GHS: { ...(prev?.GHS || {}), [key]: v }
                                }));
                              }}
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                              placeholder={placeholder}
                              inputMode="decimal"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-600">Modules</div>
                  <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={ALL_FEATURE_KEYS.every((k) => Boolean(features?.[k]))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const next = getEmptyFeatures();
                        for (const k of Object.keys(next)) {
                          next[k] = checked;
                        }
                        if (checked && next.dashboard !== undefined) {
                          next.dashboard = true;
                        }
                        setFeatures(next);
                      }}
                    />
                    Select all modules
                  </label>
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
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setFormOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={onSave}
                    loading={loading}
                    loadingText="Saving..."
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export default BillingPlansPage;
