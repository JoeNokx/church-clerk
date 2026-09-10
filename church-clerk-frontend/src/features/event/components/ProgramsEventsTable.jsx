import { useContext, useMemo, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import Skeleton from "react-loading-skeleton";
import EventContext from "../event.store.js";
import PermissionContext from "../../permissions/permission.store.js";
import { deleteEvent as apiDeleteEvent } from "../services/event.api.js";

import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import Card from "../../../shared/components/Card/index.jsx";
import { resolveEmptyReason, buildRecoveryActions } from "../../../shared/utils/emptyState.js";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatRange(from, to) {
  const start = formatDate(from);
  const end = formatDate(to);
  if (!start && !end) return "-";
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

function formatTimeRange(from, to, legacy) {
  const f = String(from || "").trim();
  const t = String(to || "").trim();
  if (f && t) return `${f} - ${t}`;
  if (f) return f;
  if (t) return t;
  if (!legacy) return "-";
  return String(legacy);
}

function truncateTitle(title) {
  if (!title || title === "-") return title;
  const words = title.trim().split(/\s+/);
  if (title.length > 20 && words.length > 2) {
    return `${words[0]} ${words[1]}\u2026`;
  }
  return title;
}

function ProgramsEventsTable({ status, onEdit, onCreate }) {
  const store = useContext(EventContext);
  const { can } = useContext(PermissionContext) || {};
  const { toPage } = useDashboardNavigator();

  const [deletingId, setDeletingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);

  const canView = useMemo(() => (typeof can === "function" ? can("events", "view") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("events", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("events", "delete") : false), [can]);
  const canCreate = useMemo(() => (typeof can === "function" ? can("events", "create") : false), [can]);

  const clearSearch = () => {
    store?.setFilters?.({ search: "", page: 1 });
    store?.fetchEvents?.({ status, search: "", page: 1 });
  };
  const clearFilters = () => {
    store?.setFilters?.({ category: "", page: 1 });
    store?.fetchEvents?.({ status, category: "", page: 1 });
  };

  const onPrev = async () => {
    const prevPage = store?.pagination?.prevPage;
    if (!prevPage) return;
    await store?.fetchEvents?.({ status, page: prevPage });
  };

  const onNext = async () => {
    const nextPage = store?.pagination?.nextPage;
    if (!nextPage) return;
    await store?.fetchEvents?.({ status, page: nextPage });
  };

  const onDelete = async (row) => {
    const id = row?._id;
    if (!id) return;
    if (!canDelete) return;

    try {
      setDeletingId(id);
      await apiDeleteEvent(id);
      await store?.fetchEventStats?.({ force: true });
      await store?.fetchEvents?.({ status, page: store?.pagination?.currentPage || 1, force: true });
    } finally {
      setDeletingId(null);
    }
  };

  const openConfirmDelete = (row) => {
    setConfirmRow(row || null);
    setConfirmOpen(true);
  };

  const closeConfirmDelete = () => {
    setConfirmOpen(false);
    setConfirmRow(null);
  };

  const confirmDelete = async () => {
    const row = confirmRow;
    closeConfirmDelete();
    if (!row?._id) return;
    await onDelete(row);
  };

  if (store?.error) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{store.error}</div>
      </div>
    );
  }

  const rows = Array.isArray(store?.events) ? store.events : [];

  if (store?.loading && !rows.length) {
    return (
      <div className="p-4 md:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gray-200" />
              <div className="flex-1">
                <div className="h-4 w-3/4 rounded bg-gray-200 mb-2" />
                <div className="h-3 w-1/3 rounded bg-gray-200" />
              </div>
            </div>
            <div className="h-3 w-2/3 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
            <div className="mt-auto pt-2 border-t border-gray-100">
              <div className="flex justify-end">
                <div className="h-7 w-24 rounded-lg bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!rows.length) {
    const filters = store?.filters || {};
    const reason = resolveEmptyReason({
      search: filters.search,
      filters,
      filterDefaults: { category: "" },
    });

    const recovery = buildRecoveryActions(reason, {
      onClearSearch: clearSearch,
      onClearFilters: clearFilters,
    });

    const isZero = reason === "zero";
    const statusLabel = status === "past" ? "past events" : status === "ongoing" ? "ongoing events" : "upcoming events";
    const title = isZero ? `No ${statusLabel} yet` : `No ${statusLabel} found`;
    const description = isZero
      ? "Create your first event to start building your church calendar."
      : "We couldn't find any events matching your current search or filters.";

    const showAdd = isZero && canCreate && onCreate;
    const actionLabel = showAdd ? "Create Event" : recovery?.actionLabel;
    const onAction = showAdd ? onCreate : recovery?.onAction;
    const secondaryLabel = showAdd ? null : recovery?.secondaryLabel;
    const onSecondary = showAdd ? null : recovery?.onSecondary;

    return (
      <EmptyState
        illustration={isZero ? "events" : "search"}
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
      {store?.loading ? (
        <div className="pt-3 px-4 md:px-6">
          <Skeleton height={12} width={120} />
        </div>
      ) : null}
      <div className="p-4 md:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((row, index) => {
          const dateStr = formatRange(row?.dateFrom, row?.dateTo);
          const timeStr = formatTimeRange(row?.timeFrom, row?.timeTo, row?.time);
          const venueStr = row?.venue || "Not Specified";
          const catStr = row?.category || "";

          const metaItems = [];
          metaItems.push({
            icon: <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
            label: `${dateStr || "Not Specified"}${timeStr && timeStr !== "Not Specified" ? ` · ${timeStr}` : ""}`,
          });
          metaItems.push({
            icon: <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" /></svg>,
            label: venueStr,
          });

          return (
            <Card key={row?._id ?? `card-${index}`}>
              <Card.Header
                title={row?.title || "Not Specified"}
                badge={catStr ? catStr : null}
                badgeClass="bg-blue-50 text-blue-700 capitalize"
                actions={
                  <>
                    {canEdit ? (
                      <button onClick={() => { if (row?._id) onEdit?.(row); }} className="cck-allow-icons h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button onClick={() => openConfirmDelete(row)} disabled={deletingId === row?._id} className="cck-allow-icons h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 disabled:opacity-50">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    ) : null}
                  </>
                }
              />
              <Card.Meta items={[metaItems[0]]} />
              {metaItems[1] ? (
                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                  {metaItems[1].icon}
                  {metaItems[1].label}
                </div>
              ) : null}
              <Card.Footer>
                {canView ? (
                  <Card.ViewDetailsLink
                    onClick={() => { if (row?._id) toPage("event-details", { id: row._id }, { state: { from: "programs-events" } }); }}
                  />
                ) : null}
              </Card.Footer>
            </Card>
          );
        })}
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">Delete Event</div>
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
      ) : null}

      <div className="flex items-center justify-end gap-3 py-2 px-4 md:px-6">
        <button
          type="button"
          onClick={onPrev}
          disabled={store?.loading || !store?.pagination?.prevPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
        >
          Prev
        </button>
        <div className="text-gray-600 text-sm">Page {store?.pagination?.currentPage || 1}</div>
        <button
          type="button"
          onClick={onNext}
          disabled={store?.loading || !store?.pagination?.nextPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default ProgramsEventsTable;
