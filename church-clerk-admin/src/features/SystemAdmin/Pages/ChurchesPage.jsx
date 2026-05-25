import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getSystemChurches,
  suspendSystemChurch,
  unsuspendSystemChurch,
  deleteSystemChurch
} from "../Services/systemAdmin.api.js";

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

function StatusPill({ isActive }) {
  if (isActive === false) {
    return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Suspended</span>;
  }
  return <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Active</span>;
}

function ChurchesPage() {
  const navigate = useNavigate();
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

  return (
    <div className="max-w-screen-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-bold text-gray-900">Churches</div>
          <div className="mt-1 text-sm text-gray-500">Manage and monitor all churches in the system.</div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, city..."
            className="w-full md:w-80 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full md:w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
            <option value="">All types</option>
            <option value="Independent">Independent</option>
            <option value="Headquarters">Headquarters</option>
            <option value="Branch">Branch</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <div className="flex-1" />
          <div className="text-xs text-gray-500">
            {pagination?.totalResult !== undefined ? `Total: ${pagination.totalResult}` : ""}
          </div>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-gray-400">
              <tr className="border-b">
                <th className="py-3 text-left font-semibold">Name</th>
                <th className="py-3 text-left font-semibold">Type</th>
                <th className="py-3 text-left font-semibold">Status</th>
                <th className="py-3 text-left font-semibold">Pastor</th>
                <th className="py-3 text-left font-semibold">Email</th>
                <th className="py-3 text-left font-semibold">Country</th>
                <th className="py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {[0,1,2,3].map((i) => (
                    <tr key={i} className="animate-pulse border-b">
                      <td className="py-3 pr-4"><div className="h-4 w-32 rounded bg-gray-200" /></td>
                      <td className="py-3 pr-4"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                      <td className="py-3 pr-4"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
                      <td className="py-3 pr-4"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                      <td className="py-3 pr-4"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                      <td className="py-3 pr-4"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                      <td className="py-3"><div className="h-6 w-24 rounded bg-gray-200 ml-auto" /></td>
                    </tr>
                  ))}
                </>
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-gray-400">No churches found.</td>
                </tr>
              ) : (
                displayRows.map((c) => {
                  const isSuspended = c.isActive === false;
                  return (
                    <tr key={c._id} className={`border-b last:border-b-0 ${isSuspended ? "bg-red-50/30" : ""}`}>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-gray-900">{c.name || "—"}</div>
                        {c.city && <div className="text-xs text-gray-400">{c.city}</div>}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          c.type === "Headquarters" ? "bg-blue-100 text-blue-700" :
                          c.type === "Branch" ? "bg-purple-100 text-purple-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{c.type || "—"}</span>
                      </td>
                      <td className="py-3 pr-4"><StatusPill isActive={c.isActive} /></td>
                      <td className="py-3 pr-4 text-gray-700">{c.pastor || "—"}</td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">{c.email || "—"}</td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">{c.country || "—"}</td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button type="button" onClick={() => navigate(`/admin/churches/${c._id}`)}
                            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                            View
                          </button>
                          {isSuspended ? (
                            <button type="button"
                              onClick={() => handleUnsuspend(c)}
                              disabled={actionLoading === c._id + "_unsuspend"}
                              className="rounded-md border border-green-200 bg-white px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50">
                              Unsuspend
                            </button>
                          ) : (
                            <button type="button"
                              onClick={() => { setSuspendModal(c); setSuspendReason(""); }}
                              className="rounded-md border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                              Suspend
                            </button>
                          )}
                          <button type="button"
                            onClick={() => { setDeleteModal(c); setDeleteConfirmName(""); }}
                            className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                            Delete
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

        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={() => load({ nextPage: Math.max(1, page - 1) })}
            disabled={loading || !(pagination?.hasPrev ?? page > 1)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50">
            Prev
          </button>
          <div className="text-xs text-gray-600">
            Page {page}{pagination?.totalPages ? ` / ${pagination.totalPages}` : ""}
          </div>
          <button type="button" onClick={() => load({ nextPage: page + 1 })}
            disabled={loading || !(pagination?.hasNext ?? false)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50">
            Next
          </button>
        </div>
      </div>

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
    </div>
  );
}

export default ChurchesPage;
