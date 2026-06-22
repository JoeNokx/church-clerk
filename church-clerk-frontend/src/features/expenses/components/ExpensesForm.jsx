import { useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import ExpensesContext from "../expenses.store.js";
import AddLookupValueButton from "../../lookups/components/AddLookupValueButton.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";

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

const PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank Transfer", "Cheque"];

function ExpensesForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(ExpensesContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("expenses", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("expenses", "update") : false), [can]);

  const { values: lookupCategories, reload: reloadCategories } = useLookupValues("expenseCategory");
  const categoryOptions = lookupCategories?.length ? lookupCategories : CATEGORY_OPTIONS;

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!open) return;

    setFormError(null);

    if (mode === "edit" && initialData) {
      setCategory(String(initialData.category || ""));
      setAmount(initialData.amount ?? "");
      setDate(String(initialData.date || "").slice(0, 10));
      setPaymentMethod(String(initialData.paymentMethod || "Cash"));
      setDescription(String(initialData.description || ""));
      return;
    }

    setCategory("");
    setAmount("");
    setDate("");
    setPaymentMethod("Cash");
    setDescription("");
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!category) {
      setFormError("Please select a category.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setFormError("Amount is required.");
      return;
    }

    if (!date) {
      setFormError("Date is required.");
      return;
    }

    const payload = {
      category,
      amount: Number(amount),
      date,
      paymentMethod,
      description: String(description || "").trim()
    };

    try {
      if (mode === "edit") {
        if (!canEdit) return;
        await store?.updateGeneralExpenses?.(initialData?._id, payload);
      } else {
        if (!canCreate) return;
        await store?.createGeneralExpenses?.(payload);
      }

      onSuccess?.();
    } catch (e2) {
      setFormError(e2?.response?.data?.message || e2?.message || "Request failed");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
          <div className="font-semibold text-gray-900 text-sm">{mode === "edit" ? "Edit Expense" : "Add Expense"}</div>
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
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-gray-500 text-xs">Category</label>
                {canCreate || canEdit ? (
                  <AddLookupValueButton
                    label="Add category"
                    kind="expenseCategory"
                    onCreated={async (value) => {
                      await reloadCategories();
                      setCategory(value);
                    }}
                  />
                ) : null}
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
              >
                <option value="">Select category</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Amount</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Date</label>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-500 text-xs">Description</label>
              <input
                value={description}
                onChange={(e) => {
                  const val = e.target.value;
                  const words = val.trim() === "" ? [] : val.trim().split(/\s+/);
                  if (words.length <= 20) setDescription(val);
                }}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                placeholder="Optional (max 20 words)"
              />
              <div className="mt-1 text-right text-gray-400 text-xs">
                {description.trim() === "" ? 0 : description.trim().split(/\s+/).length}/20 words
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

            <button
              type="submit"
              disabled={store?.loading}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {store?.loading ? (mode === "edit" ? "Updating..." : "Saving...") : mode === "edit" ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExpensesForm;
