import { useCallback, useEffect, useMemo, useState } from "react";

import {
  adminGetPlans,
  adminGetSubscriptions,
  adminUpdateSubscription
} from "../Services/adminBilling.api.js";

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
};

function BillingSubscriptionsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [plans, setPlans] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");

  const planOptions = useMemo(() => {
    const list = Array.isArray(plans) ? plans : [];
    const names = list.map((p) => String(p?.name || "").trim()).filter(Boolean);
    return Array.from(new Set(names));
  }, [plans]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const st = String(statusFilter || "").trim().toLowerCase();
    const pf = String(planFilter || "").trim().toLowerCase();
    const cf = String(currencyFilter || "").trim().toUpperCase();

    return (Array.isArray(rows) ? rows : []).filter((s) => {
      const church = s?.church;
      const plan = s?.plan;

      if (st) {
        const statusValue = String(s?.status || "").toLowerCase();
        if (statusValue !== st) return false;
      }

      if (pf) {
        const planName = String(plan?.name || "").toLowerCase();
        if (planName !== pf) return false;
      }

      if (cf) {
        const cur = String(s?.currency || "").toUpperCase();
        if (cur !== cf) return false;
      }

      if (!q) return true;

      return (
        String(church?.name || "").toLowerCase().includes(q) ||
        String(church?.email || "").toLowerCase().includes(q) ||
        String(plan?.name || "").toLowerCase().includes(q) ||
        String(s?.status || "").toLowerCase().includes(q)
      );
    });
  }, [currencyFilter, planFilter, rows, search, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [subsRes, plansRes] = await Promise.all([adminGetSubscriptions(), adminGetPlans()]);
      setRows(Array.isArray(subsRes?.data?.subscriptions) ? subsRes.data.subscriptions : []);
      setPlans(Array.isArray(plansRes?.data?.plans) ? plansRes.data.plans : []);
    } catch (e) {
      setRows([]);
      setPlans([]);
      setError(e?.response?.data?.message || e?.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onQuickAction = async (sub, action) => {
    const id = sub?._id;
    if (!id) return;

    if (action === "cancel") {
      if (!window.confirm("Force cancel this subscription?")) return;
      setLoading(true);
      setError("");
      try {
        await adminUpdateSubscription(id, { status: "canceled" });
        await load();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update subscription");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (action === "activate") {
      setLoading(true);
      setError("");
      try {
        await adminUpdateSubscription(id, { status: "active", gracePeriodEnd: null });
        await load();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update subscription");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (action === "extend") {
      const current = sub?.nextBillingDate ? new Date(sub.nextBillingDate) : new Date();
      if (Number.isNaN(current.getTime())) return;
      const next = new Date(current);
      next.setDate(next.getDate() + 30);

      setLoading(true);
      setError("");
      try {
        await adminUpdateSubscription(id, { nextBillingDate: next.toISOString() });
        await load();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to extend subscription");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (action === "changePlan") {
      const planId = window.prompt("Enter plan id to set (copy from Plans list)");
      if (!planId) return;
      setLoading(true);
      setError("");
      try {
        await adminUpdateSubscription(id, { planId });
        await load();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to update plan");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div>
          <div className="text-lg font-semibold text-gray-900">Subscriptions</div>
          <div className="mt-1 text-sm text-gray-600">View and override subscriptions across churches.</div>
        </div>
        <div className="flex-1" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search church, plan, status..."
          className="w-full md:w-72 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full md:w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All statuses</option>
          <option value="free trial">free trial</option>
          <option value="trialing">trialing</option>
          <option value="active">active</option>
          <option value="past_due">past_due</option>
          <option value="suspended">suspended</option>
          <option value="cancelled">cancelled</option>
          <option value="canceled">canceled</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="w-full md:w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All plans</option>
          {planOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select
          value={currencyFilter}
          onChange={(e) => setCurrencyFilter(e.target.value)}
          className="w-full md:w-36 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All currencies</option>
          <option value="GHS">GHS</option>
        </select>
      </div>

      {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-gray-400">
            <tr className="border-b">
              <th className="py-3 text-left font-semibold">Church</th>
              <th className="py-3 text-left font-semibold">Plan</th>
              <th className="py-3 text-left font-semibold">Status</th>
              <th className="py-3 text-left font-semibold">Start</th>
              <th className="py-3 text-left font-semibold">Next Billing</th>
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  No subscriptions found.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s?._id} className="border-b last:border-b-0">
                  <td className="py-3 text-gray-900">{s?.church?.name || "—"}</td>
                  <td className="py-3 text-gray-700">{s?.plan?.name || "—"}</td>
                  <td className="py-3 text-gray-700">{s?.status || "—"}</td>
                  <td className="py-3 text-gray-700">{fmtDate(s?.createdAt)}</td>
                  <td className="py-3 text-gray-700">{fmtDate(s?.nextBillingDate)}</td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onQuickAction(s, "activate")}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Activate
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickAction(s, "extend")}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Extend
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickAction(s, "changePlan")}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Change Plan
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickAction(s, "cancel")}
                        className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Plans loaded: {Array.isArray(plans) ? plans.length : 0}. (Use Plans list to copy plan IDs for now.)
      </div>
    </div>
  );
}

export default BillingSubscriptionsPage;
