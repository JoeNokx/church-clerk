import { useContext, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import Skeleton from "react-loading-skeleton";
import PermissionContext from "../../permissions/permission.store.js";
import MemberContext from "../member.store.js";
import StatusChip from "../../../shared/components/StatusChip/index.jsx";
import { updateMember as apiUpdateMember } from "../services/member.api.js";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import { resolveEmptyReason, buildRecoveryActions } from "../../../shared/utils/emptyState.js";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Dormant", value: "dormant" },
  { label: "Transferred", value: "transferred" },
  { label: "Left Church", value: "left_church" },
  { label: "Deceased", value: "deceased" },
  { label: "Temporarily Away", value: "temporarily_away" },
];

const CHIP_STYLES = {
  active: "border-green-200 bg-green-50 text-green-700",
  dormant: "border-gray-200 bg-gray-100 text-gray-600",
  transferred: "border-blue-200 bg-blue-50 text-blue-700",
  left_church: "border-orange-200 bg-orange-50 text-orange-700",
  deceased: "border-red-200 bg-red-50 text-red-700",
  temporarily_away: "border-yellow-200 bg-yellow-50 text-yellow-700",
  inactive: "border-gray-200 bg-gray-50 text-gray-700",
  visitor: "border-yellow-200 bg-yellow-50 text-yellow-700",
  former: "border-red-200 bg-red-50 text-red-700",
};

const CHIP_LABELS = {
  left_church: "Left Church",
  temporarily_away: "Temporarily Away",
};

function InlineStatusPicker({ row, onUpdate, updating }) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: null, bottom: null, left: 0 });
  const btnRef = useRef(null);
  const v = String(row?.status || "").toLowerCase().replace(/\s+/g, "_");
  const chipStyles = CHIP_STYLES[v] || "border-gray-200 bg-gray-50 text-gray-700";
  const label = CHIP_LABELS[v] || row?.status || "-";
  const isUpdating = updating === row?._id;

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const estimatedHeight = STATUS_OPTIONS.length * 32 + 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const flipped = spaceBelow < estimatedHeight + 8;
      if (flipped) {
        setMenuPos({ top: null, bottom: window.innerHeight - rect.top + 4, left: rect.left });
      } else {
        setMenuPos({ top: rect.bottom + 4, bottom: null, left: rect.left });
      }
      setOpenUp(flipped);
    }
    setOpen((o) => !o);
  };

  return (
    <div className="inline-block">
      <button
        ref={btnRef}
        type="button"
        disabled={isUpdating}
        onClick={handleOpen}
        className={`cck-allow-icons inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold text-xs cursor-pointer disabled:opacity-60 ${chipStyles}`}
      >
        {isUpdating ? (
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
        ) : null}
        {label}
        <svg viewBox="0 0 24 24" fill="none" className={`h-3 w-3 shrink-0 transition-transform${open && openUp ? " rotate-180" : ""}`} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="z-[9999] w-44 rounded-lg border border-gray-200 bg-white shadow-xl py-1"
            style={menuPos.bottom != null ? { position: "fixed", bottom: menuPos.bottom, left: menuPos.left } : { position: "fixed", top: menuPos.top, left: menuPos.left }}
          >
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => { setOpen(false); onUpdate(row._id, s.value); }}
                className={`block w-full px-4 py-2 text-left text-xs font-medium hover:bg-gray-50 ${
                  s.value === v ? "text-blue-600 bg-blue-50" : "text-gray-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function truncateName(name) {
  if (!name || name === "-") return name;
  const parts = name.trim().split(/\s+/);
  if (name.length > 20 && parts.length > 2) {
    return `${parts[0]} ${parts[parts.length - 1]}`;
  }
  return name;
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function MemberTable({ onEdit, onDeleted, onCreate }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberContext);
  const { toPage } = useDashboardNavigator();

  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(null);

  const canView = useMemo(() => (typeof can === "function" ? can("members", "view") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("members", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("members", "delete") : false), [can]);
  const canCreate = useMemo(() => (typeof can === "function" ? can("members", "create") : false), [can]);

  const clearSearch = () => {
    store?.setFilters?.({ search: "", page: 1 });
    store?.fetchMembers?.({ search: "", page: 1 });
  };
  const clearFilters = () => {
    store?.setFilters?.({ status: "all", ageGroup: "all", page: 1 });
    store?.fetchMembers?.({ status: "all", ageGroup: "all", page: 1 });
  };
  const clearDate = () => {
    store?.setFilters?.({ dateFrom: "", dateTo: "", page: 1 });
    store?.fetchMembers?.({ dateFrom: "", dateTo: "", page: 1 });
  };

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

  const updateStatus = async (memberId, newStatus) => {
    setStatusUpdating(memberId);
    try {
      await apiUpdateMember(memberId, { status: newStatus });
      await store?.fetchMembers();
      queryClient.invalidateQueries({ queryKey: ["members", "kpi"], exact: false });
    } catch (_) {}
    finally { setStatusUpdating(null); }
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
    return (
      <div className="overflow-x-auto animate-pulse">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left font-semibold text-gray-500 text-xs">
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-11 rounded bg-gray-200 md:w-12" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 rounded bg-gray-200 md:w-11 w-11 md:w-12" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-11 rounded bg-gray-200 md:w-12" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-16 rounded bg-gray-200" /></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i} className="text-sm">
                <td className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">
                  <div className="flex items-center gap-3">
                    <div className="h-11 rounded-full bg-gray-200 md:h-12 md:w-11 w-11 md:w-12" />
                    <div className="h-4 w-24 rounded bg-gray-200" />
                  </div>
                </td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
                <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
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

  const rows = Array.isArray(store?.members) ? store.members : [];

  if (!rows.length) {
    const filters = store?.filters || {};
    const reason = resolveEmptyReason({
      search: filters.search,
      filters,
      filterDefaults: { status: "all", ageGroup: "all" },
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });

    const recovery = buildRecoveryActions(reason, {
      onClearSearch: clearSearch,
      onClearFilters: clearFilters,
      onClearDate: clearDate,
    });

    const isZero = reason === "zero";
    const title = isZero ? "No members yet" : "No members found";
    const description = isZero
      ? "Add your first member to start building your church directory."
      : "We couldn't find any members matching your current search or filters.";

    const showAdd = isZero && canCreate && onCreate;
    const actionLabel = showAdd ? "Add Member" : recovery?.actionLabel;
    const onAction = showAdd ? onCreate : recovery?.onAction;
    const secondaryLabel = showAdd ? null : recovery?.secondaryLabel;
    const onSecondary = showAdd ? null : recovery?.onSecondary;

    return (
      <EmptyState
        illustration={isZero ? "members" : "search"}
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
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
              <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Name</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Phone</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Age Group</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">City</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date Added</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, index) => {
              const name = row?.fullName || [row?.firstName, row?.lastName].filter(Boolean).join(" ") || "-";
              const displayName = truncateName(name);

              return (
                <tr key={row?._id ?? `row-${index}`} className="max-md:text-xs text-gray-700 text-sm">
                  <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">{displayName}</td>
                  <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{row?.phoneNumber || <span className="text-gray-400 italic">Not Specified</span>}</td>
                  <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6 capitalize">{row?.ageGroup || <span className="text-gray-400 italic">Not Specified</span>}</td>
                  <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{row?.city || <span className="text-gray-400 italic">Not Specified</span>}</td>
                  <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                    {canEdit ? (
                      <InlineStatusPicker row={row} onUpdate={updateStatus} updating={statusUpdating} />
                    ) : (
                      <StatusChip value={row?.status} />
                    )}
                  </td>
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{formatDate(row?.createdAt || row?.dateJoined)}</td>
                  <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                    <TableKebabMenu items={[
                      canView && { label: "View", onClick: () => { if (!row?._id) return; toPage("member-details", { id: row._id }, { state: { from: "members" } }); } },
                      canEdit && { label: "Edit", onClick: () => { if (!row?._id) return; toPage("member-form", { id: row._id }); } },
                      canDelete && { label: "Delete", onClick: () => { if (!row?._id) return; openConfirmDelete(row._id); }, danger: true }
                    ]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3 px-4 md:px-6 py-3">
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

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">Delete Member</div>
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

export default MemberTable;
