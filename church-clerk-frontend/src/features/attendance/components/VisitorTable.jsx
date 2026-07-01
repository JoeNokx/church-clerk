import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import Skeleton from "react-loading-skeleton";
import PermissionContext from "../../permissions/permission.store.js";
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
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold ${styles} text-xs`}>
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
  const openMenuRootRef = useRef(null);

  const [convertOpen, setConvertOpen] = useState(false);
  const [convertRow, setConvertRow] = useState(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [detailsVisitor, setDetailsVisitor] = useState(null);

  const canView = useMemo(() => (typeof can === "function" ? can("visitors", "view") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("visitors", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("visitors", "delete") : false), [can]);
  const canConvert = useMemo(() => (typeof can === "function" ? can("visitors", "convert") : false), [can]);

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

  useEffect(() => {
    if (!menuOpenId) return;

    const onMouseDownCapture = (e) => {
      const root = openMenuRootRef.current;
      if (!root) {
        closeMenu();
        return;
      }

      if (root.contains(e.target)) return;
      closeMenu();
    };

    const onKeyDownCapture = (e) => {
      if (e.key === "Escape") closeMenu();
    };

    document.addEventListener("mousedown", onMouseDownCapture, true);
    document.addEventListener("keydown", onKeyDownCapture, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDownCapture, true);
      document.removeEventListener("keydown", onKeyDownCapture, true);
    };
  }, [menuOpenId]);

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
    return (
      <div className="overflow-x-auto animate-pulse">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left font-semibold text-gray-500 text-xs">
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-16 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-11 rounded bg-gray-200 md:w-12" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-11 rounded bg-gray-200 md:w-12" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i} className="text-sm">
                <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-12 rounded bg-gray-200" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (store?.visitorError) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{store.visitorError}</div>
      </div>
    );
  }

  const rows = Array.isArray(store?.visitors) ? store.visitors : [];

  if (!rows.length) {
    return <div className="p-4 text-gray-600 md:p-6 lg:p-8 text-sm">No visitor record found.</div>;
  }

  return (
    <div>
      <div className="relative overflow-x-auto pb-24">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
              <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Full Name</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Phone</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Location</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Invited By</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
              <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => (
              (() => {
                const rowId = String(row?._id ?? row?.id ?? "");
                const isMenuOpen = Boolean(rowId) && menuOpenId === rowId;
                const openUp = index > 1;

                return (
              <tr key={String(row?._id ?? row?.id ?? `row-${index}`)} className="max-md:text-xs text-gray-700 text-sm">
                <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">{row?.fullName || "-"}</td>
                <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{row?.phoneNumber || "-"}</td>
                <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{row?.location || "-"}</td>
                <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{row?.invitedBy || "-"}</td>
                <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                  <StatusChip value={row?.status} />
                </td>
                <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{formatDate(row?.serviceDate)}</td>
                <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                  <div className="flex items-center justify-end gap-2">
                    {canView && (
                      <button
                        type="button"
                        onClick={() => openDetails(row)}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                      >
                        view
                      </button>
                    )}

                    {canConvert && (
                      <button
                        type="button"
                        data-hq-action="true"
                        onClick={() => {
                          if (row?.status === "converted") return;
                          openConvert(row);
                        }}
                        disabled={row?.status === "converted"}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-blue-700 hover:bg-gray-50 disabled:opacity-50 text-xs"
                      >
                        {row?.status === "converted" ? "converted" : "convert"}
                      </button>
                    )}

                    {(canEdit || canDelete) && (
                      <div
                        ref={isMenuOpen ? openMenuRootRef : null}
                        className={`relative ${isMenuOpen ? "z-[9999]" : "z-0"}`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!rowId) return;
                            setMenuOpenId((prev) => (prev === rowId ? null : rowId));
                          }}
                          className="h-11 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-11 w-11 md:w-12"
                          aria-label="More actions"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                            <path d="M12 5.5h.01M12 12h.01M12 18.5h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                          </svg>
                        </button>

                        {isMenuOpen && (
                          <div
                            className={`absolute right-0 z-[9999] w-32 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg ${openUp ? "bottom-full mb-2" : "top-full mt-2"}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {canEdit && (
                              <button
                                type="button"
                                data-hq-action="true"
                                onClick={() => {
                                  closeMenu();
                                  const id = row?._id ?? row?.id;
                                  if (!id) return;
                                  onEdit?.(row);
                                }}
                                className="block w-full px-4 py-2 text-left font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                              >
                                Edit
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                data-hq-action="true"
                                onClick={() => {
                                  closeMenu();
                                  const id = row?._id ?? row?.id;
                                  if (!id) return;
                                  openConfirmDelete(id);
                                }}
                                className="block w-full px-4 py-2 text-left font-semibold text-red-600 hover:bg-gray-50 text-xs"
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
                );
              })()
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3 py-2 px-4 md:px-6">
        <button
          type="button"
          onClick={onPrev}
          disabled={!store?.visitorPagination?.prevPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
        >
          Prev
        </button>
        <div className="text-gray-600 text-sm">Page {store?.visitorPagination?.currentPage || 1}</div>
        <button
          type="button"
          onClick={onNext}
          disabled={!store?.visitorPagination?.nextPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
        >
          Next
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">Delete Visitor</div>
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

      {convertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">Convert Visitor</div>
            </div>
            <div className="px-4 md:px-5 lg:px-6 py-4 text-gray-700 text-sm">Do you want to convert this visitor to a member?</div>
            <div className="flex items-center justify-end gap-3 px-4 md:px-5 lg:px-6 py-4">
              <button
                type="button"
                onClick={closeConvert}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmConvert}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
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
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 py-4 md:py-5 lg:py-6 px-4 md:px-6">
              <div>
                <div className="font-semibold text-gray-900 text-lg">{detailsVisitor?.fullName || "Visitor Details"}</div>
                <div className="mt-2">
                  <StatusChip value={detailsVisitor?.status} />
                </div>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="py-4 md:py-5 lg:py-6 px-4 md:px-6">
              {detailsLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-5 w-40 rounded bg-gray-200" />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-[54px] w-full rounded-lg bg-gray-200" />
                    ))}
                    <div className="md:col-span-2">
                      <div className="h-[70px] w-full rounded-lg bg-gray-200" />
                    </div>
                  </div>
                </div>
              ) : detailsError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{detailsError}</div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="font-semibold text-gray-500 text-xs">Phone</div>
                    <div className="mt-1 font-semibold text-gray-900 text-sm">{detailsVisitor?.phoneNumber || "-"}</div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="font-semibold text-gray-500 text-xs">Email</div>
                    <div className="mt-1 font-semibold text-gray-900 text-sm">{detailsVisitor?.email || "-"}</div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="font-semibold text-gray-500 text-xs">Location</div>
                    <div className="mt-1 font-semibold text-gray-900 text-sm">{detailsVisitor?.location || "-"}</div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="font-semibold text-gray-500 text-xs">Service</div>
                    <div className="mt-1 font-semibold text-gray-900 text-sm">{detailsVisitor?.serviceType || "-"}</div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="font-semibold text-gray-500 text-xs">Service Date</div>
                    <div className="mt-1 font-semibold text-gray-900 text-sm">{formatDate(detailsVisitor?.serviceDate)}</div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="font-semibold text-gray-500 text-xs">Invited By</div>
                    <div className="mt-1 font-semibold text-gray-900 text-sm">{detailsVisitor?.invitedBy || "-"}</div>
                  </div>

                  <div className="md:col-span-2 rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <div className="font-semibold text-gray-500 text-xs">Note</div>
                    <div className="mt-1 text-gray-900 whitespace-pre-wrap text-sm">{detailsVisitor?.note || "-"}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 py-4 px-4 md:px-6">
              <button
                type="button"
                onClick={closeDetails}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
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
