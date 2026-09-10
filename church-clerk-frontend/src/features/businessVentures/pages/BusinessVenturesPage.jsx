import { useContext, useEffect, useMemo, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import Skeleton from "react-loading-skeleton";
import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import { formatMoney, formatCompactMoney } from "../../../shared/utils/formatMoney.js";
import {
  createBusinessVenture,
  deleteBusinessVenture,
  getBusinessKPI,
  getBusinessVentures,
  updateBusinessVenture
} from "../services/businessVentures.api.js";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import Button from "../../../shared/components/Button/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import Card from "../../../shared/components/Card/index.jsx";

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

function ConfirmDeleteModal({ open, title, message, confirmLabel, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
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

function AddBusinessModal({ open, onClose, onSuccess }) {
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [manager, setManager] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusinessName("");
    setDescription("");
    setManager("");
    setPhoneNumber("");
    setStartDate("");
    setError("");
    setSaving(false);
    setIsSubmitting(false);
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    if (!String(businessName || "").trim()) {
      setError("Business name is required.");
      setIsSubmitting(false);
      return;
    }

    if (!String(description || "").trim()) {
      setError("Description is required.");
      setIsSubmitting(false);
      return;
    }

    if (String(phoneNumber || "").trim() && !isValidPhoneNumber(phoneNumber)) {
      setError("Invalid phone number");
      setIsSubmitting(false);
      return;
    }

    setSaving(true);
    try {
      await createBusinessVenture({
        businessName: String(businessName).trim(),
        description: String(description).trim(),
        manager: String(manager || "").trim(),
        phoneNumber: String(phoneNumber || "").trim(),
        ...(startDate ? { startDate } : {})
      });
      onSuccess?.();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setSaving(false);
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal open={open} title="Add Business Venture" subtitle="Create a new venture" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Business Name</label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            placeholder="e.g., Bookshop"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 min-h-24 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 text-sm"
            placeholder="What does this venture do?"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Manager</label>
            <input
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Phone Number</label>
            <div className="mt-2">
              <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber} error={Boolean(error)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Start Date</label>
            <input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              type="date"
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
            loadingText="Adding..."
            className="rounded-lg bg-blue-700 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm px-4 md:px-6"
          >
            Add
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}

function EditBusinessModal({ open, initialData, onClose, onSuccess }) {
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [manager, setManager] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusinessName(String(initialData?.businessName || ""));
    setDescription(String(initialData?.description || ""));
    setManager(String(initialData?.manager || ""));
    setPhoneNumber(String(initialData?.phoneNumber || ""));
    setError("");
    setSaving(false);
    setIsSubmitting(false);
  }, [open, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    const id = initialData?._id;
    if (!id) {
      setIsSubmitting(false);
      return;
    }

    if (!String(businessName || "").trim()) {
      setError("Business name is required.");
      setIsSubmitting(false);
      return;
    }

    if (!String(description || "").trim()) {
      setError("Description is required.");
      setIsSubmitting(false);
      return;
    }

    setSaving(true);
    try {
      await updateBusinessVenture(id, {
        businessName: String(businessName).trim(),
        description: String(description).trim(),
        manager: String(manager || "").trim(),
        phoneNumber: String(phoneNumber || "").trim()
      });
      onSuccess?.();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setSaving(false);
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal open={open} title="Edit Business Venture" subtitle="Update venture details" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Business Name</label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-500 text-xs">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 min-h-24 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Manager</label>
            <input
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-500 text-xs">Phone Number</label>
            <div className="mt-2">
              <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber} error={Boolean(error)} />
            </div>
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
            loadingText="Saving..."
            className="rounded-lg bg-blue-700 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm px-4 md:px-6"
          >
            Save
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}

function safeListPayload(res) {
  const payload = res?.data?.data ?? res?.data;
  const data = payload?.data ?? payload;
  const rows = data?.businessVentures ?? payload?.businessVentures;
  return Array.isArray(rows) ? rows : [];
}

function safeKpiPayload(res) {
  const payload = res?.data?.data ?? res?.data;
  const data = payload?.data ?? payload;
  return data?.businessKPI ?? payload?.businessKPI ?? null;
}

function BusinessVenturesPage() {
  const { toPage } = useDashboardNavigator();

  const churchCtx = useContext(ChurchContext);
  const activeChurch = churchCtx?.activeChurch;
  const currency = String(activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const canEdit = activeChurch?._id ? activeChurch?.canEdit !== false : true;

  const { can } = useContext(PermissionContext) || {};
  const canView = useMemo(() => (typeof can === "function" ? can("businessVentures", "view") : false), [can]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ventures, setVentures] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState(null);

  const load = async (dateParams) => {
    setLoading(true);
    setError("");

    const params = { page: 1, limit: 50 };
    if (dateParams?.dateFrom) params.dateFrom = dateParams.dateFrom;
    if (dateParams?.dateTo) params.dateTo = dateParams.dateTo;

    const [venturesRes, kpiRes] = await Promise.allSettled([
      getBusinessVentures(params),
      getBusinessKPI()
    ]);

    if (venturesRes.status === "fulfilled") {
      setVentures(safeListPayload(venturesRes.value));
    } else {
      setVentures([]);
    }

    if (kpiRes.status === "fulfilled") {
      setKpi(safeKpiPayload(kpiRes.value));
    } else {
      setKpi(null);
    }

    if (venturesRes.status !== "fulfilled") {
      setError(venturesRes.reason?.response?.data?.message || venturesRes.reason?.message || "Failed to load business ventures");
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    load({ dateFrom, dateTo });
  }, [dateFrom, dateTo]);

  const totals = useMemo(() => {
    const rows = Array.isArray(ventures) ? ventures : [];
    const totalVentures = Number(kpi?.totalVentures ?? rows.length);

    const totalIncome = Number(kpi?.totalIncome ?? 0);
    const totalExpenses = Number(kpi?.totalExpenses ?? 0);
    const net = Number(kpi?.net ?? (totalIncome - totalExpenses));

    return { totalVentures, totalIncome, totalExpenses, net };
  }, [ventures, kpi]);

  useEffect(() => { setPage(1); }, [searchValue, dateFrom, dateTo]);

  const filteredVentures = useMemo(() => {
    const lower = searchValue.toLowerCase().trim();
    if (!lower) return ventures;
    return ventures.filter((v) =>
      String(v?.businessName || "").toLowerCase().includes(lower) ||
      String(v?.createdBy?.fullName || "").toLowerCase().includes(lower)
    );
  }, [ventures, searchValue]);

  const totalPages = Math.max(1, Math.ceil(filteredVentures.length / PAGE_SIZE));
  const pagedVentures = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredVentures.slice(start, start + PAGE_SIZE);
  }, [filteredVentures, page, PAGE_SIZE]);

  const viewDetails = (row) => {
    if (!row?._id) return;
    toPage("business-venture-details", { id: row._id });
  };

  const viewIncome = (row) => {
    if (!row?._id) return;
    toPage("business-venture-details", { id: row._id, tab: "incomes" });
  };

  const viewExpenses = (row) => {
    if (!row?._id) return;
    toPage("business-venture-details", { id: row._id, tab: "expenses" });
  };

  const openEdit = (row) => {
    setEditRow(row || null);
    setEditOpen(true);
  };

  const openDelete = (row) => {
    setConfirmDeleteRow(row || null);
    setConfirmDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!confirmDeleteRow?._id) return;
    try {
      await deleteBusinessVenture(confirmDeleteRow._id);
      setConfirmDeleteOpen(false);
      setConfirmDeleteRow(null);
      load();
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Business Ventures</div>
          <div className="mt-2 text-gray-600 text-sm hidden md:block">Track venture income and expenses</div>
        </div>

        <div className="flex items-center gap-3">
          {canEdit ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="hidden md:inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 md:px-5 lg:px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-800 text-sm"
            >
              <span className="leading-none text-lg">+</span>
              Add Business
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

      <KpiGrid className="mt-4 gap-3 lg:grid-cols-4">
        <KpiCard
          title="Total Ventures"
          value={totals.totalVentures}
          change={kpi?.change?.totalVentures}
          diff={kpi?.diff?.totalVentures}
          compareLabel="last month"
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="Total Income"
          value={formatMoney(totals.totalIncome, currency)}
          change={kpi?.change?.totalIncome}
          compareLabel="last month"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          title="Total Expenses"
          value={formatMoney(totals.totalExpenses, currency)}
          change={kpi?.change?.totalExpenses}
          compareLabel="last month"
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M3 8h18M3 8a2 2 0 00-2 2v8a2 2 0 002 2h18a2 2 0 002-2v-8a2 2 0 00-2-2M3 8V6a2 2 0 012-2h14a2 2 0 012 2v2M12 15a1.5 1.5 0 100-3 1.5 1.5 0 000 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          title="Net"
          value={formatMoney(totals.net, currency)}
          change={kpi?.change?.net}
          compareLabel="last month"
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </KpiGrid>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
          <div className="flex items-center justify-between md:block">
            <div>
              <div className="font-semibold text-gray-900 text-sm">Business Ventures</div>
              <div className="text-gray-500 text-xs">All ventures and financials</div>
            </div>
            {canEdit ? (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 text-sm h-10 md:hidden"
              >
                <span className="leading-none text-lg">+</span>
                Add
              </button>
            ) : null}
          </div>
          <FilterBar
            searchValue={searchValue}
            onSearchChange={(v) => setSearchValue(v)}
            searchPlaceholder="Search business name or recorded by"
            searchWidth="md:w-[320px]"
            selects={[]}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateApply={(from, to) => { setDateFrom(from); setDateTo(to); }}
          />
          <MobileFilterBar
            searchValue={searchValue}
            onSearchChange={(v) => setSearchValue(v)}
            searchPlaceholder="Search business name or recorded by"
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateApply={(from, to) => { setDateFrom(from); setDateTo(to); }}
            resultCount={filteredVentures.length}
            getLiveCount={async ({ dateFrom: dFrom, dateTo: dTo }) => {
              let rows = ventures;
              const lower = searchValue.toLowerCase().trim();
              if (lower) {
                rows = rows.filter((v) =>
                  String(v?.businessName || "").toLowerCase().includes(lower) ||
                  String(v?.createdBy?.fullName || "").toLowerCase().includes(lower)
                );
              }
              return rows.length;
            }}
            className="w-full"
          />
        </div>

        {loading ? (
          <div className="p-4 md:p-6 lg:p-8">
            <Skeleton height={14} count={6} />
          </div>
        ) : filteredVentures.length === 0 ? (
          <EmptyState
            illustration={searchValue ? "search" : "businessVentures"}
            title={searchValue ? "No business ventures found" : "No business ventures yet"}
            description={searchValue
              ? "We couldn't find any ventures matching your search."
              : "Add your first venture to start tracking income and expenses."}
            actionLabel={searchValue ? "Clear Search" : (canEdit ? "Add Business" : null)}
            onAction={searchValue ? () => setSearchValue("") : (canEdit ? () => setAddOpen(true) : undefined)}
          />
        ) : (
          <div className="p-4 md:p-6 lg:p-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pagedVentures.map((v, idx) => {
            const metaItems = [];
            if (v?.manager) {
              metaItems.push({
                icon: <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
                label: v.manager,
              });
            }
            if (v?.phoneNumber) {
              metaItems.push({
                icon: <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
                label: v.phoneNumber,
              });
            }

            return (
              <Card key={v?._id ?? `v-${idx}`}>
                <Card.Header
                  title={v?.businessName || "Not Specified"}
                  actions={
                    <>
                      {canEdit ? (
                        <button onClick={() => openEdit(v)} className="cck-allow-icons h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                        </button>
                      ) : null}
                      {canEdit ? (
                        <button onClick={() => openDelete(v)} className="cck-allow-icons h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50">
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      ) : null}
                    </>
                  }
                />
                {metaItems.length ? <Card.Meta items={metaItems} /> : null}
                <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100">
                  <div className="pr-3">
                    <div className="font-semibold text-gray-500 text-[11px]">Income</div>
                    <div className="mt-0.5 font-semibold text-green-700 text-xs">{formatCompactMoney(v?.totalIncome, currency)}</div>
                  </div>
                  <div className="px-3">
                    <div className="font-semibold text-gray-500 text-[11px]">Expenses</div>
                    <div className="mt-0.5 font-semibold text-orange-600 text-xs">{formatCompactMoney(v?.totalExpenses, currency)}</div>
                  </div>
                  <div className="pl-3">
                    <div className="font-semibold text-gray-500 text-[11px]">Net</div>
                    <div className="mt-0.5 font-semibold text-blue-900 text-xs">{formatCompactMoney(v?.net, currency)}</div>
                  </div>
                </div>
                <Card.Footer>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {canView ? (
                        <>
                          <button type="button" onClick={() => viewIncome(v)} className="cck-allow-icons inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-green-700 hover:bg-gray-50 text-xs">Income</button>
                          <button type="button" onClick={() => viewExpenses(v)} className="cck-allow-icons inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-orange-600 hover:bg-gray-50 text-xs">Expenses</button>
                        </>
                      ) : null}
                    </div>
                    {canView ? <Card.ViewDetailsLink onClick={() => viewDetails(v)} /> : null}
                  </div>
                </Card.Footer>
              </Card>
            );
          })}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
                >
                  Prev
                </button>
                <span className="text-gray-600 text-sm">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AddBusinessModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          load();
        }}
      />

      <EditBusinessModal
        open={editOpen}
        initialData={editRow}
        onClose={() => {
          setEditOpen(false);
          setEditRow(null);
        }}
        onSuccess={() => {
          setEditOpen(false);
          setEditRow(null);
          load();
        }}
      />

      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        title="Delete Venture"
        message={`Are you sure you want to delete "${confirmDeleteRow?.businessName || "this venture"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => {
          setConfirmDeleteOpen(false);
          setConfirmDeleteRow(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default BusinessVenturesPage;
