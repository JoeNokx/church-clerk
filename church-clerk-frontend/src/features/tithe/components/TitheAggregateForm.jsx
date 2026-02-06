import { useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import TitheContext from "../tithe.store.js";

const MAX_DESCRIPTION_LENGTH = 60;

function TitheAggregateForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(TitheContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("tithe", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("tithe", "update") : false), [can]);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!open) return;

    setFormError(null);

    if (mode === "edit" && initialData) {
      setAmount(initialData.amount ?? "");
      setDate((initialData.date || "").slice(0, 10));
      setDescription((initialData.description || "").slice(0, MAX_DESCRIPTION_LENGTH));
      return;
    }

    setAmount("");
    setDate("");
    setDescription("");
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!date) {
      setFormError("Date is required.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setFormError("Amount is required.");
      return;
    }

    const payload = {
      amount: Number(amount),
      date,
      description
    };

    try {
      if (mode === "edit") {
        if (!canEdit) return;
        await store?.updateTitheAggregate?.(initialData?._id, payload);
      } else {
        if (!canCreate) return;
        await store?.createTitheAggregate?.(payload);
      }

      onSuccess?.();
    } catch (e2) {
      const message = e2?.response?.data?.message || e2?.message || "Request failed";
      setFormError(message);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="text-sm font-semibold text-gray-900">{mode === "edit" ? "Edit Aggregate Tithe" : "Record Aggregate Tithe"}</div>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500">Amount</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500">Date</label>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                type="text"
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                placeholder="e.g. Sunday service tithe"
              />
              <div className="mt-1 text-xs text-gray-400">{description.length}/{MAX_DESCRIPTION_LENGTH}</div>
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

export default TitheAggregateForm;
