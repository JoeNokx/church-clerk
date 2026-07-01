import { useCallback, useEffect, useMemo, useState } from "react";

import {
  adminGetPlans,
  adminGetSubscriptions,
  adminUpdateSubscription,
  adminSuspendSubscription,
  adminResumeSubscription,
  adminDevFastForward,
  adminDevRunCycleForChurch,
  adminDevRunBillingCycle
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
  const [changePlanModal, setChangePlanModal] = useState(null);
  const [changePlanId, setChangePlanId] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [fastForwardModal, setFastForwardModal] = useState(null);
  const [fastForwardMinutes, setFastForwardMinutes] = useState("2");
  const [cycleLoadingId, setCycleLoadingId] = useState("");
  const [globalCycleLoading, setGlobalCycleLoading] = useState(false);
  const [cycleMessage, setCycleMessage] = useState("");

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

  const runAction = async (label, fn) => {
    setActionLoading(label);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || `Failed: ${label}`);
    } finally {
      setActionLoading("");
    }
  };

  const onQuickAction = (sub, action) => {
    const id = sub?._id;
    if (!id) return;

    if (action === "activate") {
      runAction("activate", () => adminUpdateSubscription(id, { status: "active", gracePeriodEnd: null }));
      return;
    }
    if (action === "suspend") {
      runAction("suspend", () => adminSuspendSubscription(id));
      return;
    }
    if (action === "resume") {
      runAction("resume", () => adminResumeSubscription(id));
      return;
    }
    if (action === "fastForward") {
      setFastForwardModal(sub);
      setFastForwardMinutes("2");
      return;
    }
    if (action === "changePlan") {
      setChangePlanModal(sub);
      setChangePlanId(sub?.plan?._id || "");
      return;
    }
  };

  const submitChangePlan = async () => {
    const id = changePlanModal?._id;
    if (!id || !changePlanId) return;
    await runAction("changePlan", () => adminUpdateSubscription(id, { planId: changePlanId }));
    setChangePlanModal(null);
  };

  const submitFastForward = async () => {
    const churchId = fastForwardModal?.church?._id;
    if (!churchId) return;
    const mins = Math.max(1, Math.min(Number(fastForwardMinutes || 2), 1440));
    await runAction("fastForward", () => adminDevFastForward(churchId, mins));
    setFastForwardModal(null);
  };

  const runGlobalCycle = async () => {
    setGlobalCycleLoading(true);
    setCycleMessage("");
    setError("");
    try {
      await adminDevRunBillingCycle();
      setCycleMessage("Global billing cycle executed — all overdue subscriptions processed.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to run global billing cycle");
    } finally {
      setGlobalCycleLoading(false);
    }
  };

  const runCycleForChurch = async (sub) => {
    const churchId = sub?.church?._id;
    if (!churchId) return;
    setCycleLoadingId(String(churchId));
    setCycleMessage("");
    setError("");
    try {
      const res = await adminDevRunCycleForChurch(churchId);
      setCycleMessage(res?.data?.message || "Billing cycle ran for this church.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to run billing cycle");
    } finally {
      setCycleLoadingId("");
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
        <button
          type="button"
          onClick={runGlobalCycle}
          disabled={globalCycleLoading}
          title="Runs billing cycle for ALL churches with overdue nextBillingDate — same as the nightly scheduled job"
          className="shrink-0 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
        >
          {globalCycleLoading ? "Running…" : "⚡ Run Global Cycle"}
        </button>
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
      {cycleMessage ? <div className="mt-4 text-sm text-green-600">{cycleMessage}</div> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-gray-400">
            <tr className="border-b">
              <th className="py-3 text-left font-semibold">Church</th>
              <th className="py-3 text-left font-semibold">Plan</th>
              <th className="py-3 text-left font-semibold">Status</th>
              <th className="py-3 text-left font-semibold">Pending</th>
              <th className="py-3 text-left font-semibold">Next Billing</th>
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
                    <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                  </tr>
                ))}
              </>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  No subscriptions found.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const isSuspended = s?.status === "suspended";
                const pendingAction = s?.pendingPlanAction;
                const pendingDate = s?.pendingPlanEffectiveDate ? fmtDate(s.pendingPlanEffectiveDate) : null;
                return (
                  <tr key={s?._id} className="border-b last:border-b-0">
                    <td className="py-3 text-gray-900">
                      <div>{s?.church?.name || "—"}</div>
                      <div className="text-xs text-gray-400">{s?.church?.email || ""}</div>
                    </td>
                    <td className="py-3 text-gray-700">{s?.plan?.name || "—"}</td>
                    <td className="py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        s?.status === "active" ? "bg-green-100 text-green-700" :
                        s?.status === "suspended" ? "bg-red-100 text-red-700" :
                        s?.status === "past_due" ? "bg-orange-100 text-orange-700" :
                        s?.status === "free trial" || s?.status === "trialing" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{s?.status || "—"}</span>
                    </td>
                    <td className="py-3 text-xs text-gray-500">
                      {pendingAction ? (
                        <span className="inline-block rounded bg-yellow-50 border border-yellow-200 px-2 py-0.5 font-semibold text-yellow-700">
                          {pendingAction === "cancel" ? "Cancel" : "Downgrade"} on {pendingDate || "next cycle"}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 text-gray-700">{fmtDate(s?.nextBillingDate)}</td>
                    <td className="py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {s?.status !== "active" && !isSuspended && (
                          <button type="button" onClick={() => onQuickAction(s, "activate")}
                            disabled={!!actionLoading}
                            title="Force-set subscription to active and clear grace period"
                            className="rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50">
                            Activate
                          </button>
                        )}
                        {!isSuspended ? (
                          <button type="button" onClick={() => onQuickAction(s, "suspend")}
                            disabled={!!actionLoading}
                            className="rounded-md border border-orange-200 bg-white px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50">
                            Suspend
                          </button>
                        ) : (
                          <button type="button" onClick={() => onQuickAction(s, "resume")}
                            disabled={!!actionLoading}
                            className="rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50">
                            Resume
                          </button>
                        )}
                        <button type="button" onClick={() => onQuickAction(s, "fastForward")}
                          disabled={!!actionLoading}
                          title="Dev only: fast-forward billing date by N minutes"
                          className="rounded-md border border-purple-200 bg-white px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 disabled:opacity-50">
                          ⚡ Fast Forward
                        </button>
                        <button type="button" onClick={() => runCycleForChurch(s)}
                          disabled={!!actionLoading || cycleLoadingId === String(s?.church?._id)}
                          title="Dev only: run billing cycle for this church only"
                          className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                          {cycleLoadingId === String(s?.church?._id) ? "Running…" : "▶ Run Cycle"}
                        </button>
                        <button type="button" onClick={() => onQuickAction(s, "changePlan")}
                          disabled={!!actionLoading}
                          className="rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                          Change Plan
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

      {fastForwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="text-base font-semibold text-gray-900 mb-1">⚡ Fast Forward Billing</div>
            <div className="text-xs text-gray-500 mb-1">{fastForwardModal?.church?.name}</div>
            <div className="mb-4 text-xs text-purple-700 bg-purple-50 rounded-lg px-3 py-2">
              Sets <strong>nextBillingDate</strong> to N minutes from now. Then click <strong>Run Billing Cycle</strong> to trigger it.
            </div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Minutes from now</label>
            <input
              type="number"
              min={1}
              max={1440}
              value={fastForwardMinutes}
              onChange={(e) => setFastForwardMinutes(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-100 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setFastForwardModal(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={submitFastForward} disabled={!!actionLoading}
                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-50">
                {actionLoading === "fastForward" ? "Saving…" : "Fast Forward"}
              </button>
            </div>
          </div>
        </div>
      )}

      {changePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="text-base font-semibold text-gray-900 mb-1">Change Plan</div>
            <div className="text-xs text-gray-500 mb-4">{changePlanModal?.church?.name}</div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Select Plan</label>
            <select
              value={changePlanId}
              onChange={(e) => setChangePlanId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 mb-4"
            >
              <option value="">— select a plan —</option>
              {plans.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setChangePlanModal(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={submitChangePlan} disabled={!changePlanId || !!actionLoading}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                {actionLoading === "changePlan" ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BillingSubscriptionsPage;
