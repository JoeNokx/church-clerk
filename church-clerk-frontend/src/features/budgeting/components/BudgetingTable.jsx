import { useContext, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import BudgetingContext from "../budgeting.store.js";
import Card from "../../../shared/components/Card/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import { resolveEmptyReason, buildRecoveryActions } from "../../../shared/utils/emptyState.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatPeriod(from, to) {
  const f = from ? formatDate(from) : "—";
  const t = to ? formatDate(to) : "—";
  if (f === "—" && t === "—") return "—";
  if (f === t) return f;
  return `${f} – ${t}`;
}

function sumPlanned(items, type) {
  const rows = Array.isArray(items) ? items : [];
  return rows.filter((i) => i?.type === type).reduce((acc, i) => acc + Number(i?.amount || 0), 0);
}

const STATUS_LABEL_MAP = {
  draft:            "Draft",
  pending_approval: "Pending Approval",
  approved:         "Approved",
  active:           "Active",
  closed:           "Closed"
};

function statusLabel(status) {
  return STATUS_LABEL_MAP[String(status || "").toLowerCase()] || String(status || "Draft");
}

function statusBadge(status) {
  const s = String(status || "draft").toLowerCase();
  const map = {
    draft:            "bg-gray-100 text-gray-700",
    pending_approval: "bg-yellow-100 text-yellow-700",
    approved:         "bg-blue-100 text-blue-700",
    active:           "bg-green-100 text-green-700",
    closed:           "bg-slate-100 text-slate-700"
  };
  return map[s] || map.draft;
}

function BudgetingTable({ onEdit, onCreate }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(BudgetingContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const { toPage } = useDashboardNavigator();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const canEdit = useMemo(() => (typeof can === "function" ? can("budgeting", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("budgeting", "delete") : false), [can]);
  const canCreate = useMemo(() => (typeof can === "function" ? can("budgeting", "create") : false), [can]);

  const clearSearch = () => {
    store?.setFilters?.({ search: "", page: 1 });
    store?.fetchBudgets?.({ search: "", page: 1 });
  };
  const clearFilters = () => {
    store?.setFilters?.({ fiscalYear: "", status: "", page: 1 });
    store?.fetchBudgets?.({ fiscalYear: "", status: "", page: 1 });
  };

  const onPrev = async () => {
    const prevPage = store?.pagination?.prevPage;
    if (!prevPage) return;
    await store?.fetchBudgets?.({ page: prevPage });
  };

  const onNext = async () => {
    const nextPage = store?.pagination?.nextPage;
    if (!nextPage) return;
    await store?.fetchBudgets?.({ page: nextPage });
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
    await store?.deleteBudget?.(id);
  };

  if (store?.loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gray-200 shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-28 rounded bg-gray-200" />
                    <div className="h-3 w-16 rounded-full bg-gray-200" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="h-8 w-8 rounded-lg bg-gray-200" />
                  <div className="h-8 w-8 rounded-lg bg-gray-200" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-3 w-16 rounded bg-gray-200" />
                <div className="h-3 w-24 rounded bg-gray-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="h-2.5 w-20 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                </div>
                <div className="space-y-1">
                  <div className="h-2.5 w-20 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                </div>
              </div>
              <div className="mt-auto pt-2 border-t border-gray-100 flex justify-end">
                <div className="h-7 w-24 rounded-lg bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
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

  const rows = Array.isArray(store?.budgets) ? store.budgets : [];

  if (!rows.length) {
    const filters = store?.filters || {};
    const reason = resolveEmptyReason({
      search: filters.search,
      filters,
      filterDefaults: { fiscalYear: "", status: "" },
    });

    const recovery = buildRecoveryActions(reason, {
      onClearSearch: clearSearch,
      onClearFilters: clearFilters,
    });

    const isZero = reason === "zero";
    const title = isZero ? "No budgets yet" : "No budgets found";
    const description = isZero
      ? "Create your first budget to start planning your church finances."
      : "We couldn't find any budgets matching your current search or filters.";

    const showAdd = isZero && canCreate && onCreate;
    const actionLabel = showAdd ? "Create Budget" : recovery?.actionLabel;
    const onAction = showAdd ? onCreate : recovery?.onAction;
    const secondaryLabel = showAdd ? null : recovery?.secondaryLabel;
    const onSecondary = showAdd ? null : recovery?.onSecondary;

    return (
      <EmptyState
        illustration={isZero ? "budgeting" : "search"}
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
      <div className="p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((row, index) => {
            const plannedIncome = sumPlanned(row?.items, "income");
            const plannedExpense = sumPlanned(row?.items, "expense");

            return (
              <Card key={row?._id ?? `row-${index}`}>
                <Card.Header
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M4 19h16M7 17V9M12 17V5M17 17v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  }
                  iconBg="bg-indigo-50"
                  iconColor="text-indigo-600"
                  title={row?.name || "Untitled Budget"}
                  badge={statusLabel(row?.status)}
                  badgeClass={statusBadge(row?.status)}
                  actions={
                    <>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => row?._id && onEdit?.(row)}
                          className="cck-allow-icons h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                          aria-label="Edit"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => row?._id && openConfirmDelete(row._id)}
                          className="cck-allow-icons h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50"
                          aria-label="Delete"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      ) : null}
                    </>
                  }
                />

                <Card.Meta
                  items={[
                    {
                      icon: (
                        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      ),
                      label: row?.fiscalYear ? `Financial Year ${row.fiscalYear}` : "—"
                    },
                    {
                      icon: (
                        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      ),
                      label: formatPeriod(row?.periodFrom, row?.periodTo)
                    }
                  ]}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-semibold text-gray-400">Planned Income</div>
                    <div className="mt-0.5 font-semibold text-green-700 text-sm">{formatMoney(plannedIncome, currency)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-gray-400">Planned Expenses</div>
                    <div className="mt-0.5 font-semibold text-orange-600 text-sm">{formatMoney(plannedExpense, currency)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-gray-400">{formatDate(row?.createdAt)}</div>
                  {row?.referenceId ? (
                    <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{row.referenceId}</span>
                  ) : null}
                </div>

                <Card.Footer>
                  <Card.ViewDetailsLink
                    onClick={() => row?._id && toPage("budget-detail", { id: row._id })}
                    label="View Details"
                  />
                </Card.Footer>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-4 md:px-6 pb-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">Delete Budget</div>
            </div>
            <div className="px-4 md:px-5 lg:px-6 py-4 text-gray-700 text-sm">Are you sure you want to delete this budget?</div>
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

export default BudgetingTable;
