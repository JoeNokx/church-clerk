import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import Skeleton from "react-loading-skeleton";

import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import PledgeContext, { PledgeProvider } from "../pledge.store.js";
import {
  createPledgePayment,
  deletePledgePayment,
  getPledgePayments,
  updatePledgePayment
} from "../payments/services/pledgePayments.api.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";

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
    v === "completed" ? "border-green-200 bg-green-50 text-green-700" : "border-yellow-200 bg-yellow-50 text-yellow-700";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold ${styles} text-xs`}>{value || "—"}</span>
  );
}

function BaseModal({ open, title, subtitle, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
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

function PaymentFormModal({ open, mode, initialData, onClose, onSubmit, currency }) {
  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSaving(false);

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
    setError("");

    if (!paymentDate) {
      setError("Payment date is required.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Amount is required.");
      return;
    }

    if (!paymentMethod) {
      setError("Payment method is required.");
      return;
    }

    setSaving(true);
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
      setSaving(false);
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
            <label className="block font-semibold text-gray-500 text-xs">Payment Date</label>
            <input
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              type="date"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-500 text-xs">{currency ? `Amount (${currency})` : "Amount"}</label>
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
            <label className="block font-semibold text-gray-500 text-xs">Note</label>
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
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-700 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm px-4 md:px-6"
          >
            {mode === "edit" ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function ConfirmDeleteModal({ open, title, message, confirmLabel, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
          <div className="font-semibold text-gray-900 text-sm">{title}</div>
        </div>
        <div className="px-4 md:px-5 lg:px-6 py-4 text-gray-700 text-sm">{message}</div>
        <div className="flex items-center justify-end gap-3 px-4 md:px-5 lg:px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-red-700 text-sm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PledgeDetailsPageInner() {
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "";
  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(() => (typeof can === "function" ? can("pledge", "read") : true), [can]);
  const location = useLocation();
  const { toPage } = useDashboardNavigator();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const pledgeId = params.get("id");

  const canCreatePayment = useMemo(() => (typeof can === "function" ? can("pledges", "create") : false), [can]);
  const canEditPayment = useMemo(() => (typeof can === "function" ? can("pledges", "update") : false), [can]);
  const canDeletePayment = useMemo(() => (typeof can === "function" ? can("pledges", "delete") : false), [can]);

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

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeletePayment, setConfirmDeletePayment] = useState(null);

  const goBack = () => {
    toPage("pledges");
  };

  const loadPledge = useCallback(async () => {
    if (!pledgeId) {
      setError("Pledge id is missing");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await store?.getPledge?.(pledgeId);
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
  }, [pledgeId, store?.getPledge]);

  const loadPayments = useCallback(
    async (partial) => {
      if (!pledgeId) return;
      const page = partial?.page || paymentsPagination?.currentPage || 1;
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
    [pledgeId, paymentsPagination?.currentPage]
  );

  useEffect(() => {
    if (!store?.activeChurchId) return;
    loadPledge();
    loadPayments({ page: 1 });
  }, [store?.activeChurchId, loadPledge, loadPayments]);

  const derivedStatus = useMemo(() => {
    const pledgedAmount = Number(pledge?.amount || paymentsSummary?.amountPledged || 0);
    const paidAmount = Number(paymentsSummary?.totalPaid || 0);
    if (pledgedAmount > 0 && paidAmount >= pledgedAmount) return "Completed";
    return "In Progress";
  }, [pledge?.amount, paymentsSummary?.amountPledged, paymentsSummary?.totalPaid]);

  const openEdit = (payment) => {
    setEditingPayment(payment || null);
    setEditPaymentOpen(true);
  };

  const closePaymentForms = () => {
    setNewPaymentOpen(false);
    setEditPaymentOpen(false);
    setEditingPayment(null);
  };

  const openDelete = (payment) => {
    setConfirmDeletePayment(payment || null);
    setConfirmDeleteOpen(true);
  };

  const closeDelete = () => {
    setConfirmDeleteOpen(false);
    setConfirmDeletePayment(null);
  };

  const confirmDelete = async () => {
    const id = confirmDeletePayment?._id;
    closeDelete();
    if (!pledgeId || !id) return;
    await deletePledgePayment(pledgeId, id);
    await loadPayments({ page: 1 });
    await loadPledge();
  };

  const onPrev = async () => {
    const prev = paymentsPagination?.prevPage;
    if (!prev) return;
    await loadPayments({ page: prev });
  };

  const onNext = async () => {
    const next = paymentsPagination?.nextPage;
    if (!next) return;
    await loadPayments({ page: next });
  };

  if (loading) {
    return (
      <div className="max-w-6xl animate-pulse">
        <div className="h-7 w-40 rounded bg-gray-200" />
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 md:p-6 lg:p-8">
            <div className="h-4 w-1/2 rounded bg-gray-200" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="h-3 w-16 rounded bg-gray-200" />
                  <div className="mt-1 h-5 w-20 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-4 md:px-5 lg:px-6 py-4">
              <div className="h-4 w-32 rounded bg-gray-200" />
            </div>
            <div className="p-4 space-y-3 md:p-6 lg:p-8">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
        >
          Back
        </button>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
        </div>

        {canCreatePayment ? (
          <button
            type="button"
            onClick={() => setNewPaymentOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
          >
            <span className="leading-none text-lg">+</span>
            Add Payment
          </button>
        ) : null}
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="font-semibold text-gray-900 truncate md:text-3xl lg:text-4xl text-xl md:text-2xl">{pledge?.name || "—"}</div>
              <StatusChip value={derivedStatus} />
            </div>
            <div className="mt-1 text-gray-600 text-sm">Pledge information</div>
          </div>
        </div>

        <div className="mt-5 divide-y divide-gray-200">
          <div className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between">
            <div className="font-semibold text-gray-500 text-xs">Phone Number</div>
            <div className="font-semibold text-gray-900 text-sm">{pledge?.phoneNumber || "—"}</div>
          </div>

          <div className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between">
            <div className="font-semibold text-gray-500 text-xs">Pledge Date</div>
            <div className="font-semibold text-gray-900 text-sm">{formatDate(pledge?.pledgeDate)}</div>
          </div>

          <div className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between">
            <div className="font-semibold text-gray-500 text-xs">Days Until Deadline</div>
            <div className="font-semibold text-gray-900 text-sm">{daysUntilDeadline ?? "—"}</div>
          </div>

          <div className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between">
            <div className="font-semibold text-gray-500 text-xs">Service Type</div>
            <div className="font-semibold text-gray-900 text-sm">{pledge?.serviceType || "—"}</div>
          </div>

          <div className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between">
            <div className="font-semibold text-gray-500 text-xs">Deadline</div>
            <div className="font-semibold text-gray-900 text-sm">{formatDate(pledge?.deadline)}</div>
          </div>

          <div className="py-3">
            <div className="font-semibold text-gray-500 text-xs">Note</div>
            <div className="mt-1 font-semibold text-gray-900 break-words text-sm">{pledge?.note || "—"}</div>
          </div>
        </div>
      </div>

      <KpiGrid className="mt-4 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
          <div className="font-semibold text-gray-500 text-xs">Amount Pledged</div>
          <div className="mt-2 font-semibold text-purple-700 md:text-3xl lg:text-4xl text-xl md:text-2xl">{formatCurrency(pledge?.amount || paymentsSummary?.amountPledged || 0, currency)}</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
          <div className="font-semibold text-gray-500 text-xs">Total Paid</div>
          <div className="mt-2 font-semibold text-green-700 md:text-3xl lg:text-4xl text-xl md:text-2xl">{formatCurrency(paymentsSummary?.totalPaid || 0, currency)}</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
          <div className="font-semibold text-gray-500 text-xs">Balance</div>
          <div className="mt-2 font-semibold text-red-600 md:text-3xl lg:text-4xl text-xl md:text-2xl">{formatCurrency(paymentsSummary?.remainingBalance || 0, currency)}</div>
        </div>
      </KpiGrid>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Payment History</div>
            <div className="mt-1 text-gray-500 text-xs">Payments recorded for this pledge</div>
          </div>
        </div>

          {paymentsLoading ? <div className="mt-4 text-gray-600 text-sm">Loading payments...</div> : null}
          {!paymentsLoading && paymentsError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{paymentsError}</div>
          ) : null}

          {!paymentsLoading && !paymentsError && !payments.length ? <div className="mt-4 text-gray-600 text-sm">No payments recorded yet.</div> : null}

          {!paymentsLoading && !paymentsError && payments.length ? (
            <div className="mt-4">
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full">
                  <thead className="bg-slate-100">
                    <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                      <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Amount</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Method</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Note</th>
                      <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((p, idx) => (
                      <tr key={p?._id ?? `p-${idx}`} className="max-md:text-xs text-gray-700 text-sm">
                        <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">{formatDate(p?.paymentDate)}</td>
                        <td className="max-md:px-4 py-1.5 text-green-700 font-semibold whitespace-nowrap px-4 md:px-6">{formatCurrency(p?.amount || 0, currency)}</td>
                        <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6">{p?.paymentMethod || "—"}</td>
                        <td className="max-md:px-4 py-1.5 text-gray-600 px-4 md:px-6">{p?.note || "—"}</td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                          <div className="flex items-center justify-end gap-2">
                            {canEditPayment ? (
                              <button
                                type="button"
                                onClick={() => openEdit(p)}
                                className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                              >
                                Edit
                              </button>
                            ) : null}

                            {canDeletePayment ? (
                              <button
                                type="button"
                                onClick={() => openDelete(p)}
                                className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-red-600 hover:bg-gray-50 text-xs"
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 px-2 py-4">
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={!paymentsPagination?.prevPage}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
                >
                  Prev
                </button>
                <div className="text-gray-600 text-sm">Page {paymentsPagination?.currentPage || 1}</div>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!paymentsPagination?.nextPage}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
      </div>

      <PaymentFormModal
        open={newPaymentOpen}
        mode="create"
        initialData={null}
        onClose={() => {
          setNewPaymentOpen(false);
          setPaymentError("");
        }}
        onSubmit={async (payload) => {
          if (!pledgeId) return;
          await createPledgePayment(pledgeId, payload);
          await loadPayments({ page: 1 });
          await loadPledge();
        }}
        currency={currency}
      />

      <PaymentFormModal
        open={editPaymentOpen}
        mode="edit"
        initialData={editingPayment}
        onClose={() => {
          setEditPaymentOpen(false);
          setEditingPayment(null);
          setPaymentError("");
        }}
        onSubmit={async (payload) => {
          if (!pledgeId || !editingPayment?._id) return;
          await updatePledgePayment(pledgeId, editingPayment._id, payload);
          await loadPayments({ page: 1 });
          await loadPledge();
        }}
        currency={currency}
      />

      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        title="Delete Payment"
        message="Are you sure you want to delete this payment?"
        confirmLabel="Delete"
        onCancel={closeDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function PledgeDetailsPage() {
  return (
    <PledgeProvider>
      <PledgeDetailsPageInner />
    </PledgeProvider>
  );
}

export default PledgeDetailsPage;
