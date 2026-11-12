import { useContext, useMemo, useState } from "react";

import MemberCareContext from "../memberCare.store.js";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import Pagination from "../../../shared/components/Pagination/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import { resolveEmptyReason, buildRecoveryActions } from "../../../shared/utils/emptyState.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";
import { showError } from "../../../utils/toast.js";
import Chip from "./Chip.jsx";
import { formatDate, labelFor, memberName, PRAYER_CATEGORIES, PRAYER_STATUSES } from "../constants.js";

function PrayerRequestTable({ onEdit, onCreate }) {
  const store = useContext(MemberCareContext);
  const guarded = useGuardedAction();


  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewRow, setViewRow] = useState(null);

  const clearSearch = () => {
    store?.setPrayerFilters?.({ search: "", page: 1 });
    store?.fetchPrayerRequests?.({ search: "", page: 1 });
  };
  const clearFilters = () => {
    store?.setPrayerFilters?.({ status: "", category: "", page: 1 });
    store?.fetchPrayerRequests?.({ status: "", category: "", page: 1 });
  };

  const onPageChange = (page) => page && store?.fetchPrayerRequests?.({ page });
  const onLimitChange = (n) => store?.fetchPrayerRequests?.({ limit: n, page: 1 });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await store?.deletePrayer?.(deleteTarget._id);
      setDeleteTarget(null);
    } catch (e) {
      showError(e?.response?.data?.message || "Prayer request could not be deleted");
    } finally {
      setDeleting(false);
    }
  };

  const markAnswered = async (row) => {
    if (!row?._id) return;
    try {
      await store?.updatePrayer?.(row._id, { status: "answered" });
    } catch (e) {
      showError(e?.response?.data?.message || "Prayer request could not be updated");
    }
  };

  if (store?.loading) {
    return (
      <div className="overflow-x-auto animate-pulse">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left font-semibold text-gray-500 text-xs">
              {[20, 26, 14, 12, 14, 10].map((w, i) => (
                <th key={i} className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 rounded bg-gray-200" style={{ width: `${w * 4}px` }} /></th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i} className="text-sm">
                {[20, 26, 14, 12, 14, 10].map((w, j) => (
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

  const rows = Array.isArray(store?.prayerRequests) ? store.prayerRequests : [];

  if (!rows.length) {
    const filters = store?.prayerFilters || {};
    const reason = resolveEmptyReason({
      search: filters.search,
      filters,
      filterDefaults: { status: "", category: "" },
    });
    const recovery = buildRecoveryActions(reason, {
      onClearSearch: clearSearch,
      onClearFilters: clearFilters,
    });
    const isZero = reason === "zero";
    const showAdd = isZero && onCreate;

    return (
      <EmptyState
        illustration={isZero ? "memberCare" : "search"}
        title={isZero ? "No prayer requests yet" : "No prayer requests found"}
        description={isZero
          ? "Record the first prayer request to start tracking the church's prayer list."
          : "We couldn't find any prayer requests matching your current search or filters."}
        actionLabel={showAdd ? "New Prayer Request" : recovery?.actionLabel}
        onAction={showAdd ? () => guarded(onCreate, "memberCare", "create") : recovery?.onAction}
        secondaryLabel={showAdd ? null : recovery?.secondaryLabel}
        onSecondary={showAdd ? null : recovery?.onSecondary}
      />
    );
  }

  const requesterLabel = (row) =>
    row?.member ? memberName(row.member) : row?.requesterName || "—";

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
              <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Requested By</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Request</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Category</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Answered</th>
              <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => {
              const name = requesterLabel(row);
              return (
                <tr key={row?._id ?? `row-${index}`} className="max-md:text-xs text-gray-700 text-sm">
                  <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={name}>
                    <span className="sm:hidden">{truncateMobileName(name)}</span>
                    <span className="hidden sm:inline">{truncateDesktopName(name)}</span>
                  </td>
                  <td className="max-md:px-4 py-1.5 px-4 md:px-6">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate max-w-[260px] text-gray-700">{row?.request || "—"}</span>
                      {row?.isPrivate ? (
                        <span title="Private — visible to church admin only" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 text-amber-600">
                            <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6">{labelFor(PRAYER_CATEGORIES, row?.category)}</td>
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6"><Chip value={row?.status} label={labelFor(PRAYER_STATUSES, row?.status)} /></td>
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{formatDate(row?.answeredDate) || <span className="text-gray-300 text-xs">—</span>}</td>
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                    <TableKebabMenu items={[
                      { label: "View", onClick: () => setViewRow(row) },
                      row?.status !== "answered" && { label: "Mark Answered", onClick: () => guarded(() => markAnswered(row), "memberCare", "update") },
                      { label: "Edit", onClick: () => guarded(() => onEdit?.(row), "memberCare", "update") },
                      { label: "Delete", danger: true, onClick: () => guarded(() => setDeleteTarget(row), "memberCare", "delete") },
                    ]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        pagination={store?.prayerPagination}
        rowsCount={rows.length}
        limit={store?.prayerFilters?.limit}
        onLimitChange={onLimitChange}
        onPageChange={onPageChange}
        itemName="prayer requests"
        filtered={Boolean(
          String(store?.prayerFilters?.search || "").trim() ||
            store?.prayerFilters?.status ||
            store?.prayerFilters?.category
        )}
      />

      {viewRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 md:px-6 py-4">
              <div>
                <div className="font-semibold text-gray-900 text-sm">{requesterLabel(viewRow)}</div>
                <div className="mt-0.5 font-mono text-xs text-gray-500">{viewRow?.referenceId || ""}</div>
              </div>
              <button type="button" onClick={() => setViewRow(null)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="font-semibold text-gray-500 text-xs">Category</div><div className="mt-1 text-gray-900">{labelFor(PRAYER_CATEGORIES, viewRow?.category)}</div></div>
                <div><div className="font-semibold text-gray-500 text-xs">Status</div><div className="mt-1"><Chip value={viewRow?.status} label={labelFor(PRAYER_STATUSES, viewRow?.status)} /></div></div>
                <div><div className="font-semibold text-gray-500 text-xs">Submitted</div><div className="mt-1 text-gray-900">{formatDate(viewRow?.createdAt)}</div></div>
                <div><div className="font-semibold text-gray-500 text-xs">Answered</div><div className="mt-1 text-gray-900">{formatDate(viewRow?.answeredDate) || "—"}</div></div>
              </div>
              <div><div className="font-semibold text-gray-500 text-xs">Request</div><div className="mt-1 text-gray-700 whitespace-pre-wrap">{viewRow?.request || "—"}</div></div>
              {viewRow?.answerNote ? (
                <div><div className="font-semibold text-gray-500 text-xs">Answer Note</div><div className="mt-1 text-gray-700 whitespace-pre-wrap">{viewRow.answerNote}</div></div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="font-semibold text-gray-900 text-sm mb-2">Delete this prayer request?</div>
            <p className="text-xs text-gray-400 mb-5">This will permanently remove the request.</p>
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

export default PrayerRequestTable;
