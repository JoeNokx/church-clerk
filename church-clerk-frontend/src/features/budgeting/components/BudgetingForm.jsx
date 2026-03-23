import { useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import BudgetingContext from "../budgeting.store.js";
import AddLookupValueButton from "../../lookups/components/AddLookupValueButton.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";

const STATUS_OPTIONS = ["draft", "active", "archived"];

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

const emptyItem = () => ({ type: "expense", category: "", amount: "", notes: "" });

function BudgetingForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(BudgetingContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("budgeting", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("budgeting", "update") : false), [can]);

  const { values: lookupExpenseCategories, reload: reloadExpenseCategories } = useLookupValues("expenseCategory");
  const expenseCategoryOptions = lookupExpenseCategories?.length ? lookupExpenseCategories : CATEGORY_OPTIONS;

  const [name, setName] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [status, setStatus] = useState("draft");
  const [items, setItems] = useState([emptyItem()]);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!open) return;

    setFormError(null);

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
            notes: String(i?.notes || "")
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
            notes: String(i?.notes || "").trim()
          }))
          .filter((i) => i.category)
      };

      if (mode === "edit") {
        if (!canEdit) return;
        await store?.updateBudget?.(initialData?._id, payload);
      } else {
        if (!canCreate) return;
        await store?.createBudget?.(payload);
      }

      onSuccess?.();
    } catch (e2) {
      setFormError(e2?.response?.data?.message || e2?.message || "Request failed");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">{mode === "edit" ? "Edit Budget" : "Create Budget"}</div>
            <div className="mt-1 text-xs text-gray-500">Plan your income and expenses for a period, then compare with actual spending.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="p-5">
          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500">Budget name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                placeholder="e.g. 2026 Annual Budget"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500">Fiscal year</label>
              <input
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                type="number"
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                placeholder="2026"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500">Period from</label>
              <input
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                type="date"
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500">Period to</label>
              <input
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                type="date"
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-gray-200">
            <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">Budget items</div>
                <div className="mt-1 text-xs text-gray-500">Add categories and planned amounts (income or expenses).</div>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Add item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left text-xs font-semibold text-gray-500">
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Notes</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((row, idx) => {
                    const type = String(row?.type || "expense");
                    const category = String(row?.category || "");

                    return (
                      <tr key={`item-${idx}`} className="text-sm text-gray-700">
                        <td className="px-4 py-2">
                          <select
                            value={type}
                            onChange={(e) => updateItem(idx, { type: e.target.value })}
                            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>
                        </td>

                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {type === "expense" ? (
                              <select
                                value={category}
                                onChange={(e) => updateItem(idx, { category: e.target.value })}
                                className="h-9 w-56 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                              >
                                <option value="">Select category</option>
                                {(expenseCategoryOptions || []).map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                value={category}
                                onChange={(e) => updateItem(idx, { category: e.target.value })}
                                className="h-9 w-56 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                                placeholder="Income category"
                              />
                            )}

                            {type === "expense" ? (
                              <AddLookupValueButton
                                label="Add"
                                kind="expenseCategory"
                                onCreated={async (value) => {
                                  await reloadExpenseCategories();
                                  updateItem(idx, { category: value });
                                }}
                              />
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-2">
                          <input
                            value={row?.amount ?? ""}
                            onChange={(e) => updateItem(idx, { amount: e.target.value })}
                            type="number"
                            className="h-9 w-40 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                            placeholder="0"
                          />
                        </td>

                        <td className="px-4 py-2">
                          <input
                            value={row?.notes ?? ""}
                            onChange={(e) => updateItem(idx, { notes: e.target.value })}
                            className="h-9 w-72 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                            placeholder="Optional"
                          />
                        </td>

                        <td className="px-4 py-2">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-gray-50"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-200 px-4 py-3 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-gray-500">Planned totals (auto-calculated)</div>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-xs font-semibold text-gray-500">Income:</span> <span className="font-semibold">{plannedTotals.income.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500">Expenses:</span> <span className="font-semibold">{plannedTotals.expense.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={store?.loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {mode === "edit" ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BudgetingForm;
