import { useContext, useMemo, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import PermissionContext from "../../Permissions/permission.store.js";
import AttendanceContext from "../attendance.store.js";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function StatusChip({ value }) {
  const v = String(value || "").toLowerCase();

  const styles =
    v === "converted"
      ? "border-green-200 bg-green-50 text-green-700"
      : v === "visitor"
        ? "border-yellow-200 bg-yellow-50 text-yellow-700"
        : "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {v || "-"}
    </span>
  );
}

function VisitorTable({ onEdit, onDeleted }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(AttendanceContext);
  const { toPage } = useDashboardNavigator();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const [menuOpenId, setMenuOpenId] = useState(null);

  const [convertOpen, setConvertOpen] = useState(false);
  const [convertRow, setConvertRow] = useState(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [detailsVisitor, setDetailsVisitor] = useState(null);

  const canEdit = useMemo(() => (typeof can === "function" ? can("visitors", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("visitors", "delete") : false), [can]);
  const canCreateMember = useMemo(() => (typeof can === "function" ? can("members", "create") : false), [can]);

  const onPrev = async () => {
    const prevPage = store?.visitorPagination?.prevPage;
    if (!prevPage) return;
    await store?.fetchVisitors({ page: prevPage });
  };

  const onNext = async () => {
    const nextPage = store?.visitorPagination?.nextPage;
    if (!nextPage) return;
    await store?.fetchVisitors({ page: nextPage });
  };

  const onDelete = async (id) => {
    await store?.deleteVisitor(id);
    onDeleted?.();
  };

  const closeMenu = () => setMenuOpenId(null);

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

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsVisitor(null);
    setDetailsError(null);
  };

  const openDetails = async (row) => {
    if (!row?._id) return;
    setDetailsOpen(true);
    setDetailsError(null);
    setDetailsVisitor(null);
    setDetailsLoading(true);

    try {
      const res = await store?.getVisitor?.(row._id);
      const payload = res?.data?.data ?? res?.data;
      const visitor = payload?.visitor ?? payload;
      setDetailsVisitor(visitor || null);
    } catch (e) {
      setDetailsError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Failed to load visitor");
    } finally {
      setDetailsLoading(false);
    }
  };

  const openConvert = (row) => {
    setConvertRow(row || null);
    setConvertOpen(true);
  };

  const closeConvert = () => {
    setConvertOpen(false);
    setConvertRow(null);
  };

  const confirmConvert = async () => {
    const row = convertRow;
    closeConvert();
    if (!row?._id) return;

    const fullName = String(row?.fullName || "").trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "";
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

    toPage(
      "member-form",
      undefined,
      {
        state: {
          prefillMember: {
            firstName,
            lastName,
            phoneNumber: row?.phoneNumber || "",
            email: row?.email || "",
            city: row?.location || "",
            note: row?.note || "",
            status: "active",
            visitorId: row._id
          }
        }
      }
    );
  };

  if (store?.visitorLoading) {
    return <div className="p-5 text-sm text-gray-600">Loading...</div>;
  }

  if (store?.visitorError) {
    return (
      <div className="p-5">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{store.visitorError}</div>
      </div>
    );
  }

  const rows = Array.isArray(store?.visitors) ? store.visitors : [];

  if (!rows.length) {
    return <div className="p-5 text-sm text-gray-600">No visitor record found.</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left text-xs font-semibold text-gray-500">
              <th className="px-6 py-2">Full Name</th>
              <th className="px-6 py-2">Phone</th>
              <th className="px-6 py-2">Location</th>
              <th className="px-6 py-2">Invited By</th>
              <th className="px-6 py-2">Status</th>
              <th className="px-6 py-2">Date</th>
              <th className="px-6 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => (
              <tr key={row?._id ?? `row-${index}`} className="text-sm text-gray-700">
                <td className="px-6 py-1.5 text-gray-900">{row?.fullName || "-"}</td>
                <td className="px-6 py-1.5 text-gray-700">{row?.phoneNumber || "-"}</td>
                <td className="px-6 py-1.5 text-gray-700">{row?.location || "-"}</td>
                <td className="px-6 py-1.5 text-gray-700">{row?.invitedBy || "-"}</td>
                <td className="px-6 py-1.5 text-gray-700">
                  <StatusChip value={row?.status} />
                </td>
                <td className="px-6 py-1.5">{formatDate(row?.serviceDate)}</td>
                <td className="px-6 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openDetails(row)}
                      className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      view
                    </button>

                    {canCreateMember && (
                      <button
                        type="button"
                        onClick={() => {
                          if (row?.status === "converted") return;
                          openConvert(row);
                        }}
                        disabled={row?.status === "converted"}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {row?.status === "converted" ? "converted" : "convert"}
                      </button>
                    )}

                    {(canEdit || canDelete) && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setMenuOpenId((prev) => (prev === row?._id ? null : row?._id))}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          aria-label="More actions"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                            <path d="M12 5.5h.01M12 12h.01M12 18.5h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                          </svg>
                        </button>

                        {menuOpenId === row?._id && (
                          <div className="absolute right-0 z-20 mt-2 w-32 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  closeMenu();
                                  if (!row?._id) return;
                                  onEdit?.(row);
                                }}
                                className="block w-full px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                Edit
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => {
                                  closeMenu();
                                  if (!row?._id) return;
                                  openConfirmDelete(row._id);
                                }}
                                className="block w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-gray-50"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!store?.visitorPagination?.prevPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
        >
          Prev
        </button>
        <div className="text-sm text-gray-600">Page {store?.visitorPagination?.currentPage || 1}</div>
        <button
          type="button"
          onClick={onNext}
          disabled={!store?.visitorPagination?.nextPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <div className="text-sm font-semibold text-gray-900">Delete Visitor</div>
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
      )}

      {convertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <div className="text-sm font-semibold text-gray-900">Convert Visitor</div>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700">Do you want to convert this visitor to a member?</div>
            <div className="flex items-center justify-end gap-3 px-5 py-4">
              <button
                type="button"
                onClick={closeConvert}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmConvert}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <div className="text-lg font-semibold text-gray-900">{detailsVisitor?.fullName || "Visitor Details"}</div>
                <div className="mt-2">
                  <StatusChip value={detailsVisitor?.status} />
                </div>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5">
              {detailsLoading ? (
                <div className="text-sm text-gray-600">Loading...</div>
              ) : detailsError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{detailsError}</div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">Phone</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{detailsVisitor?.phoneNumber || "-"}</div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">Email</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{detailsVisitor?.email || "-"}</div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">Location</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{detailsVisitor?.location || "-"}</div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">Service</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{detailsVisitor?.serviceType || "-"}</div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">Service Date</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{formatDate(detailsVisitor?.serviceDate)}</div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">Invited By</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{detailsVisitor?.invitedBy || "-"}</div>
                  </div>

                  <div className="sm:col-span-2 rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">Note</div>
                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{detailsVisitor?.note || "-"}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={closeDetails}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VisitorTable;
