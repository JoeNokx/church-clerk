import { useCallback, useEffect, useMemo, useState } from "react";

import {
  adminCreatePlan,
  adminDeletePlan,
  adminGetPlans,
  adminUpdatePlan
} from "../Services/adminBilling.api.js";

const safeString = (v) => (typeof v === "string" ? v : "");

const normalizePlanValue = (value) => {
  const v = safeString(value).trim().toLowerCase();
  if (v === "free lite" || v === "basic" || v === "standard" || v === "premium") return v;
  return "free lite";
};

function BillingPlansPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [currency, setCurrency] = useState("GHS");
  const [pricingMonthly, setPricingMonthly] = useState("");
  const [pricingHalfYear, setPricingHalfYear] = useState("");
  const [pricingYearly, setPricingYearly] = useState("");

  const [catPeopleMinistries, setCatPeopleMinistries] = useState(false);
  const [catFinance, setCatFinance] = useState(false);
  const [catAdministration, setCatAdministration] = useState(false);

  const [prices, setPrices] = useState({
    GHS: { monthly: "", halfYear: "", yearly: "" },
    NGN: { monthly: "", halfYear: "", yearly: "" },
    USD: { monthly: "", halfYear: "", yearly: "" }
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
    setCurrency("GHS");
    setPricingMonthly("");
    setPricingHalfYear("");
    setPricingYearly("");
    setCatPeopleMinistries(false);
    setCatFinance(false);
    setCatAdministration(false);
    setPrices({
      GHS: { monthly: "", halfYear: "", yearly: "" },
      NGN: { monthly: "", halfYear: "", yearly: "" },
      USD: { monthly: "", halfYear: "", yearly: "" }
    });
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const currencyLabel = (cur) => {
    if (cur === "GHS") return "Ghana Cedi (GHS)";
    if (cur === "NGN") return "Nigeria Naira (NGN)";
    if (cur === "USD") return "USD (for other countries)";
    return cur;
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
      },
      NGN: {
        monthly: by?.NGN?.monthly !== undefined && by?.NGN?.monthly !== null ? String(by.NGN.monthly) : "",
        halfYear: by?.NGN?.halfYear !== undefined && by?.NGN?.halfYear !== null ? String(by.NGN.halfYear) : "",
        yearly: by?.NGN?.yearly !== undefined && by?.NGN?.yearly !== null ? String(by.NGN.yearly) : ""
      },
      USD: {
        monthly: by?.USD?.monthly !== undefined && by?.USD?.monthly !== null ? String(by.USD.monthly) : "",
        halfYear: by?.USD?.halfYear !== undefined && by?.USD?.halfYear !== null ? String(by.USD.halfYear) : "",
        yearly: by?.USD?.yearly !== undefined && by?.USD?.yearly !== null ? String(by.USD.yearly) : ""
      }
    };
    setPrices(nextPrices);

    setCurrency("GHS");
    setPricingMonthly(nextPrices.GHS.monthly);
    setPricingHalfYear(nextPrices.GHS.halfYear);
    setPricingYearly(nextPrices.GHS.yearly);

    const cats = p?.featureCategories || {};
    setCatPeopleMinistries(Boolean(cats?.peopleMinistries));
    setCatFinance(Boolean(cats?.finance));
    setCatAdministration(Boolean(cats?.administration));

    setFormOpen(true);
  };

  const onSave = async () => {
    const normalizedName = safeString(name).trim().toLowerCase();
    if (!normalizedName) {
      setError("Plan name is required");
      return;
    }

    const nextPrices = {
      ...(prices || {}),
      [currency]: {
        monthly: pricingMonthly,
        halfYear: pricingHalfYear,
        yearly: pricingYearly
      }
    };

    const toNumberOrNull = (v) => {
      if (v === "" || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    const priceByCurrency = {};
    const currencies = ["GHS", "NGN", "USD"];
    for (const cur of currencies) {
      const row = nextPrices?.[cur] || {};
      const monthly = toNumberOrNull(row.monthly);
      const halfYear = toNumberOrNull(row.halfYear);
      const yearly = toNumberOrNull(row.yearly);

      if (Number.isNaN(monthly) || Number.isNaN(halfYear) || Number.isNaN(yearly)) {
        setError("Plan prices must be numbers");
        return;
      }

      if (monthly !== null || halfYear !== null || yearly !== null) {
        priceByCurrency[cur] = {
          ...(monthly !== null ? { monthly } : {}),
          ...(halfYear !== null ? { halfYear } : {}),
          ...(yearly !== null ? { yearly } : {})
        };
      }
    }

    if (Object.keys(priceByCurrency).length === 0) {
      setError("At least one currency price is required");
      return;
    }

    const featureCategories = {
      peopleMinistries: Boolean(catPeopleMinistries),
      finance: Boolean(catFinance),
      administration: Boolean(catAdministration)
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
          featureCategories
        });
      } else {
        await adminCreatePlan({
          name: normalizedName,
          description,
          isActive,
          priceByCurrency,
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

      {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-gray-400">
            <tr className="border-b">
              <th className="py-3 text-left font-semibold">Name</th>
              <th className="py-3 text-left font-semibold">Monthly (GHS)</th>
              <th className="py-3 text-left font-semibold">6 months (GHS)</th>
              <th className="py-3 text-left font-semibold">Yearly (GHS)</th>
              <th className="py-3 text-left font-semibold">Status</th>
              <th className="py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  No plans found.
                </td>
              </tr>
            ) : (
              sorted.map((p) => {
                const ghs = p?.priceByCurrency?.GHS || p?.pricing?.GHS || {};
                const monthly = ghs?.monthly;
                const halfYear = ghs?.halfYear;
                const yearly = ghs?.yearly;

                return (
                  <tr key={p?._id} className="border-b last:border-b-0">
                    <td className="py-3 text-gray-900">{p?.name || "—"}</td>
                    <td className="py-3 text-gray-700">{monthly !== undefined ? monthly : "—"}</td>
                    <td className="py-3 text-gray-700">{halfYear !== undefined ? halfYear : "—"}</td>
                    <td className="py-3 text-gray-700">{yearly !== undefined ? yearly : "—"}</td>
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
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
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
                <div className="text-xs font-semibold text-gray-600">Currency</div>
                <select
                  value={currency}
                  onChange={(e) => {
                    const next = e.target.value;
                    const updated = {
                      ...(prices || {}),
                      [currency]: {
                        monthly: pricingMonthly,
                        halfYear: pricingHalfYear,
                        yearly: pricingYearly
                      }
                    };

                    setPrices(updated);
                    setCurrency(next);

                    const row = updated?.[next] || { monthly: "", halfYear: "", yearly: "" };
                    setPricingMonthly(row.monthly || "");
                    setPricingHalfYear(row.halfYear || "");
                    setPricingYearly(row.yearly || "");
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="GHS">{currencyLabel("GHS")}</option>
                  <option value="NGN">{currencyLabel("NGN")}</option>
                  <option value="USD">{currencyLabel("USD")}</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-600">Monthly</div>
                  <input
                    value={pricingMonthly}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPricingMonthly(v);
                      setPrices((prev) => ({
                        ...(prev || {}),
                        [currency]: {
                          ...(prev?.[currency] || {}),
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
                    value={pricingHalfYear}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPricingHalfYear(v);
                      setPrices((prev) => ({
                        ...(prev || {}),
                        [currency]: {
                          ...(prev?.[currency] || {}),
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
                    value={pricingYearly}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPricingYearly(v);
                      setPrices((prev) => ({
                        ...(prev || {}),
                        [currency]: {
                          ...(prev?.[currency] || {}),
                          yearly: v
                        }
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. 500"
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600">Feature Categories</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={catPeopleMinistries}
                      onChange={(e) => setCatPeopleMinistries(e.target.checked)}
                    />
                    PEOPLE &amp; MINISTRIES
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={catFinance} onChange={(e) => setCatFinance(e.target.checked)} />
                    FINANCE
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={catAdministration}
                      onChange={(e) => setCatAdministration(e.target.checked)}
                    />
                    ADMINISTRATION
                  </label>
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
      ) : null}
    </div>
  );
}

export default BillingPlansPage;
