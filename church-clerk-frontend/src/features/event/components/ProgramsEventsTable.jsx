import { useContext, useMemo, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
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

function ProgramsEventsTable({ status, onEdit }) {
  const store = useContext(EventContext);
  const { can } = useContext(PermissionContext) || {};
  const { toPage } = useDashboardNavigator();

  const [deletingId, setDeletingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);

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
      <div className="p-5">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{store.error}</div>
      </div>
    );
  }

  const rows = Array.isArray(store?.events) ? store.events : [];

  if (store?.loading && !rows.length) {
    return <div className="p-5 text-sm text-gray-600">Loading...</div>;
  }

  if (!rows.length) {
    return <div className="p-5 text-sm text-gray-600">No event record found.</div>;
  }

  return (
    <div>
      {store?.loading ? <div className="px-6 pt-3 text-xs font-semibold text-gray-500">Loading...</div> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left text-xs font-semibold text-gray-500">
              <th className="px-6 py-2">Title</th>
              <th className="px-6 py-2">Category</th>
              <th className="px-6 py-2">Date</th>
              <th className="px-6 py-2">Time</th>
              <th className="px-6 py-2">Venue</th>
              <th className="px-6 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => (
              <tr key={row?._id ?? `row-${index}`} className="text-sm text-gray-700">
                <td className="px-6 py-1.5 text-gray-900">{row?.title || "-"}</td>
                <td className="px-6 py-1.5 text-gray-700">{row?.category || "-"}</td>
                <td className="px-6 py-1.5 text-gray-700">{formatRange(row?.dateFrom, row?.dateTo)}</td>
                <td className="px-6 py-1.5 text-gray-700">{formatTimeRange(row?.timeFrom, row?.timeTo, row?.time)}</td>
                <td className="px-6 py-1.5 text-gray-700">{row?.venue || "-"}</td>
                <td className="px-6 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!row?._id) return;
                        toPage("event-details", { id: row._id }, { state: { from: "programs-events" } });
                      }}
                      className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      View
                    </button>

                    {canEdit ? (
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
                    ) : null}

                    {canDelete ? (
                      <button
                        type="button"
                        disabled={deletingId === row?._id}
                        onClick={() => openConfirmDelete(row)}
                        className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
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
            <div className="border-b border-gray-200 px-5 py-4">
              <div className="text-sm font-semibold text-gray-900">Delete Event</div>
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
      ) : null}

      <div className="flex items-center justify-end gap-3 px-6 py-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={store?.loading || !store?.pagination?.prevPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
        >
          Prev
        </button>
        <div className="text-sm text-gray-600">Page {store?.pagination?.currentPage || 1}</div>
        <button
          type="button"
          onClick={onNext}
          disabled={store?.loading || !store?.pagination?.nextPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default ProgramsEventsTable;
