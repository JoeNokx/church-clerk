import { useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import BudgetingContext from "../budgeting.store.js";
import Button from "../../../shared/components/Button/index.jsx";

function formatYmdLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function BudgetingForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(BudgetingContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("budgeting", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("budgeting", "update") : false), [can]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setFormError(null);
    setIsSubmitting(false);

    if (mode === "edit" && initialData) {
      setName(String(initialData?.name || ""));
      setDescription(String(initialData?.description || ""));
      setFiscalYear(initialData?.fiscalYear ? String(initialData.fiscalYear) : "");
      setPeriodFrom(formatYmdLocal(initialData?.periodFrom));
      setPeriodTo(formatYmdLocal(initialData?.periodTo));
      return;
    }

    const now = new Date();
    setName("");
    setDescription("");
    setFiscalYear(String(now.getFullYear()));
    setPeriodFrom("");
    setPeriodTo("");
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    if (!String(name || "").trim()) {
      setFormError("Please enter a budget name.");
      setIsSubmitting(false);
      return;
    }
    if (!fiscalYear || !Number(fiscalYear)) {
      setFormError("Please enter a valid financial year.");
      setIsSubmitting(false);
      return;
    }
    if (!periodFrom || !periodTo) {
      setFormError("Please set both the budget period start and end dates.");
      setIsSubmitting(false);
      return;
    }
    if (new Date(periodTo) < new Date(periodFrom)) {
      setFormError("Budget period end must be after the start date.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Budget items are managed on the budget detail page — edit mode must
      // not send items or it would wipe the existing list.
      const payload = {
        name: String(name || "").trim(),
        description: String(description || "").trim(),
        fiscalYear: Number(fiscalYear),
        periodFrom,
        periodTo,
        ...(mode === "edit" ? {} : { items: [] })
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
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 md:px-5 lg:px-6 py-4 rounded-t-xl">
          <div>
            <div className="font-semibold text-gray-900 text-sm">{mode === "edit" ? "Edit Budget" : "Create Budget"}</div>
            <div className="mt-1 text-gray-500 text-xs">Set the budget period, then open it to add planned income and expense items.</div>
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
              <label className="block font-semibold text-gray-500 text-xs">Budget name <span className="text-red-500">*</span></label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="e.g. 2026 Annual Budget"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Financial year <span className="text-red-500">*</span></label>
              <input
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                type="number"
                required
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="2026"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Budget Period Start <span className="text-red-500">*</span></label>
              <input
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                type="date"
                required
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Budget Period End <span className="text-red-500">*</span></label>
              <input
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                type="date"
                required
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block font-semibold text-gray-500 text-xs">
                Description <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                rows={3}
                maxLength={2000}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-700 text-sm"
                placeholder="What is this budget for? e.g. Annual operations and ministry plans for 2026."
              />
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
