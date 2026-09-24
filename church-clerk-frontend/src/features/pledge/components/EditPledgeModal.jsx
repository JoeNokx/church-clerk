import { useState } from "react";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";
import AddLookupValueButton from "../../lookups/components/AddLookupValueButton.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";
import Button from "../../../shared/components/Button/index.jsx";

const SERVICE_TYPES = [
  "Sunday Service",
  "Sunday First Service",
  "Sunday Second Service",
  "Sunday Third Service",
  "Sunday Fourth Service",
  "Sunday Fifth Service",
  "Worship Service",
  "Bible Study",
  "Children Service",
  "Midweek Service",
  "Prayer Meeting",
  "Special Program"
];

// Fields initialise from initialData via lazy useState — the component remounts
// on every open (returns null while closed), so values are always fresh.
function EditPledgeModal({ open, initialData, onClose, onSubmit, currency }) {
  const [name, setName] = useState(() => String(initialData?.name || ""));
  const [phoneNumber, setPhoneNumber] = useState(() => String(initialData?.phoneNumber || ""));
  const [serviceType, setServiceType] = useState(() => String(initialData?.serviceType || ""));
  const [amount, setAmount] = useState(() => initialData?.amount ?? "");
  const [pledgeDate, setPledgeDate] = useState(() => String(initialData?.pledgeDate || "").slice(0, 10));
  const [deadline, setDeadline] = useState(() => String(initialData?.deadline || "").slice(0, 10));
  const [note, setNote] = useState(() => String(initialData?.note || ""));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { values: lookupServiceTypes, reload: reloadServiceTypes } = useLookupValues("serviceType");
  const serviceTypeOptions = lookupServiceTypes?.length ? lookupServiceTypes : SERVICE_TYPES;

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    if (!String(name || "").trim()) {
      setError("Name is required.");
      setIsSubmitting(false);
      return;
    }

    if (!String(phoneNumber || "").trim()) {
      setError("Phone number is required.");
      setIsSubmitting(false);
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setError("Invalid phone number");
      setIsSubmitting(false);
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Amount is required.");
      setIsSubmitting(false);
      return;
    }

    if (!pledgeDate) {
      setError("Pledge date is required.");
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit?.({
        name: String(name).trim(),
        phoneNumber: String(phoneNumber).trim(),
        serviceType: String(serviceType || "").trim() || undefined,
        amount: Number(amount),
        pledgeDate,
        deadline: deadline || undefined,
        note: String(note || "").trim() || undefined
      });
      onClose?.();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 py-4 md:py-5 lg:py-6 px-4 md:px-6">
          <div>
            <div className="font-semibold text-gray-900 text-lg">Edit Pledge</div>
            <div className="mt-1 text-gray-500 text-sm">Update pledge details</div>
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
        <div className="p-4 md:p-6 lg:p-8">
          <form onSubmit={submit} className="space-y-4">
            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block font-semibold text-gray-500 text-xs">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                  placeholder="e.g., John Doe"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-500 text-xs">Phone Number</label>
                <div className="mt-2">
                  <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber} error={Boolean(error)} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-gray-500 text-xs">Service Type</label>
                  <AddLookupValueButton
                    label="Add service"
                    kind="serviceType"
                    onCreated={async (value) => {
                      await reloadServiceTypes();
                      setServiceType(value);
                    }}
                  />
                </div>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                >
                  <option value="">Select service type</option>
                  {serviceTypeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-500 text-xs">{currency ? `Amount (${currency})` : "Amount"}</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                  type="number"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-500 text-xs">Date Pledged</label>
                <input
                  value={pledgeDate}
                  onChange={(e) => setPledgeDate(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                  type="date"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-500 text-xs">Pledge Deadline (optional)</label>
                <input
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                  type="date"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-gray-500 text-xs">Note (optional)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 500))}
                  maxLength={500}
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                  placeholder="Optional (max 500 chars)"
                />
                <div className="mt-1 text-right text-gray-400 text-xs">{note.length}/500</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
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
                loadingText="Saving..."
                className="rounded-lg bg-blue-700 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm px-4 md:px-6"
              >
                Save
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditPledgeModal;
