import { useContext, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import PermissionContext from "../../permissions/permission.store.js";
import TitheContext from "../tithe.store.js";
import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import { resolveEmptyReason, buildRecoveryActions } from "../../../shared/utils/emptyState.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function memberName(member) {
  if (!member) return "-";
  const first = member?.firstName || "";
  const last = member?.lastName || "";
  const full = `${first} ${last}`.trim();
  return full || "-";
}

function truncateMobileName(name) {
  if (!name || name === "-") return name || "-";
  const words = name.trim().split(/\s+/);
  if (words.length > 3 && name.length > 20) {
    return words.slice(0, 2).join(" ") + "\u2026";
  }
  return name;
}

function TitheIndividualTable({ onEdit, onDeleted, onCreate }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(TitheContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const { toPage } = useDashboardNavigator();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const canEdit = useMemo(() => (typeof can === "function" ? can("tithe", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("tithe", "delete") : false), [can]);
  const canCreate = useMemo(() => (typeof can === "function" ? can("tithe", "create") : false), [can]);

  const rows = Array.isArray(store?.individuals) ? store.individuals : [];

  const clearSearch = () => store?.fetchIndividuals?.({ search: "", page: 1 });
  const clearDate = () => store?.fetchIndividuals?.({ dateFrom: "", dateTo: "", page: 1 });

  const onPrev = async () => {
    const prevPage = store?.individualPagination?.prevPage;
    if (!prevPage) return;
    await store?.fetchIndividuals?.({ page: prevPage });
  };

  const onNext = async () => {
    const nextPage = store?.individualPagination?.nextPage;
    if (!nextPage) return;
    await store?.fetchIndividuals?.({ page: nextPage });
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
    await store?.deleteTitheIndividual?.(id);
    onDeleted?.();
  };

  if (store?.loading) {
    return (
      <div className="overflow-x-auto animate-pulse">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left font-semibold text-gray-500 text-xs">
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-20 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-11 rounded bg-gray-200 md:w-12" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-20 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-24 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i} className="text-sm">
                <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                </td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-12 rounded bg-gray-200" /></td>
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

  if (!rows.length) {
    const filters = store?.individualFilters || {};
    const reason = resolveEmptyReason({
      search: filters.search,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });

    const recovery = buildRecoveryActions(reason, {
      onClearSearch: clearSearch,
      onClearDate: clearDate,
    });

    const isZero = reason === "zero";
    const title = isZero ? "No tithe records yet" : "No tithe records found";
    const description = isZero
      ? "Record your first tithe to start tracking individual contributions."
      : "We couldn't find any tithe records matching your current search or date range.";

    const showAdd = isZero && canCreate && onCreate;
    const actionLabel = showAdd ? "Record Tithe" : recovery?.actionLabel;
    const onAction = showAdd ? onCreate : recovery?.onAction;
    const secondaryLabel = showAdd ? null : recovery?.secondaryLabel;
    const onSecondary = showAdd ? null : recovery?.onSecondary;

    return (
      <EmptyState
        illustration={isZero ? "tithe" : "search"}
        title={title}
        description={description}
        actionLabel={actionLabel}
        onAction={onAction}
        secondaryLabel={secondaryLabel}
        onSecondary={onSecondary}
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
              <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Member Name</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Amount</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Payment Method</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Recorded By</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Ref ID</th>
              <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => (
              <tr
                key={row?._id ?? `row-${index}`}
                onClick={() => {
                  if (!row?._id) return;
                  const memberId = row?.member?._id || row?.member;
                  if (memberId) toPage("member-details", { id: memberId }, { state: { from: "tithe" } });
                }}
                className="max-md:text-xs text-gray-700 text-sm cursor-pointer hover:bg-blue-50/40 transition-colors"
              >
                <td className="sticky left-0 z-10 bg-inherit max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">
                  <div className="font-semibold text-gray-900">
                    <span className="sm:hidden">{truncateMobileName(memberName(row?.member))}</span>
                    <span className="hidden sm:inline">{memberName(row?.member)}</span>
                  </div>
                </td>
                <td className="max-md:px-4 py-3 text-blue-700 whitespace-nowrap px-4 md:px-6">{formatMoney(row?.amount || 0, currency)}</td>
                <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">{formatDate(row?.date)}</td>
                <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700 text-xs">
                    {row?.paymentMethod || "-"}
                  </span>
                </td>
                <td className="max-md:px-4 py-3 text-gray-600 whitespace-nowrap px-4 md:px-6">{row?.createdBy?.fullName || "—"}</td>
                <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">
                  {row?.referenceId ? (
                    <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{row.referenceId}</span>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6" onClick={(e) => e.stopPropagation()}>
                  <TableKebabMenu items={[
                    canEdit && {
                      label: "Edit",
                      onClick: () => { if (!row?._id) return; onEdit?.(row); }
                    },
                    canDelete && {
                      label: "Delete",
                      onClick: () => { if (!row?._id) return; openConfirmDelete(row._id); },
                      danger: true
                    }
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3 py-2 px-4 md:px-6">
        <button
          type="button"
          onClick={onPrev}
          disabled={!store?.individualPagination?.prevPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
        >
          Prev
        </button>
        <div className="text-gray-600 text-sm">Page {store?.individualPagination?.currentPage || 1}</div>
        <button
          type="button"
          onClick={onNext}
          disabled={!store?.individualPagination?.nextPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
        >
          Next
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">Delete Tithe</div>
            </div>
            <div className="px-4 md:px-5 lg:px-6 py-4 text-gray-700 text-sm">Are you sure you want to delete this record?</div>
            <div className="flex items-center justify-end gap-3 px-4 md:px-5 lg:px-6 py-4">
              <button
                type="button"
                onClick={closeConfirmDelete}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-red-700 text-sm"
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

export default TitheIndividualTable;
