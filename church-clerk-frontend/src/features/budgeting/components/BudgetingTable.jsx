import { useContext, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";

import PermissionContext from "../../permissions/permission.store.js";
import BudgetingContext from "../budgeting.store.js";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatPeriod(from, to) {
  const f = from ? formatDate(from) : "—";
  const t = to ? formatDate(to) : "—";
  if (f === "—" && t === "—") return "—";
  if (f === t) return f;
  return `${f} - ${t}`;
}

function sumPlanned(items, type) {
  const rows = Array.isArray(items) ? items : [];
  return rows.filter((i) => i?.type === type).reduce((acc, i) => acc + Number(i?.amount || 0), 0);
}

function statusBadge(status) {
  const s = String(status || "draft").toLowerCase();
  const map = {
    draft: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-700",
    archived: "bg-amber-100 text-amber-700"
  };
  return map[s] || map.draft;
}

function BudgetingTable({ onView, onEdit }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(BudgetingContext);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const canEdit = useMemo(() => (typeof can === "function" ? can("budgeting", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("budgeting", "delete") : false), [can]);

  const onPrev = async () => {
    const prevPage = store?.pagination?.prevPage;
    if (!prevPage) return;
    await store?.fetchBudgets?.({ page: prevPage });
  };

  const onNext = async () => {
    const nextPage = store?.pagination?.nextPage;
    if (!nextPage) return;
    await store?.fetchBudgets?.({ page: nextPage });
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
    await store?.deleteBudget?.(id);
  };

  if (store?.loading) {
    return (
      <div className="p-5">
        <Skeleton height={14} count={8} />
      </div>
    );
  }

  if (store?.error) {
    return (
      <div className="p-5">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{store.error}</div>
      </div>
    );
  }

  const rows = Array.isArray(store?.budgets) ? store.budgets : [];

  if (!rows.length) {
    return <div className="p-5 text-sm text-gray-600">No budgets found.</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left text-xs sm:max-lg:text-sm font-semibold text-gray-500">
              <th className="sticky left-0 z-20 bg-slate-100 px-6 max-sm:px-4 py-2 whitespace-nowrap">Budget</th>
              <th className="px-6 max-sm:px-4 py-2 whitespace-nowrap">Year</th>
              <th className="px-6 max-sm:px-4 py-2 whitespace-nowrap">Status</th>
              <th className="px-6 max-sm:px-4 py-2 whitespace-nowrap">Period</th>
              <th className="px-6 max-sm:px-4 py-2 whitespace-nowrap">Planned Income</th>
              <th className="px-6 max-sm:px-4 py-2 whitespace-nowrap">Planned Expenses</th>
              <th className="px-6 max-sm:px-4 py-2 whitespace-nowrap">Created</th>
              <th className="px-6 max-sm:px-4 py-2 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => {
              const plannedIncome = sumPlanned(row?.items, "income");
              const plannedExpense = sumPlanned(row?.items, "expense");

              return (
                <tr key={row?._id ?? `row-${index}`} className="text-sm max-sm:text-xs text-gray-700">
                  <td className="sticky left-0 z-10 bg-white px-6 max-sm:px-4 py-2 text-gray-900 font-semibold whitespace-nowrap">{row?.name || "-"}</td>
                  <td className="px-6 max-sm:px-4 py-2 whitespace-nowrap">{row?.fiscalYear || "-"}</td>
                  <td className="px-6 max-sm:px-4 py-2 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(row?.status)}`}>
                      {String(row?.status || "draft").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 max-sm:px-4 py-2 text-gray-600 whitespace-nowrap">{formatPeriod(row?.periodFrom, row?.periodTo)}</td>
                  <td className="px-6 max-sm:px-4 py-2 text-green-700 font-semibold whitespace-nowrap">{plannedIncome.toLocaleString()}</td>
                  <td className="px-6 max-sm:px-4 py-2 text-orange-700 font-semibold whitespace-nowrap">{plannedExpense.toLocaleString()}</td>
                  <td className="px-6 max-sm:px-4 py-2 text-gray-600 whitespace-nowrap">{formatDate(row?.createdAt)}</td>
                  <td className="px-6 max-sm:px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => row?._id && onView?.(row)}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        View
                      </button>

                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => row?._id && onEdit?.(row)}
                          className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      ) : null}

                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => row?._id && openConfirmDelete(row._id)}
                          className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-gray-50"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 max-sm:px-4 py-2">
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
              <div className="text-sm font-semibold text-gray-900">Delete Budget</div>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700">Are you sure you want to delete this budget?</div>
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

export default BudgetingTable;
