import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import Skeleton from "react-loading-skeleton";
import debounce from "../../../shared/utils/debounce.js";

import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import PledgeContext, { PledgeProvider } from "../pledge.store.js";
import { getPledges as apiGetPledges } from "../services/pledge.api.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import AddLookupValueButton from "../../lookups/components/AddLookupValueButton.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
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
        className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 font-semibold text-gray-700 hover:bg-gray-50 md:h-12 text-sm"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-500">
          <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <span className="text-gray-700">{labelText}</span>
      </button>

      {datePickerOpen && (
        <div className="cck-date-dropdown absolute right-0 z-20 mt-2 w-[320px] rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div className="font-semibold text-gray-500 text-xs">Filter by date</div>
            <button type="button" onClick={clearDates} className="font-semibold text-gray-600 hover:text-gray-900 text-xs">
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-semibold text-gray-500 text-xs">From</div>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => onDraftFromChange(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              />
            </div>

            <div>
              <div className="font-semibold text-gray-500 text-xs">To</div>
              <input
                type="date"
                value={draftTo}
                min={draftFrom || undefined}
                onChange={(e) => setDraftTo(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              />
            </div>
          </div>

          <div className="pt-3 text-gray-500 text-xs">
            Pick only <span className="font-semibold">From</span> for a single day, or pick both for a range.
          </div>

          <div className="pt-3 flex items-center justify-end">
            <button
              type="button"
              onClick={applyDates}
              className="h-11 rounded-lg bg-blue-600 px-4 font-semibold text-white shadow-sm hover:bg-blue-700 md:h-12 text-sm"
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
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold ${styles} text-xs`}>
      {value || "—"}
    </span>
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

function PledgeFormModal({ open, mode, initialData, onClose, onSubmit, currency }) {
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
    "Sunday First Service",
    "Sunday Second Service",
    "Sunday Third Service",
    "Sunday Fourth Service",
    "Sunday Fifth Service",
    "Worship Service",
    "Bible Study",
    "Children Service",
    "Midweek Service",
    "Prayer Meeting",
    "Special Program"
  ];

  const { values: lookupServiceTypes, reload: reloadServiceTypes } = useLookupValues("serviceType");
  const serviceTypeOptions = lookupServiceTypes?.length ? lookupServiceTypes : SERVICE_TYPES;

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

    if (!isValidPhoneNumber(phoneNumber)) {
      setError("Invalid phone number");
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
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              placeholder="e.g., John Doe"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-500 text-xs">Phone Number</label>
            <div className="mt-2">
              <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber} error={Boolean(error)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-gray-500 text-xs">Service Type</label>
              <AddLookupValueButton
                label="Add service"
                kind="serviceType"
                onCreated={async (value) => {
                  await reloadServiceTypes();
                  setServiceType(value);
                }}
              />
            </div>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            >
              <option value="">Select service type</option>
              {serviceTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
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
            <label className="block font-semibold text-gray-500 text-xs">Pledge Date</label>
            <input
              value={pledgeDate}
              onChange={(e) => setPledgeDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              type="date"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-500 text-xs">Deadline</label>
            <input
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              type="date"
            />
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

function PledgesPageInner() {
  const { toPage } = useDashboardNavigator();

  const churchCtx = useContext(ChurchContext);
  const currency = String(churchCtx?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const store = useContext(PledgeContext);
  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(() => (typeof can === "function" ? can("pledge", "read") : true), [can]);
  const canView = useMemo(() => (typeof can === "function" ? can("pledges", "view") : false), [can]);
  const canCreate = useMemo(() => (typeof can === "function" ? can("pledges", "create") : true), [can]);

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
    "Sunday First Service",
    "Sunday Second Service",
    "Sunday Third Service",
    "Sunday Fourth Service",
    "Sunday Fifth Service",
    "Worship Service",
    "Bible Study",
    "Children Service",
    "Midweek Service",
    "Prayer Meeting",
    "Special Program"
  ];

  const { values: lookupServiceTypes } = useLookupValues("serviceType");
  const serviceTypeOptions = lookupServiceTypes?.length ? lookupServiceTypes : SERVICE_TYPES;

  const STATUS_OPTIONS = ["In Progress", "Completed"];

  const [searchValue, setSearchValue] = useState(store?.filters?.search || "");

  const debouncedSearch = useMemo(() => {
    return debounce((value) => {
      store?.fetchPledges?.({ search: value, page: 1 });
    }, 400);
  }, [store]);

  useEffect(() => {
    if (!store?.activeChurchId) return;
    store?.fetchPledges?.();
  }, [store?.activeChurchId]);

  useEffect(() => {
    setSearchValue(store?.filters?.search || "");
  }, [store?.filters?.search]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

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

  const onSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    store?.setFilters?.({ search: value, page: 1 });
    debouncedSearch(value);
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
          <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Pledges</h2>
          <p className="mt-1 text-gray-500 text-sm">Track pledges and payment commitments</p>
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
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed text-sm"
          >
            <span className="leading-none text-lg">+</span>
            New Pledge
          </button>
        </div>
      </div>

      <KpiGrid className="mt-4 gap-3 lg:grid-cols-4">
        <KpiCard
          title="Total Pledges"
          value={Number(kpi.total || 0).toLocaleString()}
          subtitle="All pledges"
          iconBg="bg-blue-50"
          iconColor="text-blue-700"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M16 11c1.66 0 3-1.79 3-4s-1.34-4-3-4-3 1.79-3 4 1.34 4 3 4Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 11c1.66 0 3-1.79 3-4S9.66 3 8 3 5 4.79 5 7s1.34 4 3 4Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M21 21v-2a4 4 0 0 0-4-4h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M3 21v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          title="Total Amount Pledged"
          value={formatCurrency(kpi.pledged, currency)}
          subtitle="Committed amount"
          iconBg="bg-purple-50"
          iconColor="text-purple-700"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 1v22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M17 5.5c0-2-2.24-3.5-5-3.5s-5 1.5-5 3.5 2.24 3.5 5 3.5 5 1.5 5 3.5-2.24 3.5-5 3.5-5-1.5-5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          title="Total Amount Paid"
          value={formatCurrency(kpi.paid, currency)}
          subtitle="Payments received"
          iconBg="bg-green-50"
          iconColor="text-green-700"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M20 7L10 17l-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="Total Outstanding"
          value={formatCurrency(kpi.outstanding, currency)}
          subtitle="Remaining balance"
          iconBg="bg-red-50"
          iconColor="text-red-700"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 9v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M10.3 3.8h3.4L22 22H2L10.3 3.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          }
        />
      </KpiGrid>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Pledge Records</div>
            <div className="text-gray-500 text-xs">All pledges and balances</div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end md:justify-end md:gap-3">
            <input
              value={searchValue}
              onChange={onSearchChange}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 md:w-56 text-sm"
              placeholder="Search name or phone"
            />

            <select
              value={store?.filters?.serviceType || ""}
              onChange={onServiceTypeChange}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 md:w-56 text-sm"
            >
              <option value="">All Service Types</option>
              {serviceTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={store?.filters?.status || ""}
              onChange={onStatusChange}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 md:w-44 text-sm"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

            <DateRangeFilter
              appliedFrom={store?.filters?.dateFrom || ""}
              appliedTo={store?.filters?.dateTo || ""}
              onApply={onApplyDates}
              onClear={onClearDates}
            />
          </div>
        </div>

        {store?.loading ? (
          <div className="overflow-x-auto animate-pulse">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left font-semibold text-gray-500 text-xs">
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-16 rounded bg-gray-200" /></th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-11 rounded bg-gray-200 md:w-12" /></th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[0, 1, 2, 3, 4].map((i) => (
                  <tr key={i} className="text-sm">
                    <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-12 rounded bg-gray-200" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {!store?.loading && store?.error ? (
          <div className="p-4 md:p-6 lg:p-8">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{store.error}</div>
          </div>
        ) : null}

        {!store?.loading && !store?.error && !rows.length ? <div className="p-4 text-gray-600 md:p-6 lg:p-8 text-sm">No pledge record found.</div> : null}

        {!store?.loading && !store?.error && rows.length ? (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                    <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Name</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Phone</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Pledged</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Paid</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Balance</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Deadline</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                    <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row, index) => (
                    <tr key={row?._id ?? `row-${index}`} className="max-md:text-xs text-gray-700 text-sm">
                      <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 font-semibold text-gray-900 whitespace-nowrap px-4 md:px-6">{row?.name || "—"}</td>
                      <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6">{row?.phoneNumber || "—"}</td>
                      <td className="max-md:px-4 py-1.5 font-semibold text-gray-900 whitespace-nowrap px-4 md:px-6">{formatCurrency(row?.amount || 0, currency)}</td>
                      <td className="max-md:px-4 py-1.5 text-green-700 whitespace-nowrap px-4 md:px-6">{formatCurrency(row?.totalPaid || 0, currency)}</td>
                      <td className="max-md:px-4 py-1.5 text-red-600 whitespace-nowrap px-4 md:px-6">{formatCurrency(row?.remainingBalance || 0, currency)}</td>
                      <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6">{formatDate(row?.deadline)}</td>
                      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                        <StatusChip value={row?.status} />
                      </td>
                      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                        <div className="flex items-center justify-end gap-2">
                          {canView && (
                            <button
                              type="button"
                              onClick={() => viewDetails(row)}
                              className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                            >
                              View
                            </button>
                          )}

                          {(canEdit || canDelete) ? (
                            <div className="relative" ref={menuRef}>
                              <button
                                type="button"
                                onClick={() => setMenuOpenId((prev) => (prev === row?._id ? null : row?._id))}
                                className="h-11 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-11 w-11 md:w-12"
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
                                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 text-sm"
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
                                      className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50 text-sm"
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

            <div className="flex items-center justify-end gap-3 py-2 px-4 md:px-6">
              <button
                type="button"
                onClick={onPrev}
                disabled={!store?.pagination?.prevPage}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
              >
                Prev
              </button>
              <div className="text-gray-600 text-sm">Page {store?.pagination?.currentPage || 1}</div>
              <button
                type="button"
                onClick={onNext}
                disabled={!store?.pagination?.nextPage}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
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
        onClose={() => {
          setNewOpen(false);
          setError("");
        }}
        onSubmit={async (payload) => {
          await store?.createPledge?.(payload);
          await computeKpi();
        }}
        currency={currency}
        title="Create New Pledge"
      />

      <PledgeFormModal
        open={editOpen}
        mode="edit"
        initialData={editingRow}
        onClose={() => {
          setEditOpen(false);
          setEditingRow(null);
          setError("");
        }}
        onSubmit={async (payload) => {
          if (!editingRow?._id) return;
          await store?.updatePledge?.(editingRow._id, payload);
          await computeKpi();
        }}
        currency={currency}
        title="Edit Pledge"
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
