import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import BudgetingContext, { BudgetingProvider } from "../budgeting.store.js";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";
import AddLookupValueButton from "../../lookups/components/AddLookupValueButton.jsx";
import BackButton from "../../../shared/components/BackButton/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import EntityPicker, { ENTITY_TYPES } from "../components/EntityPicker.jsx";
import { formatMoney } from "../../../shared/utils/formatMoney.js";

const EXPENSE_CATEGORY_DEFAULTS = [
  "Maintenance", "Equipment", "Utilities", "Transportation",
  "Pastor Support", "Charity", "Church Project", "Program",
  "Building materials", "Salary"
];

const INCOME_CATEGORY_OPTIONS = [
  "Tithe", "Offering", "Special Fund", "Church Project", "Other"
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatPeriod(from, to) {
  const f = from ? formatDate(from) : "—";
  const t = to ? formatDate(to) : "—";
  if (f === "—" && t === "—") return null;
  if (f === t) return f;
  return `${f} – ${t}`;
}

function statusBadgeClass(status) {
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

function statusLabel(status) {
  const map = {
    draft:            "Draft",
    pending_approval: "Pending Approval",
    approved:         "Approved",
    active:           "Active",
    closed:           "Closed"
  };
  return map[String(status || "").toLowerCase()] || String(status || "—");
}

// ─── Item View Modal ─────────────────────────────────────────────────────────

function ItemViewModal({ item, currency, onClose }) {
  if (!item) return null;
  const isExpense = item?.type === "expense";
  const hasActuals = item?.actual !== null && item?.actual !== undefined;
  const actual = hasActuals ? Number(item.actual) : null;
  const variance = hasActuals ? Number(item?.variance ?? (Number(item?.amount || 0) - actual)) : null;
  const isGood = variance !== null && (isExpense ? variance >= 0 : actual >= Number(item?.amount || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">{item?.category || "Budget Item"}</div>
            <div className="mt-0.5 text-gray-500 text-xs capitalize">{item?.type || "—"}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Planned</div>
              <div className="mt-1 font-semibold text-gray-900 text-base">{formatMoney(item?.amount || 0, currency)}</div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Actual</div>
              <div className="mt-1 font-semibold text-gray-900 text-base">
                {hasActuals ? formatMoney(actual, currency) : <span className="text-gray-400 text-sm">No period set</span>}
              </div>
            </div>
          </div>

          {hasActuals && variance !== null ? (
            <div className={`rounded-lg border p-3 ${isGood ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"}`}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Variance</div>
              <div className={`mt-1 font-semibold text-base ${isGood ? "text-green-700" : "text-red-600"}`}>
                {isGood ? "+" : "-"}{formatMoney(Math.abs(variance), currency)}
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {isExpense ? (isGood ? "under budget" : "over budget") : (isGood ? "above plan" : "below plan")}
                </span>
              </div>
            </div>
          ) : null}

          {(item?.dateFrom || item?.dateTo) ? (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Item Period</div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                {[item.dateFrom && formatDate(item.dateFrom), item.dateTo && formatDate(item.dateTo)].filter(Boolean).join(" – ")}
              </div>
            </div>
          ) : null}

          {item?.allocatedTo?.entityType ? (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Allocated To</div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                <span className="font-semibold capitalize">{item.allocatedTo.entityType.replace("_", " ")}</span>
                {item.allocatedTo.entityName ? <span className="text-gray-500"> — {item.allocatedTo.entityName}</span> : null}
              </div>
            </div>
          ) : null}

          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 min-h-[40px]">
              {item?.notes || <span className="text-gray-400 italic text-xs">No notes</span>}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 text-sm hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Item Modal ──────────────────────────────────────────────────────────

function AddItemModal({ onAdd, onClose, expenseCategoryOptions, reloadExpenseCategories, incomeCategoryOptions, reloadIncomeCategories, saving, initialData }) {
  const editing = Boolean(initialData);
  const [type, setType] = useState(editing ? String(initialData?.type || "expense") : "expense");
  const [category, setCategory] = useState(editing ? String(initialData?.category || "") : "");
  const [amount, setAmount] = useState(editing ? String(initialData?.amount ?? "") : "");
  const [notes, setNotes] = useState(editing ? String(initialData?.notes || "") : "");
  const [dateFrom, setDateFrom] = useState(
    editing && initialData?.dateFrom
      ? new Date(initialData.dateFrom).toISOString().slice(0, 10)
      : ""
  );
  const [dateTo, setDateTo] = useState(
    editing && initialData?.dateTo
      ? new Date(initialData.dateTo).toISOString().slice(0, 10)
      : ""
  );
  const [allocatedType, setAllocatedType] = useState(editing ? String(initialData?.allocatedTo?.entityType || "") : "");
  const [allocatedId, setAllocatedId] = useState(editing ? (initialData?.allocatedTo?.entityId || null) : null);
  const [allocatedName, setAllocatedName] = useState(editing ? String(initialData?.allocatedTo?.entityName || "") : "");

  const allocMeta = ENTITY_TYPES.find((e) => e.value === allocatedType);

  const submit = (e) => {
    e.preventDefault();
    if (!category.trim() || !amount || Number(amount) < 0) return;
    onAdd({
      type,
      category: category.trim(),
      amount: Number(amount),
      notes: notes.trim(),
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      allocatedTo: { entityType: allocatedType || null, entityId: allocatedId || null, entityName: allocatedName }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">{editing ? "Edit Budget Item" : "Add Budget Item"}</div>
            <div className="mt-0.5 text-gray-500 text-xs">{editing ? "Update this income or expense line." : "Add a new income or expense line to this budget."}</div>
          </div>
          <button type="button" onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="px-5 py-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Type</label>
            <select value={type} onChange={(e) => { setType(e.target.value); setCategory(""); }}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Category</label>
            {type === "expense" ? (
              <div className="flex items-center gap-2">
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="h-11 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700">
                  <option value="">Select category</option>
                  {expenseCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <AddLookupValueButton label="Add" kind="expenseCategory"
                  onCreated={async (value) => { await reloadExpenseCategories(); setCategory(value); }} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="h-11 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700">
                  <option value="">Select category</option>
                  {incomeCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <AddLookupValueButton label="Add" kind="incomeCategory"
                  onCreated={async (value) => { await reloadIncomeCategories(); setCategory(value); }} />
              </div>
            )}
          </div>

          {/* Allocated To / Source */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              {type === "income" ? "Source" : "Allocated To"} <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <div className="space-y-2">
              <select
                value={allocatedType}
                onChange={(e) => { setAllocatedType(e.target.value); setAllocatedId(null); setAllocatedName(""); }}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              >
                {ENTITY_TYPES.map((et) => (
                  <option key={et.value} value={et.value}>{et.label}</option>
                ))}
              </select>
              {allocMeta?.needsPicker ? (
                <EntityPicker
                  entityType={allocatedType}
                  value={{ entityId: allocatedId, entityName: allocatedName }}
                  onChange={(id, name) => { setAllocatedId(id); setAllocatedName(name); }}
                  className="w-full"
                />
              ) : null}
              {allocMeta?.isCustom ? (
                <input
                  type="text"
                  value={allocatedName}
                  onChange={(e) => { setAllocatedId(null); setAllocatedName(e.target.value); }}
                  placeholder="Enter allocation name"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                />
              ) : null}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00" min="0"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
          </div>

          {/* Date range (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Date From <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Date To <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 20))}
              maxLength={20} placeholder="Short note"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700" />
            <div className="mt-0.5 text-right text-[10px] text-gray-400">{notes.length}/20</div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={!category || !amount || saving}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving…" : editing ? "Update Item" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main detail page inner ──────────────────────────────────────────────────

function BudgetDetailPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(BudgetingContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";
  const { toPage } = useDashboardNavigator();
  const location = useLocation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const budgetId = params.get("id");

  const canEdit = useMemo(() => (typeof can === "function" ? can("budgeting", "update") : false), [can]);

  const { values: lookupExpenseCategories, reload: reloadExpenseCategories } = useLookupValues("expenseCategory");
  const expenseCategoryOptions = lookupExpenseCategories?.length ? lookupExpenseCategories : EXPENSE_CATEGORY_DEFAULTS;

  const { values: lookupIncomeCategories, reload: reloadIncomeCategories } = useLookupValues("incomeCategory");
  const incomeCategoryOptions = lookupIncomeCategories?.length ? lookupIncomeCategories : INCOME_CATEGORY_OPTIONS;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [budget, setBudget] = useState(null);
  const [summary, setSummary] = useState(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [savingItem, setSavingItem] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const load = useCallback(async () => {
    if (!budgetId) return;
    setLoading(true);
    setError(null);
    try {
      const [budgetRes, summaryRes] = await Promise.all([
        store?.getBudget?.(budgetId),
        store?.getBudgetSummary?.(budgetId)
      ]);
      const budgetPayload = budgetRes?.data?.budget || budgetRes?.data?.data?.budget || budgetRes?.data?.data;
      setBudget(budgetPayload?.budget || budgetPayload || null);

      const summaryPayload = summaryRes?.data?.data ?? summaryRes?.data;
      setSummary(summaryPayload?.data ?? summaryPayload ?? null);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load budget");
    } finally {
      setLoading(false);
    }
  }, [budgetId, store]);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => {
    if (Array.isArray(summary?.itemsWithActuals)) return summary.itemsWithActuals;
    if (Array.isArray(budget?.items)) return budget.items;
    return [];
  }, [summary, budget]);

  const handleAddItem = async (newItem) => {
    setSavingItem(true);
    try {
      const existing = Array.isArray(budget?.items) ? budget.items : [];
      await store?.updateBudget?.(budgetId, { items: [...existing, newItem] });
      setAddModalOpen(false);
      await load();
    } catch (e) {
      // store sets its own error
    } finally {
      setSavingItem(false);
    }
  };

  const handleEditItem = async (updatedItem) => {
    const idx = editItem?.idx;
    if (idx === undefined || idx === null) return;
    setSavingItem(true);
    try {
      const existing = Array.isArray(budget?.items) ? budget.items : [];
      const next = existing.map((it, i) => (i === idx ? updatedItem : it));
      await store?.updateBudget?.(budgetId, { items: next });
      setEditItem(null);
      await load();
    } catch (e) {
      // store sets its own error
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (idx) => {
    setSavingItem(true);
    try {
      const existing = Array.isArray(budget?.items) ? budget.items : [];
      const next = existing.filter((_, i) => i !== idx);
      await store?.updateBudget?.(budgetId, { items: next });
      setDeleteConfirm(null);
      await load();
    } catch (e) {
      // store sets its own error
    } finally {
      setSavingItem(false);
    }
  };

  if (!budgetId) {
    return (
      <EmptyState
        illustration="budgeting"
        title="No budget selected"
        description="Please go back and select a budget to view."
        actionLabel="Back to Budgets"
        onAction={() => toPage("budgeting")}
      />
    );
  }

  return (
    <div className="w-full max-w-none">
      <BackButton onClick={() => toPage("budgeting")} label="Back" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-gray-900 text-xl md:text-2xl lg:text-3xl">
              {loading ? "Loading…" : budget?.name || "Budget Details"}
            </h2>
            {budget?.status ? (
              <span className={`inline-flex rounded-full px-2.5 py-1 font-semibold text-xs ${statusBadgeClass(budget.status)}`}>
                {statusLabel(budget.status)}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-gray-500 text-sm hidden md:block">
            {[budget?.fiscalYear && `Financial Year ${budget.fiscalYear}`, formatPeriod(budget?.periodFrom, budget?.periodTo)].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
      ) : null}

      {loading ? (
        <div className="mt-6 space-y-4 animate-pulse">
          <div className="rounded-xl border border-gray-200 bg-white p-6 h-36" />
          <div className="rounded-xl border border-gray-200 bg-white p-6 h-64" />
        </div>
      ) : budget ? (
        <div className="mt-6 space-y-5">

          {/* ── Income & Expense comparison table ── */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 md:px-6 lg:px-8 py-4 border-b border-gray-200">
              <div className="font-semibold text-gray-900 text-sm">Financial Summary</div>
              <div className="mt-0.5 text-gray-500 text-xs">Planned vs actual for the budget period</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <th className="px-4 md:px-6 py-3 whitespace-nowrap">Category</th>
                    <th className="px-4 md:px-6 py-3 whitespace-nowrap">Planned</th>
                    <th className="px-4 md:px-6 py-3 whitespace-nowrap">Actual</th>
                    <th className="px-4 md:px-6 py-3 whitespace-nowrap">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 md:px-6 py-3 font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                        Income
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 text-gray-900 font-semibold">
                      {formatMoney(summary?.plannedIncomeTotal || 0, currency)}
                    </td>
                    <td className="px-4 md:px-6 py-3 text-gray-900 font-semibold">
                      {summary
                        ? formatMoney(summary.actualIncomeTotal || 0, currency)
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 md:px-6 py-3">
                      {summary ? (
                        <span className={`font-semibold ${summary.varianceIncome >= 0 ? "text-green-700" : "text-red-600"}`}>
                          {summary.varianceIncome >= 0 ? "+" : ""}{formatMoney(summary.varianceIncome, currency)}
                          <span className="ml-1.5 text-[11px] font-normal text-gray-400">
                            {summary.varianceIncome >= 0 ? "above plan" : "below plan"}
                          </span>
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="px-4 md:px-6 py-3 font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                        Expenses
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 text-gray-900 font-semibold">
                      {formatMoney(summary?.plannedExpenseTotal || 0, currency)}
                    </td>
                    <td className="px-4 md:px-6 py-3 text-gray-900 font-semibold">
                      {summary
                        ? formatMoney(summary.actualExpenseTotal || 0, currency)
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 md:px-6 py-3">
                      {summary ? (
                        <span className={`font-semibold ${summary.varianceExpense >= 0 ? "text-green-700" : "text-red-600"}`}>
                          {summary.varianceExpense >= 0 ? "+" : ""}{formatMoney(summary.varianceExpense, currency)}
                          <span className="ml-1.5 text-[11px] font-normal text-gray-400">
                            {summary.varianceExpense >= 0 ? "under budget" : "over budget"}
                          </span>
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Budget Items vs Actuals ── */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 md:px-6 lg:px-8 py-4 border-b border-gray-200">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Budget Items vs Actuals</div>
                <div className="mt-0.5 text-gray-500 text-xs">Planned amount per category compared to actual recorded spending / income.</div>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white text-xs hover:bg-blue-700 shrink-0"
                >
                  <span className="text-base leading-none">+</span>
                  Add Item
                </button>
              ) : null}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr className="text-left font-semibold text-gray-500 text-xs">
                    <th className="sticky left-0 z-20 bg-slate-100 py-2 whitespace-nowrap px-4 md:px-6">Type</th>
                    <th className="py-2 whitespace-nowrap px-4 md:px-6">Category</th>
                    <th className="py-2 whitespace-nowrap px-4 md:px-6">Planned</th>
                    <th className="py-2 whitespace-nowrap px-4 md:px-6">Actual</th>
                    <th className="py-2 whitespace-nowrap px-4 md:px-6">Variance</th>
                    <th className="py-2 whitespace-nowrap px-4 md:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.length ? items.map((it, idx) => {
                    const isExpense = it?.type === "expense";
                    const hasActuals = it?.actual !== null && it?.actual !== undefined;
                    const actual = hasActuals ? Number(it.actual) : null;
                    const variance = hasActuals ? Number(it?.variance ?? (Number(it?.amount || 0) - actual)) : null;
                    const isGood = variance !== null && (isExpense ? variance >= 0 : actual >= Number(it?.amount || 0));

                    return (
                      <tr key={idx} className="text-gray-700 hover:bg-gray-50/50">
                        <td className="sticky left-0 z-10 bg-white py-2.5 whitespace-nowrap px-4 md:px-6">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${isExpense ? "bg-orange-50 text-orange-700" : "bg-green-50 text-green-700"}`}>
                            {it?.type || "—"}
                          </span>
                        </td>
                        <td className="py-2.5 font-semibold text-gray-900 whitespace-nowrap px-4 md:px-6">{it?.category || "—"}</td>
                        <td className="py-2.5 whitespace-nowrap px-4 md:px-6">{formatMoney(it?.amount || 0, currency)}</td>
                        <td className="py-2.5 whitespace-nowrap px-4 md:px-6">
                          {hasActuals
                            ? formatMoney(actual, currency)
                            : <span className="text-gray-400 text-xs">No period</span>}
                        </td>
                        <td className="py-2.5 whitespace-nowrap px-4 md:px-6">
                          {variance !== null ? (
                            <span className={`font-semibold ${isGood ? "text-green-700" : "text-red-600"}`}>
                              {isGood ? "+" : "-"}{formatMoney(Math.abs(variance), currency)}
                            </span>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="py-2.5 whitespace-nowrap px-4 md:px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setViewItem(it)}
                              className="rounded px-2.5 py-1 border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                            >
                              View
                            </button>
                            {canEdit ? (
                              <>
                                <button
                                  onClick={() => setEditItem({ idx, data: it })}
                                  className="rounded px-2.5 py-1 border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                                >
                                  Edit
                                </button>
                                {deleteConfirm === idx ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      onClick={() => handleDeleteItem(idx)}
                                      disabled={savingItem}
                                      className="rounded px-2.5 py-1 bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm(null)}
                                      className="rounded px-2.5 py-1 border border-gray-200 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirm(idx)}
                                    className="rounded px-2.5 py-1 border border-gray-200 text-red-500 text-xs font-semibold hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                )}
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <EmptyState
                          compact
                          illustration="budgeting"
                          title="No budget items"
                          description="Click Add Item to start planning income and expenses."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : !loading && !error ? (
        <EmptyState
          illustration="budgeting"
          title="Budget not found"
          description="This budget may have been deleted or you don't have access."
          actionLabel="Back to Budgets"
          onAction={() => toPage("budgeting")}
        />
      ) : null}

      {/* Add Item Modal */}
      {addModalOpen ? (
        <AddItemModal
          onAdd={handleAddItem}
          onClose={() => setAddModalOpen(false)}
          expenseCategoryOptions={expenseCategoryOptions}
          reloadExpenseCategories={reloadExpenseCategories}
          incomeCategoryOptions={incomeCategoryOptions}
          reloadIncomeCategories={reloadIncomeCategories}
          saving={savingItem}
        />
      ) : null}

      {/* Edit Item Modal */}
      {editItem ? (
        <AddItemModal
          onAdd={handleEditItem}
          onClose={() => setEditItem(null)}
          expenseCategoryOptions={expenseCategoryOptions}
          reloadExpenseCategories={reloadExpenseCategories}
          incomeCategoryOptions={incomeCategoryOptions}
          reloadIncomeCategories={reloadIncomeCategories}
          saving={savingItem}
          initialData={editItem?.data}
        />
      ) : null}

      {/* Item View Modal */}
      {viewItem ? (
        <ItemViewModal
          item={viewItem}
          currency={currency}
          onClose={() => setViewItem(null)}
        />
      ) : null}
    </div>
  );
}

function BudgetDetailPage() {
  return (
    <BudgetingProvider>
      <BudgetDetailPageInner />
    </BudgetingProvider>
  );
}

export default BudgetDetailPage;
