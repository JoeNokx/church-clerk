import { useCallback, useEffect, useMemo, useState } from "react";

import {
  adminGetPlans,
  adminGetSubscriptions,
  adminUpdateSubscription,
  adminSuspendSubscription,
  adminResumeSubscription,
  adminDeleteSubscription,
  adminRunCycleForChurch,
  adminRunBillingCycle
} from "../Services/adminBilling.api.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import Card from "../../../shared/components/Card/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import StatusChip from "../../../shared/components/StatusChip/index.jsx";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";

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
  const [changePlanInterval, setChangePlanInterval] = useState("");
  const [changePlanNextBillingDate, setChangePlanNextBillingDate] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [cycleLoadingId, setCycleLoadingId] = useState("");
  const [globalCycleLoading, setGlobalCycleLoading] = useState(false);
  const [cycleMessage, setCycleMessage] = useState("");
  const [confirmCycleChurch, setConfirmCycleChurch] = useState(null);
  const [confirmGlobalCycle, setConfirmGlobalCycle] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmActivate, setConfirmActivate] = useState(null);
  const [confirmSuspend, setConfirmSuspend] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteText, setDeleteText] = useState("");

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
      setConfirmActivate(sub);
      return;
    }
    if (action === "suspend") {
      setConfirmSuspend(sub);
      return;
    }
    if (action === "resume") {
      runAction("resume", () => adminResumeSubscription(id));
      return;
    }
    if (action === "changePlan") {
      setChangePlanModal(sub);
      setChangePlanId(sub?.plan?._id || "");
      setChangePlanInterval(sub?.billingInterval || "monthly");
      const nb = sub?.nextBillingDate ? new Date(sub.nextBillingDate) : null;
      setChangePlanNextBillingDate(nb ? nb.toISOString().slice(0, 16) : "");
      return;
    }
  };

  const submitChangePlan = async () => {
    const id = changePlanModal?._id;
    if (!id || !changePlanId) return;
    const payload = { planId: changePlanId };
    if (changePlanInterval) payload.billingInterval = changePlanInterval;
    if (changePlanNextBillingDate) payload.nextBillingDate = new Date(changePlanNextBillingDate).toISOString();
    await runAction("changePlan", () => adminUpdateSubscription(id, payload));
    setChangePlanModal(null);
  };

  const runGlobalCycle = async () => {
    setConfirmGlobalCycle(false);
    setGlobalCycleLoading(true);
    setCycleMessage("");
    setError("");
    try {
      await adminRunBillingCycle();
      setCycleMessage("Global billing cycle executed — all overdue subscriptions processed.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to run global billing cycle");
    } finally {
      setGlobalCycleLoading(false);
    }
  };

  const runCycleForChurch = async () => {
    const churchId = confirmCycleChurch?.church?._id;
    if (!churchId) return;
    setConfirmCycleChurch(null);
    setCycleLoadingId(String(churchId));
    setCycleMessage("");
    setError("");
    try {
      const res = await adminRunCycleForChurch(churchId);
      setCycleMessage(res?.data?.message || "Billing cycle ran for this church.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to run billing cycle");
    } finally {
      setCycleLoadingId("");
    }
  };

  return (
    <Card>
      <Card.Header
        title="Subscriptions"
        actions={
          <button
            type="button"
            onClick={() => { setConfirmGlobalCycle(true); setConfirmText(""); }}
            disabled={globalCycleLoading}
            title="Runs billing cycle for ALL churches with overdue nextBillingDate — same as the nightly scheduled job"
            className="shrink-0 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
          >
            {globalCycleLoading ? "Running…" : "⚡ Run Global Cycle"}
          </button>
        }
      />
      <div className="text-sm text-gray-600">View and override subscriptions across churches.</div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search church, plan, status..."
        selects={[
          {
            key: "status",
            value: statusFilter,
            onChange: setStatusFilter,
            placeholder: "All statuses",
            options: [
              { label: "free trial", value: "free trial" },
              { label: "trialing", value: "trialing" },
              { label: "active", value: "active" },
              { label: "past_due", value: "past_due" },
              { label: "suspended", value: "suspended" },
              { label: "cancelled", value: "cancelled" },
              { label: "canceled", value: "canceled" },
            ],
          },
          {
            key: "plan",
            value: planFilter,
            onChange: setPlanFilter,
            placeholder: "All plans",
            options: planOptions.map((n) => ({ label: n, value: n })),
          },
          {
            key: "currency",
            value: currencyFilter,
            onChange: setCurrencyFilter,
            placeholder: "All currencies",
            options: [{ label: "GHS", value: "GHS" }],
          },
        ]}
      />

      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {cycleMessage ? <div className="text-sm text-green-600">{cycleMessage}</div> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
              <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Church</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Plan</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Pending</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Next Billing</th>
              <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                  </tr>
                ))}
              </>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    compact
                    illustration="billing"
                    title="No subscriptions found"
                    description="Try adjusting your search or filters to see subscriptions."
                  />
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const isSuspended = s?.status === "suspended";
                const pendingAction = s?.pendingPlanAction;
                const pendingDate = s?.pendingPlanEffectiveDate ? fmtDate(s.pendingPlanEffectiveDate) : null;
                return (
                  <tr key={s?._id} className="max-md:text-xs text-gray-700 text-sm">
                    <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">
                      <div title={s?.church?.name || ""}>
                        <span className="sm:hidden">{truncateMobileName(s?.church?.name)}</span>
                        <span className="hidden sm:inline">{truncateDesktopName(s?.church?.name)}</span>
                      </div>
                      <div className="text-xs text-gray-400">{s?.church?.email || ""}</div>
                    </td>
                    <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6" title={s?.plan?.name || ""}>
                      <span className="sm:hidden">{truncateMobileName(s?.plan?.name)}</span>
                      <span className="hidden sm:inline">{truncateDesktopName(s?.plan?.name)}</span>
                    </td>
                    <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                      <StatusChip value={s?.status} />
                    </td>
                    <td className="max-md:px-4 py-1.5 text-xs text-gray-500 whitespace-nowrap px-4 md:px-6">
                      {pendingAction ? (
                        <span className="inline-block rounded bg-yellow-50 border border-yellow-200 px-2 py-0.5 font-semibold text-yellow-700">
                          {pendingAction === "cancel" ? "Cancel" : "Downgrade"} on {pendingDate || "next cycle"}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtDate(s?.nextBillingDate)}</td>
                    <td className="max-md:px-4 py-1.5 text-right whitespace-nowrap px-4 md:px-6">
                      <TableKebabMenu items={[
                        s?.status !== "active" && !isSuspended && {
                          label: "Activate",
                          onClick: () => onQuickAction(s, "activate"),
                          disabled: !!actionLoading,
                          desktopClassName: "rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50",
                          desktopContent: "Activate",
                        },
                        !isSuspended ? {
                          label: "Suspend",
                          onClick: () => onQuickAction(s, "suspend"),
                          disabled: !!actionLoading,
                          desktopClassName: "rounded-md border border-orange-200 bg-white px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50",
                          desktopContent: "Suspend",
                        } : {
                          label: "Resume",
                          onClick: () => onQuickAction(s, "resume"),
                          disabled: !!actionLoading,
                          desktopClassName: "rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50",
                          desktopContent: "Resume",
                        },
                        {
                          label: "Run Cycle",
                          onClick: () => { setConfirmCycleChurch(s); setConfirmText(""); },
                          disabled: !!actionLoading || cycleLoadingId === String(s?.church?._id),
                          desktopClassName: "rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50",
                          desktopContent: cycleLoadingId === String(s?.church?._id) ? "Running…" : "▶ Run Cycle",
                        },
                        {
                          label: "Change Plan",
                          onClick: () => onQuickAction(s, "changePlan"),
                          disabled: !!actionLoading,
                          desktopClassName: "rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50",
                          desktopContent: "Change Plan",
                        },
                        {
                          label: "Delete",
                          onClick: () => { setConfirmDelete(s); setDeleteText(""); },
                          disabled: !!actionLoading,
                          danger: true,
                          desktopClassName: "rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50",
                          desktopContent: "Delete",
                        },
                      ]} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {confirmCycleChurch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="text-base font-semibold text-gray-900 mb-1">Run Billing Cycle</div>
            <div className="text-xs text-gray-500 mb-3">{confirmCycleChurch?.church?.name}</div>
            <div className="mb-4 text-xs text-gray-700 bg-indigo-50 rounded-lg px-3 py-3 leading-relaxed">
              This will run the <strong>real billing engine</strong> for this church only. No other churches are affected.
              <br /><br />
              If their <strong>nextBillingDate</strong> has passed, this will:
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                <li>Attempt a real Paystack charge if a saved card exists</li>
                <li>Move the subscription to <strong>past_due</strong> and start the grace period if no card or charge fails</li>
                <li>Advance the nextBillingDate to the next cycle</li>
                <li>Create a payment record in billing history</li>
              </ul>
              <br />
              If the trial has expired, this releases them to the Free Lite plan.
            </div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Type <strong className="text-indigo-700">RUN</strong> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RUN"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmCycleChurch(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={runCycleForChurch} disabled={confirmText.trim().toUpperCase() !== "RUN"}
                className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed">
                Run Cycle
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmGlobalCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="text-base font-semibold text-gray-900 mb-1">Run Global Billing Cycle</div>
            <div className="mb-4 text-xs text-gray-700 bg-purple-50 rounded-lg px-3 py-3 leading-relaxed">
              This runs the billing engine for <strong>ALL churches</strong> whose nextBillingDate has passed — the same as the nightly scheduled job.
              <br /><br />
              <strong className="text-red-600">Warning:</strong> This affects every overdue subscription in the system, including real customers. Each one will be:
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                <li>Charged via Paystack if a saved card exists</li>
                <li>Moved to <strong>past_due</strong> with a grace period if no card or charge fails</li>
                <li>Released to Free Lite if their trial has expired</li>
              </ul>
              <br />
              Use this only if you want to process all overdue subscriptions immediately instead of waiting for the nightly cron.
            </div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Type <strong className="text-purple-700">RUN</strong> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RUN"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-100 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmGlobalCycle(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={runGlobalCycle} disabled={confirmText.trim().toUpperCase() !== "RUN"}
                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed">
                Run Global Cycle
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 mb-3"
            >
              <option value="">— select a plan —</option>
              {plans.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Billing Interval</label>
            <select
              value={changePlanInterval}
              onChange={(e) => setChangePlanInterval(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 mb-3"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly (3 months)</option>
              <option value="halfYear">Half-Yearly (6 months)</option>
              <option value="yearly">Yearly</option>
            </select>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Next Billing Date <span className="text-gray-400 font-normal">(optional — set to a past date to make due immediately)</span>
            </label>
            <input
              type="datetime-local"
              value={changePlanNextBillingDate}
              onChange={(e) => setChangePlanNextBillingDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 mb-4"
            />
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

      {confirmActivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="text-base font-semibold text-gray-900 mb-1">Activate Subscription</div>
            <div className="text-xs text-gray-500 mb-3">{confirmActivate?.church?.name}</div>
            <div className="mb-4 text-xs text-gray-700 bg-green-50 rounded-lg px-3 py-3 leading-relaxed">
              This will force-set the subscription status to <strong>active</strong> and clear any grace period.
              <br /><br />
              Use this when a church has been suspended or moved to <strong>past_due</strong> and you want to restore their access immediately — for example, after they've paid manually outside the system or you've resolved a billing issue.
              <br /><br />
              The next billing date stays as-is. The church will be billed normally on their next cycle.
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmActivate(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button"
                onClick={() => {
                  const id = confirmActivate?._id;
                  setConfirmActivate(null);
                  runAction("activate", () => adminUpdateSubscription(id, { status: "active", gracePeriodEnd: null }));
                }}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">
                Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSuspend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="text-base font-semibold text-gray-900 mb-1">Suspend Subscription</div>
            <div className="text-xs text-gray-500 mb-3">{confirmSuspend?.church?.name}</div>
            <div className="mb-4 text-xs text-gray-700 bg-red-50 rounded-lg px-3 py-3 leading-relaxed">
              This will set the subscription status to <strong>suspended</strong>. The church will lose access to their dashboard and all paid features immediately.
              <br /><br />
              An email notification will be sent to the church informing them of the suspension.
              <br /><br />
              The subscription is not cancelled — you can restore access at any time by clicking <strong>Resume</strong>.
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmSuspend(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button"
                onClick={() => {
                  const id = confirmSuspend?._id;
                  setConfirmSuspend(null);
                  runAction("suspend", () => adminSuspendSubscription(id));
                }}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="text-base font-semibold text-gray-900 mb-1">Delete Subscription</div>
            <div className="text-xs text-gray-500 mb-3">{confirmDelete?.church?.name}</div>
            <div className="mb-4 text-xs text-gray-700 bg-red-50 rounded-lg px-3 py-3 leading-relaxed">
              <strong className="text-red-600">This permanently deletes the subscription record.</strong> This cannot be undone.
              <br /><br />
              The church's billing history and payment records are kept, but the subscription itself is removed. If the church logs into their billing page, a new trial subscription will be created automatically.
              <br /><br />
              Use this only to clean up test data or remove orphaned subscriptions. Do not use this on real customers — use <strong>Suspend</strong> instead.
            </div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Type <strong className="text-red-700">DELETE</strong> to confirm
            </label>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button"
                disabled={deleteText.trim().toUpperCase() !== "DELETE"}
                onClick={() => {
                  const id = confirmDelete?._id;
                  setConfirmDelete(null);
                  runAction("delete", () => adminDeleteSubscription(id));
                }}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default BillingSubscriptionsPage;
