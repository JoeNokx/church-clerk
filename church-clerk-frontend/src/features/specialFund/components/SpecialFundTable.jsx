import { useContext, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import PermissionContext from "../../permissions/permission.store.js";
import SpecialFundContext from "../specialFund.store.js";
import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";

function truncateMobileName(name) {
  if (!name) return "-";
  const words = name.trim().split(/\s+/);
  if (words.length > 3 && name.length > 20) {
    return words.slice(0, 2).join(" ") + "\u2026";
  }
  return name;
}

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
  const [viewOpen, setViewOpen] = useState(false);
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
            <tr className="text-left font-semibold text-gray-500 text-xs">
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-16 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-11 rounded bg-gray-200 md:w-12" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-28 rounded bg-gray-200" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i} className="text-sm">
                <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
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

  const rows = Array.isArray(store?.specialFunds) ? store.specialFunds : [];

  if (!rows.length) {
    return <div className="p-4 text-gray-600 md:p-6 lg:p-8 text-sm">No specialFund record found.</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
              <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Giver Name</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Category</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Amount</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Recorded By</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Ref ID</th>
              <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((fund, index) => (
              <tr key={fund?._id ?? `row-${index}`} className="max-md:text-xs text-gray-700 text-sm">
                <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                  <span className="sm:hidden">{truncateMobileName(fund?.giverName)}</span>
                  <span className="hidden sm:inline">{fund?.giverName || "-"}</span>
                </td>
                <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{formatDate(fund?.givingDate)}</td>
                <td className="max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">{fund?.category || "-"}</td>
                <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{formatMoney(fund?.totalAmount || 0, currency)}</td>
                <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6">{fund?.createdBy?.fullName || "-"}</td>
                <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                  {fund?.referenceId ? (
                    <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{fund.referenceId}</span>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                  <TableKebabMenu items={[
                    { label: "View", onClick: () => { setViewRow(fund); setViewOpen(true); } },
                    canEdit && { label: "Edit", onClick: () => { if (!fund?._id) return; onEdit?.(fund); } },
                    canDelete && { label: "Delete", onClick: () => { if (!fund?._id) return; openConfirmDelete(fund._id); }, danger: true }
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
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 md:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">Special Fund Details</div>
              <button type="button" onClick={() => setViewOpen(false)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="font-semibold text-gray-500 text-xs">Giver Name</div><div className="mt-1 text-gray-900">{viewRow?.giverName || "-"}</div></div>
                <div><div className="font-semibold text-gray-500 text-xs">Category</div><div className="mt-1 text-gray-900">{viewRow?.category || "-"}</div></div>
                <div><div className="font-semibold text-gray-500 text-xs">Amount</div><div className="mt-1 text-gray-700 font-semibold">{formatMoney(viewRow?.totalAmount || 0, currency)}</div></div>
                <div><div className="font-semibold text-gray-500 text-xs">Date</div><div className="mt-1 text-gray-900">{formatDate(viewRow?.givingDate)}</div></div>
                <div><div className="font-semibold text-gray-500 text-xs">Recorded By</div><div className="mt-1 text-gray-900">{viewRow?.createdBy?.fullName || "-"}</div></div>
                <div><div className="font-semibold text-gray-500 text-xs">Ref ID</div><div className="mt-1 font-mono text-xs text-gray-500">{viewRow?.referenceId || "-"}</div></div>
              </div>
              <div><div className="font-semibold text-gray-500 text-xs">Description</div><div className="mt-1 text-gray-700">{viewRow?.description || "-"}</div></div>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">Delete Fund</div>
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

export default SpecialFundTable;
