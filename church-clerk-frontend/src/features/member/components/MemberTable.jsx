import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PermissionContext from "../../permissions/permission.store.js";
import MemberContext from "../member.store.js";

function StatusChip({ value }) {
  const v = String(value || "").toLowerCase();
  const styles =
    v === "active"
      ? "border-green-200 bg-green-50 text-green-700"
      : v === "inactive"
        ? "border-gray-200 bg-gray-50 text-gray-700"
        : v === "visitor"
          ? "border-yellow-200 bg-yellow-50 text-yellow-700"
          : v === "former"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-gray-200 bg-gray-50 text-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {v || "-"}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function MemberTable({ onEdit, onDeleted }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberContext);
  const navigate = useNavigate();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const canEdit = useMemo(() => (typeof can === "function" ? can("members", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("members", "delete") : false), [can]);

  const onPrev = async () => {
    const prevPage = store?.pagination?.prevPage;
    if (!prevPage) return;
    await store?.fetchMembers({ page: prevPage });
  };

  const onNext = async () => {
    const nextPage = store?.pagination?.nextPage;
    if (!nextPage) return;
    await store?.fetchMembers({ page: nextPage });
  };

  const onDelete = async (id) => {
    await store?.deleteMember(id);
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
    return <div className="p-5 text-sm text-gray-600">Loading...</div>;
  }

  if (store?.error) {
    return (
      <div className="p-5">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{store.error}</div>
      </div>
    );
  }

  const rows = Array.isArray(store?.members) ? store.members : [];

  if (!rows.length) {
    return <div className="p-5 text-sm text-gray-600">No member record found.</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left text-xs font-semibold text-gray-500">
              <th className="px-6 py-2">Name</th>
              <th className="px-6 py-2">Phone</th>
              <th className="px-6 py-2">Email</th>
              <th className="px-6 py-2">City</th>
              <th className="px-6 py-2">Status</th>
              <th className="px-6 py-2">Date Registered</th>
              <th className="px-6 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => {
              const name = row?.fullName || [row?.firstName, row?.lastName].filter(Boolean).join(" ") || "-";

              return (
                <tr key={row?._id ?? `row-${index}`} className="text-sm text-gray-700">
                  <td className="px-6 py-1.5 text-gray-900">{name}</td>
                  <td className="px-6 py-1.5 text-gray-700">{row?.phoneNumber || "-"}</td>
                  <td className="px-6 py-1.5 text-gray-700">{row?.email || "-"}</td>
                  <td className="px-6 py-1.5 text-gray-700">{row?.city || "-"}</td>
                  <td className="px-6 py-1.5 text-gray-700">
                    <StatusChip value={row?.status} />
                  </td>
                  <td className="px-6 py-1.5">{formatDate(row?.createdAt || row?.dateJoined)}</td>
                  <td className="px-6 py-1.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!row?._id) return;
                          navigate(`/dashboard?page=member-details&id=${row._id}`, { state: { from: "members" } });
                        }}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        View
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!row?._id) return;
                            navigate(`/dashboard?page=member-form&id=${row._id}`);
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
                            if (!row?._id) return;
                            openConfirmDelete(row._id);
                          }}
                          className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-gray-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <div className="text-sm font-semibold text-gray-900">Delete Member</div>
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
    </div>
  );
}

export default MemberTable;
