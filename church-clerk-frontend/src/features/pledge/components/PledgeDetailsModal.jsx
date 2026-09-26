import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";

import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import {
  createPledgePayment,
  getPledgePayments,
  updatePledgePayment
} from "../payments/services/pledgePayments.api.js";
import { getPledge } from "../services/pledge.api.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import Button from "../../../shared/components/Button/index.jsx";
import Spinner from "../../../shared/components/Spinner.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";

function formatCurrency(value, currency) {
  return formatMoney(value, currency);
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function StatusChip({ value }) {
  const v = String(value || "").toLowerCase();
  const styles =
    v === "completed" ? "border-green-200 bg-green-50 text-green-700"
    : v === "overdue" ? "border-red-200 bg-red-50 text-red-700"
    : v === "in progress" ? "border-yellow-200 bg-yellow-50 text-yellow-700"
    : "border-gray-200 bg-gray-50 text-gray-600";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold ${styles} text-xs`}>{value || "—"}</span>
  );
}

function BaseModal({ open, title, subtitle, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 py-4 md:py-5 lg:py-6 px-4 md:px-6">
          <div>
            <div className="font-semibold text-gray-900 text-lg">{title}</div>
            {subtitle ? <div className="mt-1 text-gray-500 text-sm">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}

export function PaymentFormModal({ open, mode, initialData, onClose, onSubmit }) {
  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setIsSubmitting(false);

    if (mode === "edit" && initialData) {
      setPaymentDate(String(initialData?.paymentDate || "").slice(0, 10));
      setAmount(initialData?.amount ?? "");
      setPaymentMethod(String(initialData?.paymentMethod || "Cash"));
      setNote(String(initialData?.note || ""));
      return;
    }

    setPaymentDate("");
    setAmount("");
    setPaymentMethod("Cash");
    setNote("");
  }, [open, mode, initialData]);

  const PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank Transfer", "Cheque"];

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    if (!paymentDate) {
      setError("Payment date is required.");
      setIsSubmitting(false);
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Amount is required.");
      setIsSubmitting(false);
      return;
    }

    if (!paymentMethod) {
      setError("Payment method is required.");
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit?.({
        paymentDate,
        amount: Number(amount),
        paymentMethod,
        note: String(note || "").trim() || undefined
      });
      onClose?.();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      open={open}
      title={mode === "edit" ? "Edit Payment" : "Add Payment"}
      subtitle={mode === "edit" ? "Update payment details" : "Record a new pledge payment"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Date Received</label>
            <input
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              type="date"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-500 text-xs">Amount</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              type="number"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-500 text-xs">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block font-semibold text-gray-500 text-xs">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            loadingText={mode === "edit" ? "Saving..." : "Adding..."}
            className="rounded-lg bg-blue-700 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm px-4 md:px-6"
          >
            {mode === "edit" ? "Save" : "Add"}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}

function PledgeDetailsModal({ open, pledgeId, view = "details", onClose, onChanged }) {
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "";
  const { can } = useContext(PermissionContext) || {};
  const guarded = useGuardedAction();

  const canCreatePayment = useMemo(() => (typeof can === "function" ? can("pledges", "create") : false), [can]);
  const canEditPayment = useMemo(() => (typeof can === "function" ? can("pledges", "update") : false), [can]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pledge, setPledge] = useState(null);
  const [daysUntilDeadline, setDaysUntilDeadline] = useState(null);

  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentsPagination, setPaymentsPagination] = useState({ currentPage: 1, nextPage: null, prevPage: null });
  const [paymentsSummary, setPaymentsSummary] = useState({ amountPledged: 0, totalPaid: 0, remainingBalance: 0 });

  const [newPaymentOpen, setNewPaymentOpen] = useState(false);
  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [viewRow, setViewRow] = useState(null);

  const loadPledge = useCallback(async () => {
    if (!pledgeId) {
      setError("Pledge id is missing");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await getPledge(pledgeId);
      const payload = res?.data?.data ?? res?.data;
      setPledge(payload?.pledges ?? payload?.pledge ?? payload?.data ?? payload ?? null);
      setDaysUntilDeadline(payload?.daysUntilDeadline ?? null);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load pledge");
      setPledge(null);
      setDaysUntilDeadline(null);
    } finally {
      setLoading(false);
    }
  }, [pledgeId]);

  const loadPayments = useCallback(
    async (partial) => {
      if (!pledgeId) return;
      const page = partial?.page || 1;
      const limit = partial?.limit || 10;

      setPaymentsLoading(true);
      setPaymentsError(null);

      try {
        const res = await getPledgePayments(pledgeId, { page, limit });
        const payload = res?.data?.data ?? res?.data;

        setPayments(Array.isArray(payload?.pledgePayments) ? payload.pledgePayments : []);
        setPaymentsPagination(payload?.pagination || { currentPage: 1, nextPage: null, prevPage: null });
        setPaymentsSummary({
          amountPledged: Number(payload?.amountPledged || 0),
          totalPaid: Number(payload?.totalPaid || 0),
          remainingBalance: Number(payload?.remainingBalance || 0)
        });
      } catch (e) {
        setPaymentsError(e?.response?.data?.message || e?.message || "Failed to load payments");
        setPayments([]);
        setPaymentsPagination({ currentPage: 1, nextPage: null, prevPage: null });
        setPaymentsSummary({ amountPledged: 0, totalPaid: 0, remainingBalance: 0 });
      } finally {
        setPaymentsLoading(false);
      }
    },
    [pledgeId]
  );

  useEffect(() => {
    if (!open) return;
    setPledge(null);
    setPayments([]);
    setViewRow(null);
    setNewPaymentOpen(false);
    loadPledge();
    loadPayments({ page: 1 });
  }, [open, view, loadPledge, loadPayments]);

  const refresh = async () => {
    await Promise.all([loadPledge(), loadPayments({ page: 1 })]);
    await onChanged?.();
  };

  const derivedStatus = useMemo(() => {
    const pledgedAmount = Number(pledge?.amount || paymentsSummary?.amountPledged || 0);
    const paidAmount = Number(paymentsSummary?.totalPaid || 0);
    if (pledgedAmount > 0 && paidAmount >= pledgedAmount) return "Completed";
    if (pledge?.deadline) {
      const d = new Date(pledge.deadline);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        if (d.getTime() < Date.now()) return "Overdue";
      }
    }
    if (paidAmount <= 0) return "Not Started";
    return "In Progress";
  }, [pledge?.amount, pledge?.deadline, paymentsSummary?.amountPledged, paymentsSummary?.totalPaid]);

  const openEdit = (payment) => {
    setEditingPayment(payment || null);
    setEditPaymentOpen(true);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
        <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 py-4 md:py-5 px-4 md:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-semibold text-gray-900 text-lg truncate">{loading ? "Pledge" : pledge?.name || "Pledge"}</div>
                {!loading && pledge ? <StatusChip value={derivedStatus} /> : null}
              </div>
              <div className="mt-1 text-gray-500 text-sm">
                {pledge?.churchProject?.name ? `Fundraising: ${pledge.churchProject.name}` : "Pledge information"}
              </div>
              {pledge?.referenceId ? (
                <div className="mt-1 font-mono text-xs text-gray-500">{pledge.referenceId}</div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="p-4 md:p-6">
            {loading ? (
              <Skeleton height={14} count={6} />
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Phone Number</div>
                    <div className="mt-1 font-semibold text-gray-900 text-sm">{pledge?.phoneNumber || "—"}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Pledge Date</div>
                    <div className="mt-1 font-semibold text-gray-900 text-sm">{formatDate(pledge?.pledgeDate)}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Days Until Deadline</div>
                    <div className="mt-1 font-semibold text-gray-900 text-sm">{daysUntilDeadline ?? "—"}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Service Type</div>
                    <div className="mt-1 font-semibold text-gray-900 text-sm">{pledge?.serviceType || "—"}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Deadline</div>
                    <div className="mt-1 font-semibold text-gray-900 text-sm">{formatDate(pledge?.deadline)}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Fundraising</div>
                    <div className="mt-1 font-semibold text-gray-900 text-sm">{pledge?.churchProject?.name || "—"}</div>
                  </div>
                </div>

                {pledge?.note ? (
                  <div className="mt-4">
                    <div className="font-semibold text-gray-500 text-xs">Note</div>
                    <div className="mt-1 text-gray-900 break-words text-sm">{pledge.note}</div>
                  </div>
                ) : null}

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-violet-50/50 px-4 py-3">
                    <div className="font-semibold text-gray-500 text-xs">Amount Pledged</div>
                    <div className="mt-1 font-semibold text-violet-700 text-sm">{formatCurrency(pledge?.amount || paymentsSummary?.amountPledged || 0, currency)}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-emerald-50/50 px-4 py-3">
                    <div className="font-semibold text-gray-500 text-xs">Total Paid</div>
                    <div className="mt-1 font-semibold text-emerald-700 text-sm">{formatCurrency(paymentsSummary?.totalPaid || 0, currency)}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-orange-50/50 px-4 py-3">
                    <div className="font-semibold text-gray-500 text-xs">Balance</div>
                    <div className="mt-1 font-semibold text-orange-600 text-sm">{formatCurrency(paymentsSummary?.remainingBalance || 0, currency)}</div>
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-100 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Payment History</div>
                    <div className="mt-1 text-gray-500 text-xs">Payments recorded for this pledge</div>
                  </div>

                  {canCreatePayment ? (
                    <button
                      type="button"
                      onClick={() => guarded(() => setNewPaymentOpen(true))}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
                    >
                      <span className="leading-none text-lg">+</span>
                      Add Payment
                    </button>
                  ) : null}
                </div>

                {paymentsLoading ? <div className="mt-4 flex items-center justify-center"><Spinner className="text-gray-400" /></div> : null}
                {!paymentsLoading && paymentsError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{paymentsError}</div>
                ) : null}

                {!paymentsLoading && !paymentsError && !payments.length ? (
                  <div className="mt-4">
                    <EmptyState
                      compact
                      illustration="pledge"
                      title="No payments recorded yet"
                      description="When payments are recorded against this pledge, they'll appear here."
                    />
                  </div>
                ) : null}

                {!paymentsLoading && !paymentsError && payments.length ? (
                  <div className="mt-4">
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="min-w-full">
                        <thead className="bg-slate-100">
                          <tr className="text-left font-semibold text-gray-500 text-xs">
                            <th className="py-2 whitespace-nowrap px-4">Date Received</th>
                            <th className="py-2 whitespace-nowrap px-4">Amount</th>
                            <th className="py-2 whitespace-nowrap px-4">Method</th>
                            <th className="py-2 whitespace-nowrap px-4">Recorded By</th>
                            <th className="py-2 whitespace-nowrap px-4">Ref ID</th>
                            <th className="py-2 text-right whitespace-nowrap px-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {payments.map((p, idx) => (
                            <tr key={p?._id ?? `p-${idx}`} className="max-md:text-xs text-gray-700 text-sm">
                              <td className="py-1.5 text-gray-900 whitespace-nowrap px-4">{formatDate(p?.paymentDate)}</td>
                              <td className="py-1.5 text-green-700 font-semibold whitespace-nowrap px-4">{formatCurrency(p?.amount || 0, currency)}</td>
                              <td className="py-1.5 text-gray-600 whitespace-nowrap px-4">{p?.paymentMethod || "—"}</td>
                              <td className="py-1.5 whitespace-nowrap px-4" title={p?.createdBy?.fullName || "—"}><span className="sm:hidden">{truncateMobileName(p?.createdBy?.fullName || "—")}</span><span className="hidden sm:inline">{truncateDesktopName(p?.createdBy?.fullName || "—")}</span></td>
                              <td className="py-1.5 whitespace-nowrap px-4">
                                {p?.referenceId ? (
                                  <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{p.referenceId}</span>
                                ) : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                              <td className="py-1.5 whitespace-nowrap px-4">
                                <TableKebabMenu items={[
                                  { label: "View", onClick: () => setViewRow(p) },
                                  canEditPayment && { label: "Edit", onClick: () => guarded(() => openEdit(p)) }
                                ]} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-end gap-3 px-2 py-4">
                      <button
                        type="button"
                        onClick={async () => { if (paymentsPagination?.prevPage) await loadPayments({ page: paymentsPagination.prevPage }); }}
                        disabled={!paymentsPagination?.prevPage}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
                      >
                        Prev
                      </button>
                      <div className="text-gray-600 text-sm">Page {paymentsPagination?.currentPage || 1}</div>
                      <button
                        type="button"
                        onClick={async () => { if (paymentsPagination?.nextPage) await loadPayments({ page: paymentsPagination.nextPage }); }}
                        disabled={!paymentsPagination?.nextPage}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PaymentFormModal
        open={newPaymentOpen}
        mode="create"
        initialData={null}
        onClose={() => setNewPaymentOpen(false)}
        onSubmit={async (payload) => {
          if (!pledgeId) return;
          await createPledgePayment(pledgeId, payload);
          await refresh();
        }}
      />

      <PaymentFormModal
        open={editPaymentOpen}
        mode="edit"
        initialData={editingPayment}
        onClose={() => {
          setEditPaymentOpen(false);
          setEditingPayment(null);
        }}
        onSubmit={async (payload) => {
          if (!pledgeId || !editingPayment?._id) return;
          await updatePledgePayment(pledgeId, editingPayment._id, payload);
          await refresh();
        }}
      />

      {viewRow ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 overflow-y-auto" onClick={() => setViewRow(null)}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">{pledge?.name || "Pledge Payment"}</div>
                {viewRow?.referenceId ? (
                  <div className="mt-0.5 font-mono text-xs text-gray-500">{viewRow.referenceId}</div>
                ) : null}
              </div>
              <button type="button" onClick={() => setViewRow(null)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shrink-0" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 px-5 py-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="font-semibold text-gray-500 text-xs">Amount</div>
                <div className="mt-1 font-semibold text-green-700 text-sm">{formatCurrency(viewRow?.amount || 0, currency)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="font-semibold text-gray-500 text-xs">Date Received</div>
                <div className="mt-1 font-semibold text-gray-900 text-sm">{formatDate(viewRow?.paymentDate)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="font-semibold text-gray-500 text-xs">Method</div>
                <div className="mt-1 font-semibold text-gray-900 text-sm">{viewRow?.paymentMethod || "—"}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="font-semibold text-gray-500 text-xs">Date Recorded</div>
                <div className="mt-1 font-semibold text-gray-900 text-sm">{formatDate(viewRow?.createdAt)}</div>
              </div>
              <div className="col-span-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="font-semibold text-gray-500 text-xs">Recorded By</div>
                <div className="mt-1 font-semibold text-gray-900 text-sm">{viewRow?.createdBy?.fullName || "—"}</div>
              </div>
              {viewRow?.note ? (
                <div className="col-span-2 rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <div className="font-semibold text-gray-500 text-xs">Note</div>
                  <div className="mt-1 text-gray-900 whitespace-pre-wrap text-sm">{viewRow.note}</div>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end px-5 py-4 border-t border-gray-200">
              <button type="button" onClick={() => setViewRow(null)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm">Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default PledgeDetailsModal;
