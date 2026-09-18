import { useContext, useMemo, useState } from "react";
import PermissionContext from "../../Permissions/permission.store.js";
import OfferingContext from "../offering.store.js";
import ChurchContext from "../../Church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import ConfirmDeleteModal from "../../../shared/components/ConfirmDeleteModal/index.jsx";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function OfferingTable({ onEdit, onDeleted }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(OfferingContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const canEdit = useMemo(() => (typeof can === "function" ? can("offerings", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("offerings", "delete") : false), [can]);

  const onPrev = async () => {
    const prevPage = store?.pagination?.prevPage;
    if (!prevPage) return;
    await store?.fetchOfferings({ page: prevPage });
  };

  const onNext = async () => {
    const nextPage = store?.pagination?.nextPage;
    if (!nextPage) return;
    await store?.fetchOfferings({ page: nextPage });
  };

  const onDelete = async (id) => {
    await store?.deleteOffering(id);
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

  if (store?.loading) {
    return (
      <div className="overflow-x-auto animate-pulse">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left text-xs font-semibold text-gray-500">
              <th className="px-4 py-2"><div className="h-3 w-16 rounded bg-gray-200" /></th>
              <th className="px-4 py-2"><div className="h-3 w-12 rounded bg-gray-200" /></th>
              <th className="px-4 py-2"><div className="h-3 w-10 rounded bg-gray-200" /></th>
              <th className="px-4 py-2"><div className="h-3 w-12 rounded bg-gray-200" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i}>
                <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-gray-200" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (store?.error) {
    return (
      <div className="p-5">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{store.error}</div>
      </div>
    );
  }

  const rows = Array.isArray(store?.offerings) ? store.offerings : [];

  if (!rows.length) {
    return <div className="p-5 text-sm text-gray-600">No offering record found.</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left text-xs font-semibold text-gray-500">
              <th className="px-6 py-2">Service Type</th>
              <th className="px-6 py-2">Offering Type</th>
              <th className="px-6 py-2">Amount</th>
              <th className="px-6 py-2">Date</th>
              <th className="px-6 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((offering, index) => (
              <tr key={offering?._id ?? `row-${index}`} className="text-sm text-gray-700">
                <td className="px-6 py-1.5 text-gray-900" title={offering?.serviceType || ""}>
                  <span className="sm:hidden">{truncateMobileName(offering?.serviceType)}</span>
                  <span className="hidden sm:inline">{truncateDesktopName(offering?.serviceType)}</span>
                </td>
                <td className="px-6 py-1.5 text-gray-700" title={offering?.offeringType || ""}>
                  <span className="sm:hidden">{truncateMobileName(offering?.offeringType)}</span>
                  <span className="hidden sm:inline">{truncateDesktopName(offering?.offeringType)}</span>
                </td>
                <td className="px-6 py-1.5 text-blue-700">{formatMoney(offering?.amount || 0, currency)}</td>
                <td className="px-6 py-1.5">{formatDate(offering?.serviceDate)}</td>
                <td className="px-6 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!offering?._id) return;
                          onEdit?.(offering);
                        }}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!offering?._id) return;
                          openConfirmDelete(offering._id);
                        }}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-gray-50"
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

      <div className="flex items-center justify-end gap-3 px-6 py-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!store?.pagination?.prevPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
        >
          Prev
        </button>
        <div className="text-sm text-gray-600">Page {store?.pagination?.currentPage || 1}</div>
        <button
          type="button"
          onClick={onNext}
          disabled={!store?.pagination?.nextPage}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <ConfirmDeleteModal
        open={confirmOpen}
        title="Delete Offering"
        onCancel={closeConfirmDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default OfferingTable;
