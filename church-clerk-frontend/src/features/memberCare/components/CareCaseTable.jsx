import { useContext, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import { showError } from "../../../utils/toast.js";
import MemberCareContext from "../memberCare.store.js";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import Pagination from "../../../shared/components/Pagination/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import { resolveEmptyReason, buildRecoveryActions } from "../../../shared/utils/emptyState.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";
import Chip from "./Chip.jsx";
import { formatDate, labelFor, memberName, CASE_CATEGORIES, CASE_STATUSES } from "../constants.js";

function CareCaseTable({ onView, onEdit, onLogVisit, onCreate, onDeleted }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberCareContext);
  const guarded = useGuardedAction();

  const canDelete = useMemo(() => (typeof can === "function" ? can("memberCare", "delete") : false), [can]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const clearSearch = () => {
    store?.setCaseFilters?.({ search: "", page: 1 });
    store?.fetchCases?.({ search: "", page: 1 });
  };
  const clearFilters = () => {
    store?.setCaseFilters?.({ status: "", category: "", priority: "", page: 1 });
    store?.fetchCases?.({ status: "", category: "", priority: "", page: 1 });
  };
  const clearDate = () => {
    store?.setCaseFilters?.({ dateFrom: "", dateTo: "", page: 1 });
    store?.fetchCases?.({ dateFrom: "", dateTo: "", page: 1 });
  };

  const onPageChange = (page) => page && store?.fetchCases?.({ page });
  const onLimitChange = (n) => store?.fetchCases?.({ limit: n, page: 1 });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await store?.deleteCase?.(deleteTarget._id);
      setDeleteTarget(null);
      onDeleted?.();
    } catch (e) {
      showError(e?.response?.data?.message || "Care case could not be deleted");
    } finally {
      setDeleting(false);
    }
  };

  if (store?.loading) {
    return (
      <div className="overflow-x-auto animate-pulse">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left font-semibold text-gray-500 text-xs">
              {[16, 24, 14, 12, 14, 16, 12].map((w, i) => (
                <th key={i} className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 rounded bg-gray-200" style={{ width: `${w * 4}px` }} /></th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i} className="text-sm">
                {[20, 24, 14, 12, 14, 16, 12].map((w, j) => (
                  <td key={j} className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 rounded bg-gray-200" style={{ width: `${w * 4}px` }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (store?.error) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{store.error}</div>
      </div>
    );
  }

  const rows = Array.isArray(store?.cases) ? store.cases : [];

  if (!rows.length) {
    const filters = store?.caseFilters || {};
    const reason = resolveEmptyReason({
      search: filters.search,
      filters,
      filterDefaults: { status: "", category: "", priority: "" },
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    const recovery = buildRecoveryActions(reason, {
      onClearSearch: clearSearch,
      onClearFilters: clearFilters,
      onClearDate: clearDate,
    });
    const isZero = reason === "zero";
    const showAdd = isZero && onCreate;

    return (
      <EmptyState
        illustration={isZero ? "memberCare" : "search"}
        title={isZero ? "No care cases yet" : "No care cases found"}
        description={isZero
          ? "Open your first care case to start tracking pastoral care for members."
          : "We couldn't find any care cases matching your current search or filters."}
        actionLabel={showAdd ? "New Care Case" : recovery?.actionLabel}
        onAction={showAdd ? () => guarded(onCreate, "memberCare", "create") : recovery?.onAction}
        secondaryLabel={showAdd ? null : recovery?.secondaryLabel}
        onSecondary={showAdd ? null : recovery?.onSecondary}
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
              <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Member</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Case</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Category</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Priority</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Next Follow-up</th>
              <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => {
              const name = memberName(row?.member);
              return (
                <tr key={row?._id ?? `row-${index}`} className="max-md:text-xs text-gray-700 text-sm">
                  <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={name}>
                    <span className="sm:hidden">{truncateMobileName(name)}</span>
                    <span className="hidden sm:inline">{truncateDesktopName(name)}</span>
                  </td>
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium text-gray-900">{row?.title || "—"}</div>
                        <div className="font-mono text-[10px] text-gray-400">{row?.referenceId || ""}</div>
                      </div>
                      {row?.confidential ? (
                        <span title="Confidential — visible to church admin only" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100">
                          <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 text-amber-600">
                            <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6">{labelFor(CASE_CATEGORIES, row?.category)}</td>
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6"><Chip value={row?.priority} /></td>
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6"><Chip value={row?.status} label={labelFor(CASE_STATUSES, row?.status)} /></td>
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{formatDate(row?.nextFollowUpDate) || <span className="text-gray-300 text-xs">—</span>}</td>
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                    <TableKebabMenu items={[
                      { label: "View", onClick: () => onView?.(row) },
                      { label: "Log Visit", onClick: () => guarded(() => onLogVisit?.(row), "memberCare", "update") },
                      { label: "Edit", onClick: () => guarded(() => onEdit?.(row), "memberCare", "update") },
                      row?.canDelete && { label: "Delete", danger: true, onClick: () => guarded(() => setDeleteTarget(row), "memberCare", "delete") },
                    ]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        pagination={store?.casePagination}
        rowsCount={rows.length}
        limit={store?.caseFilters?.limit}
        onLimitChange={onLimitChange}
        onPageChange={onPageChange}
        itemName="cases"
        filtered={Boolean(
          String(store?.caseFilters?.search || "").trim() ||
            store?.caseFilters?.status ||
            store?.caseFilters?.category ||
            store?.caseFilters?.priority ||
            store?.caseFilters?.dateFrom ||
            store?.caseFilters?.dateTo
        )}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="font-semibold text-gray-900 text-sm mb-2">Delete "{deleteTarget.title}"?</div>
            <p className="text-xs text-gray-400 mb-5">This will permanently remove the care case.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="flex-1 h-10 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CareCaseTable;
