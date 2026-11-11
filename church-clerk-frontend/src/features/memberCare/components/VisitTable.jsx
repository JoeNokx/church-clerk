import { useContext, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import MemberCareContext from "../memberCare.store.js";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import Pagination from "../../../shared/components/Pagination/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import { resolveEmptyReason, buildRecoveryActions } from "../../../shared/utils/emptyState.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";
import { showError } from "../../../utils/toast.js";
import Chip from "./Chip.jsx";
import { formatDate, labelFor, memberName, VISIT_TYPES, VISIT_OUTCOMES } from "../constants.js";

function VisitTable({ onEdit }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberCareContext);
  const guarded = useGuardedAction();

  const canEdit = useMemo(() => (typeof can === "function" ? can("memberCare", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("memberCare", "delete") : false), [can]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const clearSearch = () => {
    store?.setVisitFilters?.({ search: "", page: 1 });
    store?.fetchVisits?.({ search: "", page: 1 });
  };
  const clearFilters = () => {
    store?.setVisitFilters?.({ visitType: "", page: 1 });
    store?.fetchVisits?.({ visitType: "", page: 1 });
  };
  const clearDate = () => {
    store?.setVisitFilters?.({ dateFrom: "", dateTo: "", page: 1 });
    store?.fetchVisits?.({ dateFrom: "", dateTo: "", page: 1 });
  };

  const onPageChange = (page) => page && store?.fetchVisits?.({ page });
  const onLimitChange = (n) => store?.fetchVisits?.({ limit: n, page: 1 });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await store?.deleteVisit?.(deleteTarget._id);
      setDeleteTarget(null);
    } catch (e) {
      showError(e?.response?.data?.message || "Care visit could not be deleted");
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
              {[14, 20, 22, 14, 16, 14, 14, 10].map((w, i) => (
                <th key={i} className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 rounded bg-gray-200" style={{ width: `${w * 4}px` }} /></th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i} className="text-sm">
                {[14, 20, 22, 14, 16, 14, 14, 10].map((w, j) => (
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

  const rows = Array.isArray(store?.visits) ? store.visits : [];

  if (!rows.length) {
    const filters = store?.visitFilters || {};
    const reason = resolveEmptyReason({
      search: filters.search,
      filters,
      filterDefaults: { visitType: "" },
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    const recovery = buildRecoveryActions(reason, {
      onClearSearch: clearSearch,
      onClearFilters: clearFilters,
      onClearDate: clearDate,
    });
    const isZero = reason === "zero";

    return (
      <EmptyState
        illustration={isZero ? "memberCare" : "search"}
        title={isZero ? "No care visits yet" : "No care visits found"}
        description={isZero
          ? "Visits are logged against care cases — open a case and log the first visit."
          : "We couldn't find any visits matching your current search or filters."}
        actionLabel={isZero ? null : recovery?.actionLabel}
        onAction={isZero ? null : recovery?.onAction}
        secondaryLabel={recovery?.secondaryLabel}
        onSecondary={recovery?.onSecondary}
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
              <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Member</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Case</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Type</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Conducted By</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Outcome</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Next Follow-up</th>
              <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => {
              const name = memberName(row?.member);
              const conducted = (Array.isArray(row?.conductedBy) ? row.conductedBy : [])
                .map((m) => memberName(m))
                .filter((n) => n && n !== "—")
                .join(", ");
              return (
                <tr key={row?._id ?? `row-${index}`} className="max-md:text-xs text-gray-700 text-sm">
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{formatDate(row?.visitDate)}</td>
                  <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={name}>
                    <span className="sm:hidden">{truncateMobileName(name)}</span>
                    <span className="hidden sm:inline">{truncateDesktopName(name)}</span>
                  </td>
                  <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[180px]">{row?.careCase?.title || "—"}</span>
                      {row?.careCase?.confidential ? (
                        <span title="Confidential case" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 text-amber-600">
                            <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6">{labelFor(VISIT_TYPES, row?.visitType)}</td>
                  <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6">
                    <span className="truncate max-w-[160px] inline-block align-middle">{conducted || "—"}</span>
                  </td>
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6"><Chip value={row?.outcome} label={labelFor(VISIT_OUTCOMES, row?.outcome)} /></td>
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{formatDate(row?.nextFollowUpDate) || <span className="text-gray-300 text-xs">—</span>}</td>
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                    <TableKebabMenu items={[
                      canEdit && { label: "Edit", onClick: () => guarded(() => onEdit?.(row)) },
                      canDelete && { label: "Delete", danger: true, onClick: () => guarded(() => setDeleteTarget(row)) },
                    ]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        pagination={store?.visitPagination}
        rowsCount={rows.length}
        limit={store?.visitFilters?.limit}
        onLimitChange={onLimitChange}
        onPageChange={onPageChange}
        itemName="visits"
        filtered={Boolean(
          String(store?.visitFilters?.search || "").trim() ||
            store?.visitFilters?.visitType ||
            store?.visitFilters?.dateFrom ||
            store?.visitFilters?.dateTo
        )}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="font-semibold text-gray-900 text-sm mb-2">Delete this visit?</div>
            <p className="text-xs text-gray-400 mb-5">This will permanently remove the visit record from the case.</p>
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

export default VisitTable;
