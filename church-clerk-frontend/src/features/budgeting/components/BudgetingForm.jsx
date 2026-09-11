import { useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import BudgetingContext from "../budgeting.store.js";
import AddLookupValueButton from "../../lookups/components/AddLookupValueButton.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";
import Button from "../../../shared/components/Button/index.jsx";
import EntityPicker, { ENTITY_TYPES } from "./EntityPicker.jsx";

const STATUS_OPTIONS = [
  { value: "draft",            label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved",         label: "Approved" },
  { value: "active",           label: "Active" },
  { value: "closed",           label: "Closed" },
];

const INCOME_CATEGORY_OPTIONS = [
  "Tithe", "Offering", "Special Fund", "Church Project", "Other"
];

const CATEGORY_OPTIONS = [
  "Maintenance",
  "Equipment",
  "Utilities",
  "Transportation",
  "Pastor Support",
  "Charity",
  "Church Project",
  "Program",
  "Building materials",
  "Salary"
];

function formatYmdLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const emptyItem = () => ({ type: "expense", category: "", amount: "", notes: "", dateFrom: "", dateTo: "", allocatedType: "", allocatedId: null, allocatedName: "" });

function BudgetingForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(BudgetingContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("budgeting", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("budgeting", "update") : false), [can]);

  const { values: lookupExpenseCategories, reload: reloadExpenseCategories } = useLookupValues("expenseCategory");
  const expenseCategoryOptions = lookupExpenseCategories?.length ? lookupExpenseCategories : CATEGORY_OPTIONS;

  const { values: lookupIncomeCategories, reload: reloadIncomeCategories } = useLookupValues("incomeCategory");
  const incomeCategoryOptions = lookupIncomeCategories?.length ? lookupIncomeCategories : INCOME_CATEGORY_OPTIONS;

  const [name, setName] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [status, setStatus] = useState("draft");
  const [items, setItems] = useState([emptyItem()]);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setFormError(null);
    setIsSubmitting(false);

    if (mode === "edit" && initialData) {
      setName(String(initialData?.name || ""));
      setFiscalYear(initialData?.fiscalYear ? String(initialData.fiscalYear) : "");
      setPeriodFrom(formatYmdLocal(initialData?.periodFrom));
      setPeriodTo(formatYmdLocal(initialData?.periodTo));
      setStatus(String(initialData?.status || "draft"));

      const raw = Array.isArray(initialData?.items) ? initialData.items : [];
      const next = raw.length
        ? raw.map((i) => ({
            type: String(i?.type || "expense"),
            category: String(i?.category || ""),
            amount: i?.amount ?? "",
            notes: String(i?.notes || ""),
            dateFrom: i?.dateFrom ? new Date(i.dateFrom).toISOString().slice(0, 10) : "",
            dateTo: i?.dateTo ? new Date(i.dateTo).toISOString().slice(0, 10) : "",
            allocatedType: String(i?.allocatedTo?.entityType || ""),
            allocatedId: i?.allocatedTo?.entityId || null,
            allocatedName: String(i?.allocatedTo?.entityName || "")
          }))
        : [emptyItem()];

      setItems(next);
      return;
    }

    const now = new Date();
    setName("");
    setFiscalYear(String(now.getFullYear()));
    setPeriodFrom("");
    setPeriodTo("");
    setStatus("draft");
    setItems([emptyItem()]);
  }, [open, mode, initialData]);

  const updateItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...(patch || {}) } : it)));
  };

  const removeItem = (idx) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [emptyItem()];
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const plannedTotals = useMemo(() => {
    const rows = Array.isArray(items) ? items : [];
    const expense = rows.filter((r) => r?.type === "expense").reduce((acc, r) => acc + Number(r?.amount || 0), 0);
    const income = rows.filter((r) => r?.type === "income").reduce((acc, r) => acc + Number(r?.amount || 0), 0);
    return { expense, income };
  }, [items]);

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        name: String(name || "").trim(),
        fiscalYear: fiscalYear ? Number(fiscalYear) : "",
        status,
        periodFrom: periodFrom || null,
        periodTo: periodTo || null,
        items: (Array.isArray(items) ? items : [])
          .map((i) => ({
            type: String(i?.type || "expense"),
            category: String(i?.category || "").trim(),
            amount: i?.amount === "" ? "" : Number(i?.amount),
            notes: String(i?.notes || "").trim(),
            dateFrom: i?.dateFrom || null,
            dateTo: i?.dateTo || null,
            allocatedTo: {
              entityType: i?.allocatedType || null,
              entityId: i?.allocatedId || null,
              entityName: String(i?.allocatedName || "").trim()
            }
          }))
          .filter((i) => i.category)
      };

      if (mode === "edit") {
        if (!canEdit) {
          setIsSubmitting(false);
          return;
        }
        await store?.updateBudget?.(initialData?._id, payload);
      } else {
        if (!canCreate) {
          setIsSubmitting(false);
          return;
        }
        await store?.createBudget?.(payload);
      }

      onSuccess?.();
    } catch (e2) {
      setFormError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">{mode === "edit" ? "Edit Budget" : "Create Budget"}</div>
            <div className="mt-1 text-gray-500 text-xs">Plan your income and expenses for a period, then compare with actual spending.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="p-4 md:p-6 lg:p-8">
          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{formError}</div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-500 text-xs">Budget name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="e.g. 2026 Annual Budget"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Financial year</label>
              <input
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                type="number"
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="2026"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Period from</label>
              <input
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                type="date"
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Period to</label>
              <input
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                type="date"
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-gray-200">
            <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Budget items</div>
                <div className="mt-1 text-gray-500 text-xs">Add categories and planned amounts (income or expenses).</div>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="h-11 rounded-lg bg-blue-600 px-4 font-semibold text-white shadow-sm hover:bg-blue-700 md:h-12 text-sm"
              >
                Add item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left font-semibold text-gray-500 text-xs">
                    <th className="sticky left-0 z-20 bg-slate-100 px-4 py-2 whitespace-nowrap">Type</th>
                    <th className="px-4 py-2 whitespace-nowrap">Category</th>
                    <th className="px-4 py-2 whitespace-nowrap">Allocated To</th>
                    <th className="px-4 py-2 whitespace-nowrap">Amount</th>
                    <th className="px-4 py-2 whitespace-nowrap">Date From</th>
                    <th className="px-4 py-2 whitespace-nowrap">Date To</th>
                    <th className="px-4 py-2 whitespace-nowrap">Notes</th>
                    <th className="px-4 py-2 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((row, idx) => {
                    const type = String(row?.type || "expense");
                    const category = String(row?.category || "");
                    const allocType = row?.allocatedType || "";
                    const allocMeta = ENTITY_TYPES.find((e) => e.value === allocType);

                    return (
                          <tr key={`item-${idx}`} className="text-gray-700 text-sm">
                            {/* Type */}
                            <td className="sticky left-0 z-10 bg-white px-4 py-2 whitespace-nowrap">
                              <select
                                value={type}
                                onChange={(e) => updateItem(idx, { type: e.target.value, category: "" })}
                                className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                              >
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                              </select>
                            </td>

                            {/* Category */}
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                {type === "expense" ? (
                                  <>
                                    <select
                                      value={category}
                                      onChange={(e) => updateItem(idx, { category: e.target.value })}
                                      className="h-11 w-44 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                                    >
                                      <option value="">Select category</option>
                                      {(expenseCategoryOptions || []).map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                      ))}
                                    </select>
                                    <AddLookupValueButton
                                      label="Add"
                                      kind="expenseCategory"
                                      onCreated={async (value) => {
                                        await reloadExpenseCategories();
                                        updateItem(idx, { category: value });
                                      }}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <select
                                      value={category}
                                      onChange={(e) => updateItem(idx, { category: e.target.value })}
                                      className="h-11 w-44 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                                    >
                                      <option value="">Select category</option>
                                      {(incomeCategoryOptions || []).map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                      ))}
                                    </select>
                                    <AddLookupValueButton
                                      label="Add"
                                      kind="incomeCategory"
                                      onCreated={async (value) => {
                                        await reloadIncomeCategories();
                                        updateItem(idx, { category: value });
                                      }}
                                    />
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Allocated To */}
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <select
                                  value={allocType}
                                  onChange={(e) => updateItem(idx, { allocatedType: e.target.value, allocatedId: null, allocatedName: "" })}
                                  className="h-11 w-40 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                                >
                                  {ENTITY_TYPES.map((et) => (
                                    <option key={et.value} value={et.value}>{et.label}</option>
                                  ))}
                                </select>
                                {allocMeta?.needsPicker ? (
                                  <EntityPicker
                                    entityType={allocType}
                                    value={{ entityId: row?.allocatedId, entityName: row?.allocatedName }}
                                    onChange={(id, name) => updateItem(idx, { allocatedId: id, allocatedName: name })}
                                    className="w-44"
                                  />
                                ) : null}
                                {allocMeta?.isCustom ? (
                                  <input
                                    type="text"
                                    value={row?.allocatedName || ""}
                                    onChange={(e) => updateItem(idx, { allocatedId: null, allocatedName: e.target.value })}
                                    placeholder="Enter name"
                                    className="h-11 w-44 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                                  />
                                ) : null}
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                value={row?.amount ?? ""}
                                onChange={(e) => updateItem(idx, { amount: e.target.value })}
                                className="h-11 w-36 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                                placeholder="0.00"
                              />
                            </td>

                            {/* Date From */}
                            <td className="px-4 py-2">
                              <input
                                type="date"
                                value={row?.dateFrom || ""}
                                onChange={(e) => updateItem(idx, { dateFrom: e.target.value })}
                                className="h-11 w-36 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                              />
                            </td>

                            {/* Date To */}
                            <td className="px-4 py-2">
                              <input
                                type="date"
                                value={row?.dateTo || ""}
                                onChange={(e) => updateItem(idx, { dateTo: e.target.value })}
                                className="h-11 w-36 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                              />
                            </td>

                            {/* Notes */}
                            <td className="px-4 py-2">
                              <div className="flex flex-col gap-0.5">
                                <input
                                  value={row?.notes || ""}
                                  onChange={(e) => updateItem(idx, { notes: e.target.value.slice(0, 20) })}
                                  maxLength={20}
                                  className="h-11 w-44 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                                  placeholder="Optional"
                                />
                                <div className="text-[10px] text-gray-400 text-right w-44">{(row?.notes || "").length}/20</div>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => removeItem(idx)}
                                  className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-red-600 hover:bg-gray-50 text-xs"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-200 px-4 py-3 text-gray-700 md:flex-row md:items-center md:justify-between text-sm">
              <div className="text-gray-500 text-xs">Planned totals (auto-calculated)</div>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="font-semibold text-gray-500 text-xs">Income:</span> <span className="font-semibold">{plannedTotals.income.toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 text-xs">Expenses:</span> <span className="font-semibold">{plannedTotals.expense.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>

            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              loadingText={mode === "edit" ? "Updating..." : "Saving..."}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {mode === "edit" ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BudgetingForm;
