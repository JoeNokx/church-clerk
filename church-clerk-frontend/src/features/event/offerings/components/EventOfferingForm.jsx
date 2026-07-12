import { useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../../permissions/permission.store.js";
import EventOfferingContext from "../eventOfferings.store.js";
import AddLookupValueButton from "../../../lookups/components/AddLookupValueButton.jsx";
import { useLookupValues } from "../../../lookups/hooks/useLookupValues.js";

const OFFERING_TYPES = [
  "first offering",
  "second offering",
  "third offering",
  "fourth offering",
  "fifth offering"
];

function EventOfferingForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(EventOfferingContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("events", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("events", "update") : false), [can]);

  const { values: lookupOfferingTypes, reload: reloadOfferingTypes } = useLookupValues("offeringType");
  const offeringTypeOptions = lookupOfferingTypes?.length ? lookupOfferingTypes : OFFERING_TYPES;

  const [offeringType, setOfferingType] = useState("first offering");
  const [offeringDate, setOfferingDate] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!open) return;

    setFormError(null);

    if (mode === "edit" && initialData) {
      setOfferingType(initialData.offeringType || "first offering");
      setOfferingDate((initialData.offeringDate || "").slice(0, 10));
      setAmount(initialData.amount ?? "");
      setNote(initialData.note || "");
      return;
    }

    setOfferingType("first offering");
    setOfferingDate("");
    setAmount("");
    setNote("");
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!offeringType) {
      setFormError("Please select an offering type.");
      return;
    }

    if (!offeringDate) {
      setFormError("Date is required.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setFormError("Amount is required.");
      return;
    }

    const payload = {
      offeringType,
      offeringDate,
      amount: Number(amount),
      note: note ? note.trim() : undefined
    };

    try {
      if (mode === "edit") {
        if (!canEdit) return;
        await store?.updateOffering?.(initialData?._id, payload);
      } else {
        if (!canCreate) return;
        await store?.createOffering?.(payload);
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
        <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
          <div className="font-semibold text-gray-900 text-sm">{mode === "edit" ? "Edit Event Offering" : "Add Event Offering"}</div>
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-gray-500 text-xs">Offering Type</label>
                {canCreate || canEdit ? (
                  <AddLookupValueButton
                    label="Add type"
                    kind="offeringType"
                    onCreated={async (value) => {
                      await reloadOfferingTypes();
                      setOfferingType(value);
                    }}
                  />
                ) : null}
              </div>
              <select
                value={offeringType}
                onChange={(e) => setOfferingType(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              >
                {offeringTypeOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
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
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Date</label>
              <input
                value={offeringDate}
                onChange={(e) => setOfferingDate(e.target.value)}
                type="date"
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-gray-500 text-xs">Note</label>
                <span className="text-xs text-gray-400">{note.length}/20</span>
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={20}
                type="text"
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="Optional (max 20 chars)"
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

export default EventOfferingForm;
