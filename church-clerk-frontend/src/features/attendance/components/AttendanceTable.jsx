import { useContext, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import PermissionContext from "../../permissions/permission.store.js";
import AttendanceContext from "../attendance.store.js";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateWithDay(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = d.toLocaleDateString(undefined, { weekday: "short" });
  const date = d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  return `${day}, ${date}`;
}

function truncateSpeaker(name) {
  if (!name) return "-";
  return name.length > 20 ? name.slice(0, 20) + "…" : name;
}

function AttendanceTable({ onEdit, onDeleted }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(AttendanceContext);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const canEdit = useMemo(() => (typeof can === "function" ? can("attendance", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("attendance", "delete") : false), [can]);

  const onPrev = async () => {
    const prevPage = store?.attendancePagination?.prevPage;
    if (!prevPage) return;
    await store?.fetchAttendances({ page: prevPage });
  };

  const onNext = async () => {
    const nextPage = store?.attendancePagination?.nextPage;
    if (!nextPage) return;
    await store?.fetchAttendances({ page: nextPage });
  };

  const onDelete = async (id) => {
    await store?.deleteAttendance(id);
    onDeleted?.();
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
    await onDelete(id);
  };

  if (store?.attendanceLoading) {
    return (
      <div className="overflow-x-auto animate-pulse">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left font-semibold text-gray-500 text-xs">
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-16 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-11 rounded bg-gray-200 md:w-12" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-20 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-11 rounded bg-gray-200 md:w-12" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i} className="text-sm">
                <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-12 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-12 rounded bg-gray-200" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (store?.attendanceError) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{store.attendanceError}</div>
      </div>
    );
  }

  const rows = Array.isArray(store?.attendances) ? store.attendances : [];

  if (!rows.length) {
    return <div className="p-4 text-gray-600 md:p-6 lg:p-8 text-sm">No attendance record found.</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
              <th className="sticky left-0 z-20 bg-slate-100 py-2 whitespace-nowrap px-3 md:px-6">Date</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Service Type</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Main Speaker</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Total</th>
              <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => (
              <tr key={row?._id ?? `row-${index}`} className="max-md:text-xs text-gray-700 text-sm">
                <td className="sticky left-0 z-10 bg-white py-1.5 text-gray-900 whitespace-nowrap px-3 md:px-6">{formatDateWithDay(row?.serviceDate)}</td>
                <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{row?.serviceType || "-"}</td>
                <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{truncateSpeaker(row?.mainSpeaker)}</td>
                <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{Number(row?.totalNumber || 0).toLocaleString()}</td>
                <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                  <div className="flex items-center justify-end gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        data-hq-action="true"
                        onClick={() => {
                          if (!row?._id) return;
                          onEdit?.(row);
                        }}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                      >
                        Edit
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        data-hq-action="true"
                        onClick={() => {
                          if (!row?._id) return;
                          openConfirmDelete(row._id);
                        }}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-red-600 hover:bg-gray-50 text-xs"
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

      <div className="flex items-center justify-end gap-3 py-2 px-4 md:px-6">
        <button
          type="button"
          onClick={onPrev}
          disabled={!store?.attendancePagination?.prevPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
        >
          Prev
        </button>
        <div className="text-gray-600 text-sm">Page {store?.attendancePagination?.currentPage || 1}</div>
        <button
          type="button"
          onClick={onNext}
          disabled={!store?.attendancePagination?.nextPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
        >
          Next
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">Delete Attendance</div>
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

export default AttendanceTable;
