import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";

import PermissionContext from "../../permissions/permission.store.js";
import PledgeContext, { PledgeProvider } from "../pledge.store.js";
import { getPledges as apiGetPledges } from "../services/pledge.api.js";

function formatCurrency(value) {
  return `GHS ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatYmdLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function extractPayload(res) {
  return res?.data?.data ?? res?.data;
}

function extractPledges(res) {
  const payload = extractPayload(res);
  return Array.isArray(payload?.pledges) ? payload.pledges : [];
}

function extractPagination(res) {
  const payload = extractPayload(res);
  return payload?.pagination || null;
}

function DateRangeFilter({ appliedFrom, appliedTo, onApply, onClear }) {
  const datePickerRef = useRef(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  useEffect(() => {
    setDraftFrom(appliedFrom || "");
    setDraftTo(appliedTo || "");
  }, [appliedFrom, appliedTo]);

  const labelText = useMemo(() => {
    if (!appliedFrom && !appliedTo) return "Date";
    if (appliedFrom && appliedTo && appliedFrom === appliedTo) return appliedFrom;
    if (appliedFrom && appliedTo) return `${appliedFrom} to ${appliedTo}`;
    if (appliedFrom) return appliedFrom;
    if (appliedTo) return appliedTo;
    return "Date";
  }, [appliedFrom, appliedTo]);

  useEffect(() => {
    if (!datePickerOpen) return;

    const onDocMouseDown = (e) => {
      if (!datePickerRef.current) return;
      if (datePickerRef.current.contains(e.target)) return;
      setDatePickerOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [datePickerOpen]);

  const clearDates = async () => {
    setDraftFrom("");
    setDraftTo("");
    await onClear?.();
    setDatePickerOpen(false);
  };

  const onDraftFromChange = (value) => {
    setDraftFrom(value);
    if (draftTo && value && draftTo < value) {
      setDraftTo("");
    }
  };

  const applyDates = async () => {
    const from = draftFrom || "";
    const to = draftTo || "";

    if (!from && !to) {
      await clearDates();
      return;
    }

    if ((from && !to) || (!from && to)) {
      const single = from || to;
      await onApply?.(single, single);
      setDatePickerOpen(false);
      return;
    }

    await onApply?.(from, to);
    setDatePickerOpen(false);
  };

  return (
    <div className="relative" ref={datePickerRef}>
      <button
        type="button"
        onClick={() => setDatePickerOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-500">
          <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <span className="text-gray-700">{labelText}</span>
      </button>

      {datePickerOpen && (
        <div className="absolute right-0 z-20 mt-2 w-[320px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div className="text-xs font-semibold text-gray-500">Filter by date</div>
            <button type="button" onClick={clearDates} className="text-xs font-semibold text-gray-600 hover:text-gray-900">
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-gray-500">From</div>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => onDraftFromChange(e.target.value)}
                className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500">To</div>
              <input
                type="date"
                value={draftTo}
                min={draftFrom || undefined}
                onChange={(e) => setDraftTo(e.target.value)}
                className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>
          </div>

          <div className="pt-3 text-xs text-gray-500">
            Pick only <span className="font-semibold">From</span> for a single day, or pick both for a range.
          </div>

          <div className="pt-3 flex items-center justify-end">
            <button
              type="button"
              onClick={applyDates}
              className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusChip({ value }) {
  const v = String(value || "").toLowerCase();
  const styles =
    v === "completed" ? "border-green-200 bg-green-50 text-green-700" : "border-yellow-200 bg-yellow-50 text-yellow-700";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {value || "—"}
    </span>
  );
}

function BaseModal({ open, title, subtitle, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <div className="text-lg font-semibold text-gray-900">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-gray-500">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function PledgeFormModal({ open, mode, initialData, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [amount, setAmount] = useState("");
  const [pledgeDate, setPledgeDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSaving(false);

    if (mode === "edit" && initialData) {
      setName(String(initialData?.name || ""));
      setPhoneNumber(String(initialData?.phoneNumber || ""));
      setServiceType(String(initialData?.serviceType || ""));
      setAmount(initialData?.amount ?? "");
      setPledgeDate(String(initialData?.pledgeDate || "").slice(0, 10));
      setDeadline(String(initialData?.deadline || "").slice(0, 10));
      setNote(String(initialData?.note || ""));
      return;
    }

    setName("");
    setPhoneNumber("");
    setServiceType("");
    setAmount("");
    setPledgeDate("");
    setDeadline("");
    setNote("");
  }, [open, mode, initialData]);

  const SERVICE_TYPES = [
    "Sunday Service",
    "1st Service",
    "2nd Service",
    "3rd Service",
    "Worship Service",
    "Bible Study",
    "Children Service",
    "Midweek Service",
    "Prayer Meeting",
    "Special Program"
  ];

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!String(name || "").trim()) {
      setError("Name is required.");
      return;
    }

    if (!String(phoneNumber || "").trim()) {
      setError("Phone number is required.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Amount is required.");
      return;
    }

    if (!pledgeDate) {
      setError("Pledge date is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: String(name).trim(),
        phoneNumber: String(phoneNumber).trim(),
        serviceType: String(serviceType || "").trim() || undefined,
        amount: Number(amount),
        pledgeDate,
        deadline: deadline || undefined,
        note: String(note || "").trim() || undefined,
      };

      if (mode !== "edit") {
        payload.status = "In Progress";
      }

      await onSubmit?.(payload);
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
      title={mode === "edit" ? "Edit Pledge" : "New Pledge"}
      subtitle={mode === "edit" ? "Update pledge details" : "Create a new pledge"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              placeholder="e.g., John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500">Phone Number</label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              placeholder="e.g., +233..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500">Service Type</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            >
              <option value="">Select service type</option>
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500">Amount (GHS)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              type="number"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500">Pledge Date</label>
            <input
              value={pledgeDate}
              onChange={(e) => setPledgeDate(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              type="date"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500">Deadline</label>
            <input
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              type="date"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500">Note</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-700 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
          >
            {mode === "edit" ? "Save" : "Create"}
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
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
        </div>
        <div className="px-5 py-4 text-sm text-gray-700">{message}</div>
        <div className="flex items-center justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PledgesPageInner() {
  const { toPage } = useDashboardNavigator();
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(PledgeContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("pledges", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("pledges", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("pledges", "delete") : false), [can]);

  const [kpi, setKpi] = useState({ total: 0, pledged: 0, paid: 0, outstanding: 0 });
  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState(null);

  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);

  const SERVICE_TYPES = [
    "Sunday Service",
    "1st Service",
    "2nd Service",
    "3rd Service",
    "Worship Service",
    "Bible Study",
    "Children Service",
    "Midweek Service",
    "Prayer Meeting",
    "Special Program"
  ];

  const STATUS_OPTIONS = ["In Progress", "Completed"];

  useEffect(() => {
    if (!store?.activeChurchId) return;
    store?.fetchPledges?.();
  }, [store?.activeChurchId]);

  useEffect(() => {
    if (!menuOpenId) return;

    const onDoc = (e) => {
      if (!menuRef.current) {
        setMenuOpenId(null);
        return;
      }
      if (menuRef.current.contains(e.target)) return;
      setMenuOpenId(null);
    };

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpenId]);

  const computeKpi = useCallback(async () => {
    if (!store?.activeChurchId) return;

    const limit = 100;
    let page = 1;
    let totalPaid = 0;
    let totalPledged = 0;
    let totalCount = 0;

    const filters = store?.filters || {};

    while (true) {
      const params = {
        page,
        limit,
        search: filters?.search || undefined,
        serviceType: filters?.serviceType || undefined,
        status: filters?.status || undefined,
        dateFrom: filters?.dateFrom || undefined,
        dateTo: filters?.dateTo || undefined
      };

      const res = await apiGetPledges(params);
      const rows = extractPledges(res);
      const pagination = extractPagination(res) || {};

      totalCount += rows.length;
      totalPledged += rows.reduce((sum, r) => sum + Number(r?.amount || 0), 0);
      totalPaid += rows.reduce((sum, r) => sum + Number(r?.totalPaid || 0), 0);

      if (pagination?.nextPage) {
        page = pagination.nextPage;
        continue;
      }

      break;
    }

    setKpi({
      total: totalCount,
      pledged: totalPledged,
      paid: totalPaid,
      outstanding: Math.max(0, totalPledged - totalPaid)
    });
  }, [store?.activeChurchId, store?.filters]);

  useEffect(() => {
    if (!store?.activeChurchId) return;
    computeKpi().catch(() => null);
  }, [computeKpi, store?.activeChurchId]);

  const openCreate = () => {
    setEditingRow(null);
    setNewOpen(true);
  };

  const openEdit = (row) => {
    setEditingRow(row || null);
    setEditOpen(true);
  };

  const closeForms = () => {
    setNewOpen(false);
    setEditOpen(false);
    setEditingRow(null);
  };

  const viewDetails = (row) => {
    if (!row?._id) return;
    toPage("pledge-details", { id: row._id });
  };

  const openDelete = (row) => {
    setConfirmDeleteRow(row || null);
    setConfirmDeleteOpen(true);
  };

  const closeDelete = () => {
    setConfirmDeleteOpen(false);
    setConfirmDeleteRow(null);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteRow?._id;
    closeDelete();
    if (!id) return;
    await store?.deletePledge?.(id);
    await computeKpi();
  };

  const onSearchChange = async (e) => {
    const value = e.target.value;
    store?.setFilters?.({ search: value, page: 1 });
    await store?.fetchPledges?.({ search: value, page: 1 });
  };

  const onServiceTypeChange = async (e) => {
    const value = e.target.value;
    store?.setFilters?.({ serviceType: value, page: 1 });
    await store?.fetchPledges?.({ serviceType: value, page: 1 });
  };

  const onStatusChange = async (e) => {
    const value = e.target.value;
    store?.setFilters?.({ status: value, page: 1 });
    await store?.fetchPledges?.({ status: value, page: 1 });
  };

  const onApplyDates = async (from, to) => {
    store?.setFilters?.({ dateFrom: from || "", dateTo: to || "", page: 1 });
    await store?.fetchPledges?.({ dateFrom: from || "", dateTo: to || "", page: 1 });
  };

  const onClearDates = async () => {
    store?.setFilters?.({ dateFrom: "", dateTo: "", page: 1 });
    await store?.fetchPledges?.({ dateFrom: "", dateTo: "", page: 1 });
  };

  const onPrev = async () => {
    const prevPage = store?.pagination?.prevPage;
    if (!prevPage) return;
    await store?.fetchPledges?.({ page: prevPage });
  };

  const onNext = async () => {
    const nextPage = store?.pagination?.nextPage;
    if (!nextPage) return;
    await store?.fetchPledges?.({ page: nextPage });
  };

  const rows = Array.isArray(store?.pledges) ? store.pledges : [];

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Pledges</h2>
          <p className="mt-2 text-sm text-gray-600">Track pledges and payment commitments</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (!canCreate) return;
              openCreate();
            }}
            disabled={!canCreate}
            title={!canCreate ? "You don't have permission to create pledges" : undefined}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed"
          >
            <span className="text-lg leading-none">+</span>
            New Pledge
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold text-gray-500">Total Pledges</div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M16 11c1.66 0 3-1.79 3-4s-1.34-4-3-4-3 1.79-3 4 1.34 4 3 4Z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 11c1.66 0 3-1.79 3-4S9.66 3 8 3 5 4.79 5 7s1.34 4 3 4Z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M21 21v-2a4 4 0 0 0-4-4h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M3 21v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-blue-900">{Number(kpi.total || 0).toLocaleString()}</div>
          <div className="mt-1 text-xs text-gray-500">All pledges</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold text-gray-500">Total Amount Pledged</div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M12 1v22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M17 5.5c0-2-2.24-3.5-5-3.5s-5 1.5-5 3.5 2.24 3.5 5 3.5 5 1.5 5 3.5-2.24 3.5-5 3.5-5-1.5-5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-purple-700">{formatCurrency(kpi.pledged)}</div>
          <div className="mt-1 text-xs text-gray-500">Committed amount</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold text-gray-500">Total Amount Paid</div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-700">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M20 7L10 17l-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-green-700">{formatCurrency(kpi.paid)}</div>
          <div className="mt-1 text-xs text-gray-500">Payments received</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold text-gray-500">Total Outstanding</div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M12 9v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M10.3 3.8h3.4L22 22H2L10.3 3.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-red-600">{formatCurrency(kpi.outstanding)}</div>
          <div className="mt-1 text-xs text-gray-500">Remaining balance</div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Pledge Records</div>
            <div className="text-xs text-gray-500">All pledges and balances</div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className="text-xs font-semibold text-gray-500">Search</div>
              <input
                value={store?.filters?.search || ""}
                onChange={onSearchChange}
                className="mt-2 h-9 w-56 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                placeholder="Search name or phone"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500">Service Type</div>
              <select
                value={store?.filters?.serviceType || ""}
                onChange={onServiceTypeChange}
                className="mt-2 h-9 w-56 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              >
                <option value="">All Service Types</option>
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500">Status</div>
              <select
                value={store?.filters?.status || ""}
                onChange={onStatusChange}
                className="mt-2 h-9 w-44 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              >
                <option value="">All Status</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <DateRangeFilter
              appliedFrom={store?.filters?.dateFrom || ""}
              appliedTo={store?.filters?.dateTo || ""}
              onApply={onApplyDates}
              onClear={onClearDates}
            />
          </div>
        </div>

        {store?.loading ? <div className="p-5 text-sm text-gray-600">Loading...</div> : null}
        {!store?.loading && store?.error ? (
          <div className="p-5">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{store.error}</div>
          </div>
        ) : null}

        {!store?.loading && !store?.error && !rows.length ? <div className="p-5 text-sm text-gray-600">No pledge record found.</div> : null}

        {!store?.loading && !store?.error && rows.length ? (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left text-xs font-semibold text-gray-500">
                    <th className="px-6 py-2">Name</th>
                    <th className="px-6 py-2">Phone</th>
                    <th className="px-6 py-2">Pledged</th>
                    <th className="px-6 py-2">Paid</th>
                    <th className="px-6 py-2">Balance</th>
                    <th className="px-6 py-2">Deadline</th>
                    <th className="px-6 py-2">Status</th>
                    <th className="px-6 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row, index) => (
                    <tr key={row?._id ?? `row-${index}`} className="text-sm text-gray-700">
                      <td className="px-6 py-1.5 font-semibold text-gray-900 whitespace-nowrap">{row?.name || "—"}</td>
                      <td className="px-6 py-1.5 text-gray-600 whitespace-nowrap">{row?.phoneNumber || "—"}</td>
                      <td className="px-6 py-1.5 font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(row?.amount || 0)}</td>
                      <td className="px-6 py-1.5 text-green-700 whitespace-nowrap">{formatCurrency(row?.totalPaid || 0)}</td>
                      <td className="px-6 py-1.5 text-red-600 whitespace-nowrap">{formatCurrency(row?.remainingBalance || 0)}</td>
                      <td className="px-6 py-1.5 text-gray-600 whitespace-nowrap">{formatDate(row?.deadline)}</td>
                      <td className="px-6 py-1.5 whitespace-nowrap">
                        <StatusChip value={row?.status} />
                      </td>
                      <td className="px-6 py-1.5 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => viewDetails(row)}
                            className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            View
                          </button>

                          {(canEdit || canDelete) ? (
                            <div className="relative" ref={menuRef}>
                              <button
                                type="button"
                                onClick={() => setMenuOpenId((prev) => (prev === row?._id ? null : row?._id))}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                aria-label="More actions"
                              >
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                                  <path d="M12 5.5h.01M12 12h.01M12 18.5h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                                </svg>
                              </button>

                              {menuOpenId === row?._id ? (
                                <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                                  {canEdit ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMenuOpenId(null);
                                        openEdit(row);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      Edit
                                    </button>
                                  ) : null}

                                  {canDelete ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMenuOpenId(null);
                                        openDelete(row);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                                    >
                                      Delete
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-2">
              <button
                type="button"
                onClick={onPrev}
                disabled={!store?.pagination?.prevPage}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
              >
                Prev
              </button>
              <div className="text-sm text-gray-600">Page {store?.pagination?.currentPage || 1}</div>
              <button
                type="button"
                onClick={onNext}
                disabled={!store?.pagination?.nextPage}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <PledgeFormModal
        open={newOpen}
        mode="create"
        initialData={null}
        onClose={closeForms}
        onSubmit={async (payload) => {
          await store?.createPledge?.(payload);
          await computeKpi();
        }}
      />

      <PledgeFormModal
        open={editOpen}
        mode="edit"
        initialData={editingRow}
        onClose={closeForms}
        onSubmit={async (payload) => {
          if (!editingRow?._id) return;
          await store?.updatePledge?.(editingRow._id, payload);
          await computeKpi();
        }}
      />

      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        title="Delete Pledge"
        message="Are you sure you want to delete this pledge?"
        confirmLabel="Delete"
        onCancel={closeDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function PledgesPage() {
  return (
    <PledgeProvider>
      <PledgesPageInner />
    </PledgeProvider>
  );
}

export default PledgesPage;
