import { useCallback, useEffect, useState } from "react";

import {
  getSystemChurches,
  suspendSystemChurch,
  unsuspendSystemChurch,
  deleteSystemChurch,
  delegateChurchSession
} from "../Services/systemAdmin.api.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import StatusChip from "../../../shared/components/StatusChip/index.jsx";
import Card from "../../../shared/components/Card/index.jsx";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";

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

function ChurchesPage() {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const [suspendModal, setSuspendModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [delegateLoading, setDelegateLoading] = useState("");
  const [delegateModal, setDelegateModal] = useState(null);

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
        const res = await getSystemChurches({
          page: actualPage,
          limit,
          search: search || undefined,
          type: type || undefined
        });
        setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
        setPagination(res?.data?.pagination || null);
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
      await suspendSystemChurch(suspendModal._id, { reason: suspendReason || undefined });
      setSuspendModal(null);
      setSuspendReason("");
      await load({ nextPage: page });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to suspend church");
    } finally {
      setActionLoading("");
    }
  };

  const handleUnsuspend = async (church) => {
    if (!church?._id) return;
    setActionLoading(church._id + "_unsuspend");
    try {
      await unsuspendSystemChurch(church._id);
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
                      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                        <TableKebabMenu
                          items={[
                            {
                              label: "View as Church",
                              onClick: () => setDelegateModal(c),
                              disabled: isSuspended,
                              desktopClassName: "rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            },
                            isSuspended
                              ? {
                                  label: "Unsuspend",
                                  onClick: () => handleUnsuspend(c),
                                  disabled: actionLoading === c._id + "_unsuspend",
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

        <div className="flex items-center justify-end gap-3 px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => load({ nextPage: Math.max(1, page - 1) })}
            disabled={loading || !(pagination?.hasPrev ?? page > 1)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
          >
            Prev
          </button>
          <div className="text-gray-600 text-sm">
            Page {page}{pagination?.totalPages ? ` / ${pagination.totalPages}` : ""}
          </div>
          <button
            type="button"
            onClick={() => load({ nextPage: page + 1 })}
            disabled={loading || !(pagination?.hasNext ?? false)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
          >
            Next
          </button>
        </div>
      </Card>

      {/* Suspend Modal */}
      <ConfirmModal
        open={!!suspendModal}
        title={`Suspend "${suspendModal?.name}"?`}
        message="The church will be marked as suspended. You can unsuspend it at any time."
        confirmLabel="Suspend Church"
        confirmClass="bg-amber-600 hover:bg-amber-700"
        onConfirm={handleSuspend}
        onCancel={() => { setSuspendModal(null); setSuspendReason(""); }}
        loading={actionLoading === "suspend"}
      >
        <div className="mt-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Reason (optional)</label>
          <input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="e.g. Policy violation..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-100" />
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
