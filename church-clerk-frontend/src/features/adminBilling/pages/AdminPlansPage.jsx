import { useEffect, useMemo, useState } from "react";
import { createPlan, deletePlan, getPlans, updatePlan } from "../services/adminBilling.api.js";

const emptyForm = {
  name: "basic",
  description: "",
  memberLimit: "",
  isActive: true,
  financeModule: false,
  announcements: false,
  pricingGhsMonthly: "",
  pricingGhsHalfYear: "",
  pricingGhsYearly: "",
  pricingNgnMonthly: "",
  pricingNgnHalfYear: "",
  pricingNgnYearly: "",
  pricingUsdMonthly: "",
  pricingUsdHalfYear: "",
  pricingUsdYearly: ""
};

function AdminPlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const isEditing = Boolean(editingId);

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      const aT = new Date(a.createdAt || 0).getTime();
      const bT = new Date(b.createdAt || 0).getTime();
      return bT - aT;
    });
  }, [plans]);

  const toNumberOrNull = (value) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (Number.isNaN(n)) return null;
    return n;
  };

  const load = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await getPlans();
      setPlans(res?.data?.plans || []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onEdit = (plan) => {
    setSuccess("");
    setError("");
    setEditingId(plan._id);

    const pricing = plan?.priceByCurrency || plan?.pricing || {};

    setForm({
      name: plan.name || "basic",
      description: plan.description || "",
      memberLimit: plan.memberLimit ?? "",
      isActive: plan.isActive !== false,
      financeModule: Boolean(plan?.features?.financeModule),
      announcements: Boolean(plan?.features?.announcements),
      pricingGhsMonthly: pricing?.GHS?.monthly ?? "",
      pricingGhsHalfYear: pricing?.GHS?.halfYear ?? "",
      pricingGhsYearly: pricing?.GHS?.yearly ?? "",
      pricingNgnMonthly: pricing?.NGN?.monthly ?? "",
      pricingNgnHalfYear: pricing?.NGN?.halfYear ?? "",
      pricingNgnYearly: pricing?.NGN?.yearly ?? "",
      pricingUsdMonthly: pricing?.USD?.monthly ?? "",
      pricingUsdHalfYear: pricing?.USD?.halfYear ?? "",
      pricingUsdYearly: pricing?.USD?.yearly ?? ""
    });
  };

  const onCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        memberLimit: toNumberOrNull(form.memberLimit),
        isActive: Boolean(form.isActive),
        features: {
          financeModule: Boolean(form.financeModule),
          announcements: Boolean(form.announcements)
        },
        priceByCurrency: {
          GHS: {
            monthly: toNumberOrNull(form.pricingGhsMonthly),
            halfYear: toNumberOrNull(form.pricingGhsHalfYear),
            yearly: toNumberOrNull(form.pricingGhsYearly)
          },
          NGN: {
            monthly: toNumberOrNull(form.pricingNgnMonthly),
            halfYear: toNumberOrNull(form.pricingNgnHalfYear),
            yearly: toNumberOrNull(form.pricingNgnYearly)
          },
          USD: {
            monthly: toNumberOrNull(form.pricingUsdMonthly),
            halfYear: toNumberOrNull(form.pricingUsdHalfYear),
            yearly: toNumberOrNull(form.pricingUsdYearly)
          }
        }
      };

      if (isEditing) {
        await updatePlan(editingId, payload);
        setSuccess("Plan updated");
      } else {
        await createPlan(payload);
        setSuccess("Plan created");
      }

      onCancel();
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await deletePlan(id);
      setSuccess("Plan deleted");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl">
        <div className="text-lg font-semibold text-gray-900">Plans</div>
        <div className="mt-2 text-sm text-gray-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Plans</div>
          <div className="mt-1 text-sm text-gray-600">Create and manage subscription plans.</div>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-sm font-semibold text-gray-900">{isEditing ? "Edit Plan" : "Create Plan"}</div>

          <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500">Name</label>
              <select
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="basic">basic</option>
                <option value="standard">standard</option>
                <option value="premium">premium</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500">Member limit</label>
              <input
                value={form.memberLimit}
                onChange={(e) => setForm((p) => ({ ...p, memberLimit: e.target.value }))}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                placeholder="e.g. 100 (leave blank for unlimited)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.financeModule}
                  onChange={(e) => setForm((p) => ({ ...p, financeModule: e.target.checked }))}
                />
                Finance module
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.announcements}
                  onChange={(e) => setForm((p) => ({ ...p, announcements: e.target.checked }))}
                />
                Announcements
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                Active
              </label>
            </div>

            <div className="md:col-span-2">
              <div className="text-sm font-semibold text-gray-900">Prices (GHS)</div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={form.pricingGhsMonthly}
                  onChange={(e) => setForm((p) => ({ ...p, pricingGhsMonthly: e.target.value }))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Monthly"
                />
                <input
                  value={form.pricingGhsHalfYear}
                  onChange={(e) => setForm((p) => ({ ...p, pricingGhsHalfYear: e.target.value }))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Half-year"
                />
                <input
                  value={form.pricingGhsYearly}
                  onChange={(e) => setForm((p) => ({ ...p, pricingGhsYearly: e.target.value }))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Yearly"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-sm font-semibold text-gray-900">Prices (NGN)</div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={form.pricingNgnMonthly}
                  onChange={(e) => setForm((p) => ({ ...p, pricingNgnMonthly: e.target.value }))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Monthly"
                />
                <input
                  value={form.pricingNgnHalfYear}
                  onChange={(e) => setForm((p) => ({ ...p, pricingNgnHalfYear: e.target.value }))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Half-year"
                />
                <input
                  value={form.pricingNgnYearly}
                  onChange={(e) => setForm((p) => ({ ...p, pricingNgnYearly: e.target.value }))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Yearly"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-sm font-semibold text-gray-900">Prices (USD)</div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={form.pricingUsdMonthly}
                  onChange={(e) => setForm((p) => ({ ...p, pricingUsdMonthly: e.target.value }))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Monthly"
                />
                <input
                  value={form.pricingUsdHalfYear}
                  onChange={(e) => setForm((p) => ({ ...p, pricingUsdHalfYear: e.target.value }))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Half-year"
                />
                <input
                  value={form.pricingUsdYearly}
                  onChange={(e) => setForm((p) => ({ ...p, pricingUsdYearly: e.target.value }))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Yearly"
                />
              </div>
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : isEditing ? "Save Changes" : "Create Plan"}
              </button>

              {isEditing ? (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={saving}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-sm font-semibold text-gray-900">Existing Plans</div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Active</th>
                  <th className="py-2 pr-4">Member limit</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedPlans.map((p) => (
                  <tr key={p._id}>
                    <td className="py-3 pr-4 font-medium text-gray-900">{p.name}</td>
                    <td className="py-3 pr-4 text-gray-700">{p.isActive ? "Yes" : "No"}</td>
                    <td className="py-3 pr-4 text-gray-700">{p.memberLimit ?? "Unlimited"}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onEdit(p)}
                          className="text-blue-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(p._id)}
                          className="text-red-700 hover:underline"
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPlansPage;
