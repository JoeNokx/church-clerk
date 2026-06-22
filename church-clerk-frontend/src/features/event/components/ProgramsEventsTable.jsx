import { useContext, useMemo, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import Skeleton from "react-loading-skeleton";
import EventContext from "../event.store.js";
import PermissionContext from "../../permissions/permission.store.js";
import { deleteEvent as apiDeleteEvent } from "../services/event.api.js";

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

function ProgramsEventsTable({ status, onEdit }) {
  const store = useContext(EventContext);
  const { can } = useContext(PermissionContext) || {};
  const { toPage } = useDashboardNavigator();

  const [deletingId, setDeletingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);

  const canView = useMemo(() => (typeof can === "function" ? can("events", "view") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("events", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("events", "delete") : false), [can]);

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
      <div className="overflow-x-auto animate-pulse">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left font-semibold text-gray-500 text-xs">
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-16 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-11 rounded bg-gray-200 md:w-12" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i} className="text-sm">
                <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-12 rounded bg-gray-200" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!rows.length) {
    return <div className="p-4 text-gray-600 md:p-6 lg:p-8 text-sm">No event record found.</div>;
  }

  return (
    <div>
      {store?.loading ? (
        <div className="pt-3 px-4 md:px-6">
          <Skeleton height={12} width={120} />
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
              <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Title</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Time</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Venue</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Category</th>
              <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => (
              <tr key={row?._id ?? `row-${index}`} className="max-md:text-xs text-gray-700 text-sm">
                <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">{truncateTitle(row?.title || "-")}</td>
                <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{formatRange(row?.dateFrom, row?.dateTo)}</td>
                <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{formatTimeRange(row?.timeFrom, row?.timeTo, row?.time)}</td>
                <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{row?.venue || "-"}</td>
                <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{row?.category || "-"}</td>
                <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                  <div className="flex items-center justify-end gap-2">
                    {canView && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!row?._id) return;
                          toPage("event-details", { id: row._id }, { state: { from: "programs-events" } });
                        }}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                      >
                        View
                      </button>
                    )}

                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!row?._id) return;
                          onEdit?.(row);
                        }}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                      >
                        Edit
                      </button>
                    ) : null}

                    {canDelete ? (
                      <button
                        type="button"
                        disabled={deletingId === row?._id}
                        onClick={() => openConfirmDelete(row)}
                        className="rounded-md border border-red-200 bg-white px-3 py-1 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 text-xs"
                      >
                        {deletingId === row?._id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
