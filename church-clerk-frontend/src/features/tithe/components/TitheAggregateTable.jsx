import { useContext, useMemo, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import TitheContext from "../tithe.store.js";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function TitheAggregateTable({ onEdit, onDeleted }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(TitheContext);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const canEdit = useMemo(() => (typeof can === "function" ? can("tithe", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("tithe", "delete") : false), [can]);

  const rows = Array.isArray(store?.aggregates) ? store.aggregates : [];

  const onPrev = async () => {
    const prevPage = store?.aggregatePagination?.prevPage;
    if (!prevPage) return;
    await store?.fetchAggregates?.({ page: prevPage });
  };

  const onNext = async () => {
    const nextPage = store?.aggregatePagination?.nextPage;
    if (!nextPage) return;
    await store?.fetchAggregates?.({ page: nextPage });
  };

  const openConfirmDelete = (id) => {
    setConfirmId(id);
    setConfirmOpen(true);
  };

  const closeConfirmDelete = () => {
    setConfirmOpen(false);
    setConfirmId(null);
  };

  const confirmDelete = async () => {
    const id = confirmId;
    closeConfirmDelete();
    if (!id) return;
    await store?.deleteTitheAggregate?.(id);
    onDeleted?.();
  };

  if (store?.loading) {
    return <div className="p-5 text-sm text-gray-600">Loading...</div>;
  }

  if (store?.error) {
    return (
      <div className="p-5">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{store.error}</div>
      </div>
    );
  }

  if (!rows.length) {
    return <div className="p-5 text-sm text-gray-600">No tithe record found.</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left text-xs font-semibold text-gray-500">
              <th className="px-6 py-2">Total Amount</th>
              <th className="px-6 py-2">Date</th>
              <th className="px-6 py-2">Recorded By</th>
              <th className="px-6 py-2">Notes</th>
              <th className="px-6 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => (
              <tr key={row?._id ?? `row-${index}`} className="text-sm text-gray-700">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
                      <span className="text-base font-semibold">$</span>
                    </div>
                    <div className="text-blue-700">GHS {Number(row?.amount || 0).toLocaleString()}</div>
                  </div>
                </td>
                <td className="px-6 py-3">{formatDate(row?.date)}</td>
                <td className="px-6 py-3">{row?.createdBy?.fullName || row?.createdBy?.email || "-"}</td>
                <td className="px-6 py-3 text-gray-900">{row?.description || "-"}</td>
                <td className="px-6 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!row?._id) return;
                          onEdit?.(row);
                        }}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white text-blue-700 hover:bg-blue-50"
                        aria-label="Edit"
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                          <path
                            d="M4 20h4l10.5-10.5a2 2 0 0 0 0-3L16.5 4a2 2 0 0 0-3 0L3 14.5V20Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                          <path d="M13.5 6.5 17.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!row?._id) return;
                          openConfirmDelete(row._id);
                        }}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white text-red-600 hover:bg-red-50"
                        aria-label="Delete"
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                          <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          <path d="M10 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          <path d="M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          <path
                            d="M6 7l1 14h10l1-14"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      </button>
                    )}
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
          disabled={!store?.aggregatePagination?.prevPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
        >
          Prev
        </button>
        <div className="text-sm text-gray-600">Page {store?.aggregatePagination?.currentPage || 1}</div>
        <button
          type="button"
          onClick={onNext}
          disabled={!store?.aggregatePagination?.nextPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <div className="text-sm font-semibold text-gray-900">Delete Tithe</div>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700">Are you sure you want to delete this record?</div>
            <div className="flex items-center justify-end gap-3 px-5 py-4">
              <button
                type="button"
                onClick={closeConfirmDelete}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TitheAggregateTable;
