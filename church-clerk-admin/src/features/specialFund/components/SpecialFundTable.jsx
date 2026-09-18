import { useContext, useMemo, useState } from "react";
import PermissionContext from "../../Permissions/permission.store.js";
import SpecialFundContext from "../specialFund.store.js";
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

function SpecialFundTable({ onEdit, onDeleted }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(SpecialFundContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [viewRow, setViewRow] = useState(null);

  const canEdit = useMemo(() => (typeof can === "function" ? can("specialFunds", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("specialFunds", "delete") : false), [can]);

  const onPrev = async () => {
    const prevPage = store?.pagination?.prevPage;
    if (!prevPage) return;
    await store?.fetchSpecialFunds({ page: prevPage });
  };

  const onNext = async () => {
    const nextPage = store?.pagination?.nextPage;
    if (!nextPage) return;
    await store?.fetchSpecialFunds({ page: nextPage });
  };

  const onDelete = async (id) => {
    await store?.deleteSpecialFund(id);
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

  const rows = Array.isArray(store?.specialFunds) ? store.specialFunds : [];

  if (!rows.length) {
    return <div className="p-5 text-sm text-gray-600">No specialFund record found.</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left text-xs font-semibold text-gray-500">
              <th className="px-6 py-2">Giver Name</th>
              <th className="px-6 py-2">Category</th>
              <th className="px-6 py-2">Amount</th>
              <th className="px-6 py-2">Date</th>
              <th className="px-6 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((fund, index) => (
              <tr key={fund?._id ?? `row-${index}`} className="text-sm text-gray-700">
                <td className="px-6 py-1.5 text-gray-700" title={fund?.giverName || ""}>
                  <span className="sm:hidden">{truncateMobileName(fund?.giverName)}</span>
                  <span className="hidden sm:inline">{truncateDesktopName(fund?.giverName)}</span>
                </td>
                <td className="px-6 py-1.5 text-gray-900" title={fund?.category || ""}>
                  <span className="sm:hidden">{truncateMobileName(fund?.category)}</span>
                  <span className="hidden sm:inline">{truncateDesktopName(fund?.category)}</span>
                </td>
                <td className="px-6 py-1.5 text-blue-700">{formatMoney(fund?.totalAmount || 0, currency)}</td>
                <td className="px-6 py-1.5">{formatDate(fund?.givingDate)}</td>
                <td className="px-6 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setViewRow(fund)} className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs">View</button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!fund?._id) return;
                          onEdit?.(fund);
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
                          if (!fund?._id) return;
                          openConfirmDelete(fund._id);
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
        title="Delete Fund"
        onCancel={closeConfirmDelete}
        onConfirm={confirmDelete}
      />

      {viewRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto" onClick={() => setViewRow(null)}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div className="font-semibold text-gray-900 text-sm">Record Details</div>
              <button type="button" onClick={() => setViewRow(null)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              <div>
                <div className="text-xs font-semibold text-gray-500">Giver Name</div>
                <div className="mt-1 text-gray-900">{viewRow?.giverName || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Category</div>
                <div className="mt-1 text-gray-900">{viewRow?.category || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Amount</div>
                <div className="mt-1 text-gray-900">{formatMoney(viewRow?.amount || viewRow?.totalAmount || 0, currency)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Date</div>
                <div className="mt-1 text-gray-900">{formatDate(viewRow?.date || viewRow?.givingDate)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Note</div>
                <div className="mt-1 text-gray-900 whitespace-pre-wrap">{viewRow?.note || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SpecialFundTable;
