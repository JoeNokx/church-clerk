import { useCallback, useEffect, useState } from "react";

import {
  getSystemChurches,
  getSystemChurch,
  suspendSystemChurch,
  unsuspendSystemChurch,
  deleteSystemChurch,
  delegateChurchSession,
  getAdminDashboardStats
} from "../Services/systemAdmin.api.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import StatusChip from "../../../shared/components/StatusChip/index.jsx";
import Card from "../../../shared/components/Card/index.jsx";
import Pagination from "../../../shared/components/Pagination/index.jsx";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";

function formatCreatedAt(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US");
}

function formatDateOnly(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US");
}

function DetailRow({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">{label}</div>
      <div className="mt-0.5 text-sm text-gray-900 break-words">{value || "—"}</div>
    </div>
  );
}

function ChurchDetailsModal({ churchId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [church, setChurch] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getSystemChurch(churchId);
        if (!cancelled) setChurch(res?.data?.data || null);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || e?.message || "Failed to load church details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [churchId]);

  const branches = Array.isArray(church?.branches) ? church.branches : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-base font-bold text-gray-900 truncate">{church?.name || "Church details"}</div>
            {church?.type && (
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                church.type === "Headquarters" ? "bg-blue-100 text-blue-700" :
                church.type === "Branch" ? "bg-purple-100 text-purple-700" :
                "bg-gray-100 text-gray-600"
              }`}>{church.type}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="mt-6 animate-pulse space-y-3">
            <div className="h-4 w-40 rounded bg-gray-200" />
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 rounded bg-gray-100" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        ) : church ? (
          <>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailRow label="Status" value={church.isActive === false ? "Suspended" : "Active"} />
              <DetailRow label="Pastor" value={church.pastor} />
              <DetailRow label="Email" value={church.email} />
              <DetailRow label="Phone" value={church.phoneNumber} />
              <DetailRow label="Country" value={church.country} />
              <DetailRow label="Region" value={church.region} />
              <DetailRow label="City" value={church.city} />
              <DetailRow label="Street Address" value={church.streetAddress} />
              <DetailRow label="Currency" value={church.currency} />
              <DetailRow label="Members" value={church.memberCount != null ? String(church.memberCount) : "—"} />
              <DetailRow label="Founded" value={formatDateOnly(church.foundedDate)} />
              <DetailRow label="Created" value={formatCreatedAt(church.createdAt)} />
              <DetailRow
                label="Registered By"
                value={church.createdBy ? `${church.createdBy.fullName || ""}${church.createdBy.email ? ` (${church.createdBy.email})` : ""}` : "—"}
              />
            </div>

            {church.type !== "Branch" && (
              <div className="mt-6">
                <div className="text-sm font-bold text-gray-900">
                  Branches{branches.length ? ` (${branches.length})` : ""}
                </div>
                {branches.length === 0 ? (
                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    No branches under this church.
                  </div>
                ) : (
                  <div className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {branches.map((b) => (
                      <div key={b._id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-gray-900" title={b.name || ""}>{b.name}</div>
                          <div className="truncate text-xs text-gray-500">
                            {[b.pastor, [b.city, b.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <StatusChip value={b.isActive === false ? "suspended" : "active"} />
                          <div className="mt-0.5 text-[10px] text-gray-400">{formatDateOnly(b.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function ConfirmModal({ open, title, message, confirmLabel, confirmClass, onConfirm, onCancel, loading, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="text-base font-bold text-gray-900">{title}</div>
        <div className="mt-2 text-sm text-gray-600">{message}</div>
        {children}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${confirmClass}`}>
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function trendPct(current, prev) {
  if (!prev) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}

function ChurchesPage() {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [churchStats, setChurchStats] = useState(null);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [suspendModal, setSuspendModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendReasonVisible, setSuspendReasonVisible] = useState(true);
  const [unsuspendModal, setUnsuspendModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [delegateLoading, setDelegateLoading] = useState("");
  const [delegateModal, setDelegateModal] = useState(null);
  const [viewModal, setViewModal] = useState(null);

  const handleDelegate = async (church) => {
    if (!church?._id) return;
    setDelegateLoading(church._id);
    try {
      const res = await delegateChurchSession(church._id);
      const url = res?.data?.data?.delegateUrl;
      if (url) {
        window.open(url, "_blank");
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to open delegated session");
    } finally {
      setDelegateLoading("");
      setDelegateModal(null);
    }
  };

  const load = useCallback(
    async ({ nextPage } = {}) => {
      const actualPage = nextPage ?? page;
      setLoading(true);
      setError("");
      try {
        const [res, statsRes] = await Promise.allSettled([
          getSystemChurches({
            page: actualPage,
            limit,
            search: search || undefined,
            type: type || undefined
          }),
          getAdminDashboardStats()
        ]);
        if (res.status === "fulfilled") {
          setRows(Array.isArray(res.value?.data?.data) ? res.value.data.data : []);
          setPagination(res.value?.data?.pagination || null);
        }
        if (statsRes.status === "fulfilled") {
          setChurchStats(statsRes.value?.data?.data?.churches || null);
        }
        setPage(actualPage);
      } catch (e) {
        setRows([]);
        setPagination(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load churches");
      } finally {
        setLoading(false);
      }
    },
    [limit, page, search, type]
  );

  useEffect(() => { load({ nextPage: 1 }); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => { load({ nextPage: 1 }); }, 300);
    return () => clearTimeout(t);
  }, [search, type, load]);

  const handleSuspend = async () => {
    if (!suspendModal?._id) return;
    setActionLoading("suspend");
    try {
      await suspendSystemChurch(suspendModal._id, { reason: suspendReason || undefined, suspendReasonVisible });
      setSuspendModal(null);
      setSuspendReason("");
      setSuspendReasonVisible(true);
      await load({ nextPage: page });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to suspend church");
    } finally {
      setActionLoading("");
    }
  };

  const handleUnsuspend = async () => {
    if (!unsuspendModal?._id) return;
    setActionLoading("unsuspend");
    try {
      await unsuspendSystemChurch(unsuspendModal._id);
      setUnsuspendModal(null);
      await load({ nextPage: page });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to unsuspend church");
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async () => {
    if (!deleteModal?._id) return;
    if (deleteConfirmName.trim() !== deleteModal.name) return;
    setActionLoading("delete");
    try {
      await deleteSystemChurch(deleteModal._id);
      setDeleteModal(null);
      setDeleteConfirmName("");
      await load({ nextPage: 1 });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete church");
    } finally {
      setActionLoading("");
    }
  };

  const displayRows = statusFilter
    ? rows.filter((c) => {
        if (statusFilter === "active") return c.isActive !== false;
        if (statusFilter === "suspended") return c.isActive === false;
        return true;
      })
    : rows;

  const typeOptions = [
    { label: "Independent", value: "Independent" },
    { label: "Headquarters", value: "Headquarters" },
    { label: "Branch", value: "Branch" }
  ];
  const statusOptions = [
    { label: "Active", value: "active" },
    { label: "Suspended", value: "suspended" }
  ];

  return (
    <div className="max-w-screen-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-bold text-gray-900">Churches</div>
          <div className="mt-1 text-sm text-gray-500">Manage and monitor all churches in the system.</div>
        </div>
      </div>

      <KpiGrid className="mt-6 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Total Churches"
          value={Number(churchStats?.total ?? 0).toLocaleString()}
          subtitle={`${Number(churchStats?.hq ?? 0)} HQ · ${Number(churchStats?.branches ?? 0)} branches`}
          change={churchStats ? trendPct(churchStats.thisMonth, churchStats.prevMonth) : undefined}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 21h18M9 21V11l3-3 3 3v10M5 21V9l7-7 7 7v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="Headquarters"
          value={Number(churchStats?.hq ?? 0).toLocaleString()}
          subtitle="Parent churches"
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 21h18M5 21V9l7-7 7 7v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="9" y="14" width="6" height="7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="Branches"
          value={Number(churchStats?.branches ?? 0).toLocaleString()}
          subtitle="Under a headquarters"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 21h18M9 21V13l3-3 3 3v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 10V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M9 7l3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="New This Month"
          value={Number(churchStats?.thisMonth ?? 0).toLocaleString()}
          subtitle="Registered in 30 days"
          change={churchStats ? trendPct(churchStats.thisMonth, churchStats.prevMonth) : undefined}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 21h18M9 21V11l3-3 3 3v10M5 21V9l7-7 7 7v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 8v4M17 10h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
      </KpiGrid>

      <Card className="mt-6">
        {/* Mobile filters (stacked) */}
        <div className="md:hidden flex flex-col gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, city..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
            <option value="">All types</option>
            <option value="Independent">Independent</option>
            <option value="Headquarters">Headquarters</option>
            <option value="Branch">Branch</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <div className="text-xs text-gray-500">
            {pagination?.totalResult !== undefined ? `Total: ${pagination.totalResult}` : ""}
          </div>
        </div>

        {/* Desktop filters */}
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name, email, phone, city..."
          selects={[
            { key: "type", value: type, onChange: setType, options: typeOptions, placeholder: "All types" },
            { key: "status", value: statusFilter, onChange: setStatusFilter, options: statusOptions, placeholder: "All statuses" }
          ]}
        >
          <div className="text-xs text-gray-500 self-center">
            {pagination?.totalResult !== undefined ? `Total: ${pagination.totalResult}` : ""}
          </div>
        </FilterBar>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="mt-4 animate-pulse">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left font-semibold text-gray-500 text-xs">
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <tr key={i} className="text-sm">
                      <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-4 w-32 rounded bg-gray-200" /></td>
                      <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                      <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
                      <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                      <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                      <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                      <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                      <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-4 w-12 rounded bg-gray-200" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : displayRows.length === 0 ? (
          <EmptyState
            compact
            illustration="church"
            title="No churches found"
            description="No churches match your current filters."
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                  <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Name</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Type</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Pastor</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Email</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Country</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Created</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayRows.map((c) => {
                  const isSuspended = c.isActive === false;
                  return (
                    <tr key={c._id} className={`max-md:text-xs text-gray-700 text-sm ${isSuspended ? "bg-red-50/30" : ""}`}>
                      <td className={`sticky left-0 z-10 max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6 ${isSuspended ? "bg-red-50" : "bg-white"}`} title={c.name || ""}>
                        <div className="font-medium text-gray-900">
                          <span className="sm:hidden">{truncateMobileName(c.name)}</span>
                          <span className="hidden sm:inline">{truncateDesktopName(c.name)}</span>
                        </div>
                        {c.city && <div className="text-xs text-gray-400">{c.city}</div>}
                      </td>
                      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          c.type === "Headquarters" ? "bg-blue-100 text-blue-700" :
                          c.type === "Branch" ? "bg-purple-100 text-purple-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{c.type || "—"}</span>
                      </td>
                      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                        <StatusChip value={isSuspended ? "suspended" : "active"} />
                      </td>
                      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6" title={c.pastor || ""}>
                        <span className="sm:hidden">{truncateMobileName(c.pastor)}</span>
                        <span className="hidden sm:inline">{truncateDesktopName(c.pastor)}</span>
                      </td>
                      <td className="max-md:px-4 py-1.5 text-gray-500 whitespace-nowrap px-4 md:px-6" title={c.email || ""}>
                        <span className="sm:hidden">{truncateMobileName(c.email)}</span>
                        <span className="hidden sm:inline">{truncateDesktopName(c.email)}</span>
                      </td>
                      <td className="max-md:px-4 py-1.5 text-gray-500 whitespace-nowrap px-4 md:px-6" title={c.country || ""}>
                        <span className="sm:hidden">{truncateMobileName(c.country)}</span>
                        <span className="hidden sm:inline">{truncateDesktopName(c.country)}</span>
                      </td>
                      <td className="max-md:px-4 py-1.5 text-gray-500 whitespace-nowrap px-4 md:px-6">
                        {formatCreatedAt(c.createdAt)}
                      </td>
                      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                        <TableKebabMenu
                          items={[
                            {
                              label: "View",
                              onClick: () => setViewModal(c),
                              desktopClassName: "rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            },
                            {
                              label: "View as Church",
                              onClick: () => setDelegateModal(c),
                              desktopClassName: "rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            },
                            isSuspended
                              ? {
                                  label: "Unsuspend",
                                  onClick: () => setUnsuspendModal(c),
                                  desktopClassName: "rounded-md border border-green-200 bg-white px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"
                                }
                              : {
                                  label: "Suspend",
                                  onClick: () => { setSuspendModal(c); setSuspendReason(""); },
                                  desktopClassName: "rounded-md border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                                },
                            {
                              label: "Delete",
                              onClick: () => { setDeleteModal(c); setDeleteConfirmName(""); },
                              danger: true,
                              desktopClassName: "rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                            }
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          pagination={pagination}
          rowsCount={rows.length}
          limit={limit}
          onLimitChange={(n) => { setLimit(n); }}
          onPageChange={(p) => load({ nextPage: p })}
          itemName="churches"
          filtered={Boolean(String(search || "").trim() || type || statusFilter)}
          disabled={loading}
        />
      </Card>

      {/* Church details modal */}
      {viewModal && (
        <ChurchDetailsModal
          churchId={viewModal._id}
          onClose={() => setViewModal(null)}
        />
      )}

      {/* Suspend Modal */}
      <ConfirmModal
        open={!!suspendModal}
        title={`Suspend "${suspendModal?.name}"?`}
        message="The church will be marked as suspended. You can unsuspend it at any time."
        confirmLabel="Suspend Church"
        confirmClass="bg-amber-600 hover:bg-amber-700"
        onConfirm={handleSuspend}
        onCancel={() => { setSuspendModal(null); setSuspendReason(""); setSuspendReasonVisible(true); }}
        loading={actionLoading === "suspend"}
      >
        <div className="mt-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Reason (optional)</label>
          <input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="e.g. Policy violation..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-100" />
          <label className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={suspendReasonVisible}
              onChange={(e) => setSuspendReasonVisible(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            Let the church see this reason
          </label>
        </div>
      </ConfirmModal>

      {/* Unsuspend Modal */}
      <ConfirmModal
        open={!!unsuspendModal}
        title={`Unsuspend "${unsuspendModal?.name}"?`}
        message="The church will be marked as active and regain full access."
        confirmLabel="Unsuspend Church"
        confirmClass="bg-green-600 hover:bg-green-700"
        onConfirm={handleUnsuspend}
        onCancel={() => setUnsuspendModal(null)}
        loading={actionLoading === "unsuspend"}
      >
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <div className="text-xs font-semibold text-amber-800">Suspension reason</div>
          <div className="mt-1 text-xs text-amber-800/90">
            {unsuspendModal?.suspendReason || "No reason was recorded."}
          </div>
          {unsuspendModal?.suspendedAt && (
            <div className="mt-1 text-[10px] text-amber-700/80">
              Suspended on {formatCreatedAt(unsuspendModal.suspendedAt)}
            </div>
          )}
        </div>
      </ConfirmModal>

      {/* Delete Modal */}
      <ConfirmModal
        open={!!deleteModal}
        title={`Delete "${deleteModal?.name}"?`}
        message="This action is permanent and cannot be undone. All church data will be removed."
        confirmLabel="Delete Church"
        confirmClass="bg-red-600 hover:bg-red-700"
        onConfirm={handleDelete}
        onCancel={() => { setDeleteModal(null); setDeleteConfirmName(""); }}
        loading={actionLoading === "delete"}
      >
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium">
          Type <strong>{deleteModal?.name}</strong> below to confirm deletion.
        </div>
        <input value={deleteConfirmName} onChange={(e) => setDeleteConfirmName(e.target.value)}
          placeholder="Type church name to confirm..."
          className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100" />
      </ConfirmModal>

      {/* Delegate Session Modal */}
      {delegateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-200">
              <div className="text-base font-bold text-gray-900">View as Church — "{delegateModal?.name}"</div>
              <button type="button" onClick={() => setDelegateModal(null)}
                disabled={!!delegateLoading}
                aria-label="Close"
                className="-mr-1 -mt-1 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-60">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="text-xs text-gray-700 bg-blue-50 rounded-lg px-3 py-3 leading-relaxed">
                This will open the Church Clerk frontend in a new browser tab, logged in as this church.
                <br /><br />
                You will see exactly what the church admin sees — dashboard, members, tithes, offerings, billing, settings, everything. Any changes you make will affect this church's real data.
                <br /><br />
                <strong className="text-blue-800">This is not a simulation.</strong> Actions you take in the delegated session are real.
                <br /><br />
                The session expires automatically after 2 hours, or when you click "Exit Session" in the banner at the top of the page.
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button type="button" onClick={() => setDelegateModal(null)}
                  disabled={!!delegateLoading}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                  Cancel
                </button>
                <button type="button"
                  onClick={() => handleDelegate(delegateModal)}
                  disabled={!!delegateLoading}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                  {delegateLoading ? "Opening…" : "Open Church Frontend"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChurchesPage;
