import { useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../Permissions/permission.store.js";
import SpecialFundContext from "../specialFund.store.js";

const CATEGORY_OPTIONS = [
  "Prophetic Seed",
  "Pastor Appreciation",
  "Thanksgiving Offering",
  "Missionary Support",
  "Donation",
  "Retreat",
  "Scholarship Fund"
];

const MAX_DESCRIPTION_LENGTH = 40;

function SpecialFundForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(SpecialFundContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("specialFunds", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("specialFunds", "update") : false), [can]);

  const [giverName, setGiverName] = useState("");
  const [category, setCategory] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [description, setDescription] = useState("");
  const [givingDate, setGivingDate] = useState("");
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!open) return;

    setFormError(null);

    if (mode === "edit" && initialData) {
      setGiverName(initialData.giverName || "");
      setCategory(initialData.category || "");
      setTotalAmount(initialData.totalAmount ?? "");
      setDescription((initialData.description || "").slice(0, MAX_DESCRIPTION_LENGTH));
      setGivingDate((initialData.givingDate || "").slice(0, 10));
      return;
    }

    setGiverName("");
    setCategory("");
    setTotalAmount("");
    setDescription("");
    setGivingDate("");
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!giverName?.trim()) {
      setFormError("Giver name is required.");
      return;
    }

    if (!category) {
      setFormError("Please select a category.");
      return;
    }

    if (!totalAmount || Number(totalAmount) <= 0) {
      setFormError("Amount is required.");
      return;
    }

    if (!givingDate) {
      setFormError("Date is required.");
      return;
    }

    const payload = {
      giverName,
      category,
      totalAmount: Number(totalAmount),
      description,
      givingDate
    };

    try {
      if (mode === "edit") {
        if (!canEdit) return;
        await store?.updateSpecialFund(initialData?._id, payload);
      } else {
        if (!canCreate) return;
        await store?.createSpecialFund(payload);
      }

      onSuccess?.();
    } catch (e2) {
      const message = e2?.response?.data?.message || e2?.message || "Request failed";

      if (typeof message === "string" && message.toLowerCase().includes("giver") && message.toLowerCase().includes("required")) {
        setFormError("Giver name is required.");
        return;
      }

      if (typeof message === "string" && message.toLowerCase().includes("category") && message.toLowerCase().includes("required")) {
        setFormError("Please select a category.");
        return;
      }

      setFormError(message);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="text-sm font-semibold text-gray-900">{mode === "edit" ? "Edit Fund" : "Add Fund"}</div>
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
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500">Giver Name</label>
              <input
                value={giverName}
                onChange={(e) => setGiverName(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              >
                <option value="">Select category</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500">Amount</label>
              <input
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                type="number"
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500">Date</label>
              <input
                value={givingDate}
                onChange={(e) => setGivingDate(e.target.value)}
                type="date"
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-500">Description</label>
              <div className="text-xs font-semibold text-gray-400">
                {(description || "").length}/{MAX_DESCRIPTION_LENGTH}
              </div>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
              maxLength={MAX_DESCRIPTION_LENGTH}
              rows={3}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
              placeholder=""
            />
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

export default SpecialFundForm;
