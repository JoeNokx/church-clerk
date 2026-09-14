import { useContext, useMemo, useState } from "react";

import PermissionContext from "../../Permissions/permission.store.js";
import ExpensesContext from "../expense.store.js";
import ChurchContext from "../../Church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import Spinner from "../../../shared/components/Spinner.jsx";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function ExpensesTable({ onEdit, onDeleted }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(ExpensesContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [viewRow, setViewRow] = useState(null);

  const canEdit = useMemo(() => (typeof can === "function" ? can("expenses", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("expenses", "delete") : false), [can]);

  const onPrev = async () => {
    const prevPage = store?.pagination?.prevPage;
    if (!prevPage) return;
    await store?.fetchGeneralExpenses?.({ page: prevPage });
  };

  const onNext = async () => {
    const nextPage = store?.pagination?.nextPage;
    if (!nextPage) return;
    await store?.fetchGeneralExpenses?.({ page: nextPage });
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
    await store?.deleteGeneralExpenses?.(id);
    onDeleted?.();
  };

  if (store?.loading) {
    return <div className="p-5 flex items-center justify-center"><Spinner className="text-gray-400" /></div>;
  }

  if (store?.error) {
    return (
      <div className="p-5">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{store.error}</div>
      </div>
    );
  }

  const rows = Array.isArray(store?.generalExpenses) ? store.generalExpenses : [];

  if (!rows.length) {
    return <div className="p-5 text-sm text-gray-600">No general expense record found.</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left text-xs font-semibold text-gray-500">
              <th className="px-6 py-2">Category</th>
              <th className="px-6 py-2">Amount</th>
              <th className="px-6 py-2">Date</th>
              <th className="px-6 py-2">Payment Method</th>
              <th className="px-6 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => (
              <tr key={row?._id ?? `row-${index}`} className="text-sm text-gray-700">
                <td className="px-6 py-1.5 text-gray-900" title={row?.category || ""}>
                  <span className="sm:hidden">{truncateMobileName(row?.category)}</span>
                  <span className="hidden sm:inline">{truncateDesktopName(row?.category)}</span>
                </td>
                <td className="px-6 py-1.5 text-orange-600">{formatMoney(row?.amount || 0, currency)}</td>
                <td className="px-6 py-1.5">{formatDate(row?.date)}</td>
                <td className="px-6 py-1.5 text-gray-600">{row?.paymentMethod || "-"}</td>
                <td className="px-6 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setViewRow(row)} className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs">View</button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!row?._id) return;
                          onEdit?.(row);
                        }}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!row?._id) return;
                          openConfirmDelete(row._id);
                        }}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-gray-50"
                      >
                        Delete
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

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <div className="text-sm font-semibold text-gray-900">Delete Expense</div>
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

      {viewRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto" onClick={() => setViewRow(null)}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div className="font-semibold text-gray-900 text-sm">Record Details</div>
              <button type="button" onClick={() => setViewRow(null)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              <div>
                <div className="text-xs font-semibold text-gray-500">Category</div>
                <div className="mt-1 text-gray-900">{viewRow?.category || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Amount</div>
                <div className="mt-1 text-gray-900">{formatMoney(viewRow?.amount || 0, currency)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Date</div>
                <div className="mt-1 text-gray-900">{formatDate(viewRow?.date)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Payment Method</div>
                <div className="mt-1 text-gray-900">{viewRow?.paymentMethod || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Description</div>
                <div className="mt-1 text-gray-900 whitespace-pre-wrap">{viewRow?.description || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ExpensesTable;
