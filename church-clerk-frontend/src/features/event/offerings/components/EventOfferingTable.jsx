import { useContext, useMemo, useState } from "react";
import { formatMoney as _fm } from "../../../../shared/utils/formatMoney.js";
import Skeleton from "react-loading-skeleton";
import PermissionContext from "../../../permissions/permission.store.js";
import EventOfferingContext from "../eventOfferings.store.js";
import ChurchContext from "../../../church/church.store.js";
import TableKebabMenu from "../../../../shared/components/TableKebabMenu/index.jsx";
import EmptyState from "../../../../shared/components/EmptyState/index.jsx";
import { resolveEmptyReason, buildRecoveryActions } from "../../../../shared/utils/emptyState.js";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function EventOfferingTable({ onEdit, onCreate }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(EventOfferingContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewRow, setViewRow] = useState(null);

  const openView = (row) => { setViewRow(row); setViewOpen(true); };
  const closeView = () => { setViewOpen(false); setViewRow(null); };

  const canEdit = useMemo(() => (typeof can === "function" ? can("events", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("events", "delete") : false), [can]);
  const canCreate = useMemo(() => (typeof can === "function" ? can("events", "create") : false), [can]);

  const clearSearch = () => {
    store?.setFilters?.({ search: "", page: 1 });
    store?.fetchOfferings?.({ search: "", page: 1 });
  };
  const clearFilters = () => {
    store?.setFilters?.({ offeringType: "", page: 1 });
    store?.fetchOfferings?.({ offeringType: "", page: 1 });
  };
  const clearDate = () => {
    store?.setFilters?.({ dateFrom: "", dateTo: "", page: 1 });
    store?.fetchOfferings?.({ dateFrom: "", dateTo: "", page: 1 });
  };

  const onPrev = async () => {
    const prevPage = store?.pagination?.prevPage;
    if (!prevPage) return;
    await store?.fetchOfferings?.({ page: prevPage });
  };

  const onNext = async () => {
    const nextPage = store?.pagination?.nextPage;
    if (!nextPage) return;
    await store?.fetchOfferings?.({ page: nextPage });
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
    await store?.deleteOffering?.(id);
  };

  if (store?.loading) {
    return (
      <div className="overflow-x-auto animate-pulse">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left font-semibold text-gray-500 text-xs">
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-16 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-11 rounded bg-gray-200 md:w-12" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-24 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-28 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i} className="text-sm">
                <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
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

  const rows = Array.isArray(store?.offerings) ? store.offerings : [];

  if (!rows.length) {
    const filters = store?.filters || {};
    const reason = resolveEmptyReason({
      search: filters.search,
      filters,
      filterDefaults: { offeringType: "" },
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    const recovery = buildRecoveryActions(reason, {
      onClearSearch: clearSearch,
      onClearFilters: clearFilters,
      onClearDate: clearDate,
    });
    const isZero = reason === "zero";
    const showAdd = isZero && canCreate && onCreate;
    return (
      <EmptyState
        illustration={isZero ? "offering" : "search"}
        title={isZero ? "No offerings yet" : "No offerings found"}
        description={isZero
          ? "Record the first offering collected for this event."
          : "We couldn't find any offerings matching your search or filters."}
        actionLabel={showAdd ? "Add Offering" : recovery?.actionLabel}
        onAction={showAdd ? onCreate : recovery?.onAction}
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
              <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Offering Type</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Amount</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Recorded By</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Ref ID</th>
              <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((offering, index) => (
              <tr key={offering?._id ?? `row-${index}`} className="max-md:text-xs text-gray-700 text-sm">
                <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">{offering?.offeringType || "-"}</td>
                <td className="max-md:px-4 py-1.5 text-blue-700 whitespace-nowrap px-4 md:px-6">{_fm(offering?.amount || 0, currency)}</td>
                <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{formatDate(offering?.offeringDate)}</td>
                <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6">{offering?.createdBy?.fullName || "—"}</td>
                <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                  {offering?.referenceId ? (
                    <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{offering.referenceId}</span>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                  <TableKebabMenu items={[
                    { label: "View", onClick: () => openView(offering) },
                    canEdit && { label: "Edit", onClick: () => { if (!offering?._id) return; onEdit?.(offering); } },
                    canDelete && { label: "Delete", onClick: () => { if (!offering?._id) return; openConfirmDelete(offering._id); }, danger: true }
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3 max-md:px-4 py-2 px-4 md:px-6">
        <button
          type="button"
          onClick={onPrev}
          disabled={!store?.pagination?.prevPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
        >
          Prev
        </button>
        <div className="text-gray-600 text-sm">Page {store?.pagination?.currentPage || 1}</div>
        <button
          type="button"
          onClick={onNext}
          disabled={!store?.pagination?.nextPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
        >
          Next
        </button>
      </div>

      {viewOpen && viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">Offering Details</div>
              <button type="button" onClick={closeView} className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 md:px-5 lg:px-6 py-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="font-semibold text-gray-500 text-xs">Offering Type</div>
                <div className="mt-1 font-semibold text-gray-900 text-sm">{viewRow?.offeringType || "—"}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="font-semibold text-gray-500 text-xs">Amount</div>
                <div className="mt-1 font-semibold text-blue-700 text-sm">{_fm(viewRow?.amount || 0, currency)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="font-semibold text-gray-500 text-xs">Date</div>
                <div className="mt-1 font-semibold text-gray-900 text-sm">{formatDate(viewRow?.offeringDate)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="font-semibold text-gray-500 text-xs">Recorded By</div>
                <div className="mt-1 font-semibold text-gray-900 text-sm">{viewRow?.createdBy?.fullName || "—"}</div>
              </div>
              {viewRow?.referenceId ? (
                <div className="col-span-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="font-semibold text-gray-500 text-xs">Ref ID</div>
                  <div className="mt-1 font-mono text-gray-700 text-xs">{viewRow.referenceId}</div>
                </div>
              ) : null}
              <div className="col-span-2 rounded-lg border border-gray-200 bg-white px-4 py-3">
                <div className="font-semibold text-gray-500 text-xs">Note</div>
                <div className="mt-1 text-gray-900 whitespace-pre-wrap text-sm">{viewRow?.note || "—"}</div>
              </div>
            </div>
            <div className="flex justify-end px-4 md:px-5 lg:px-6 py-4 border-t border-gray-200">
              <button type="button" onClick={closeView} className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">Delete Event Offering</div>
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

export default EventOfferingTable;
