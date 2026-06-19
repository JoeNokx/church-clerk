import { useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import AttendanceContext from "../attendance.store.js";
import AddLookupValueButton from "../../lookups/components/AddLookupValueButton.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";

const SERVICE_TYPES = [
  "Sunday Service",
  "Sunday First Service",
  "Sunday Second Service",
  "Sunday Third Service",
  "Sunday Fourth Service",
  "Sunday Fifth Service",
  "Children Service",
  "Midweek Service",
  "Prayer Meeting"
];

function VisitorForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(AttendanceContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("visitors", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("visitors", "update") : false), [can]);

  const { values: lookupServiceTypes, reload: reloadServiceTypes } = useLookupValues("serviceType");
  const serviceTypeOptions = lookupServiceTypes?.length ? lookupServiceTypes : SERVICE_TYPES;

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [invitedBy, setInvitedBy] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!open) return;

    setFormError(null);

    if (mode === "edit" && initialData) {
      setFullName(initialData.fullName || "");
      setPhoneNumber(initialData.phoneNumber || "");
      setEmail(initialData.email || "");
      setLocation(initialData.location || "");
      setServiceType(initialData.serviceType || "");
      setServiceDate((initialData.serviceDate || "").slice(0, 10));
      setInvitedBy(initialData.invitedBy || "");
      setNote(initialData.note || "");
      return;
    }

    setFullName("");
    setPhoneNumber("");
    setEmail("");
    setLocation("");
    setServiceType("");
    setServiceDate("");
    setInvitedBy("");
    setNote("");
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName?.trim()) {
      setFormError("Full name is required.");
      return;
    }

    if (!phoneNumber?.trim()) {
      setFormError("Phone number is required.");
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setFormError("Invalid phone number");
      return;
    }

    if (!location?.trim()) {
      setFormError("Location is required.");
      return;
    }

    if (!serviceType) {
      setFormError("Please select a service type.");
      return;
    }

    if (!serviceDate) {
      setFormError("Date is required.");
      return;
    }

    const payload = {
      fullName,
      phoneNumber,
      email,
      location,
      serviceType,
      serviceDate,
      invitedBy,
      note
    };

    try {
      if (mode === "edit") {
        if (!canEdit) return;
        await store?.updateVisitor(initialData?._id, payload);
      } else {
        if (!canCreate) return;
        await store?.createVisitor(payload);
      }

      onSuccess?.();
    } catch (e2) {
      const message = e2?.response?.data?.error || e2?.response?.data?.message || e2?.message || "Request failed";
      setFormError(message);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
          <div className="font-semibold text-gray-900 text-sm">{mode === "edit" ? "Edit Visitor" : "Add Visitor"}</div>
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block font-semibold text-gray-500 text-xs">Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Phone Number</label>
              <div className="mt-2">
                <PhoneNumberInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  error={Boolean(formError)}
                  flagOnlySelectedCountry
                  countryMenuSearchBar
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder=""
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder=""
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-gray-500 text-xs">Service Type</label>
                {canCreate || canEdit ? (
                  <AddLookupValueButton
                    label="Add service"
                    kind="serviceType"
                    onCreated={async (value) => {
                      await reloadServiceTypes();
                      setServiceType(value);
                    }}
                  />
                ) : null}
              </div>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              >
                <option value="">Select service</option>
                {serviceTypeOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Date</label>
              <input
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                type="date"
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Invited By</label>
              <input
                value={invitedBy}
                onChange={(e) => setInvitedBy(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder=""
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-500 text-xs">Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 text-sm"
                rows={3}
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
              disabled={store?.visitorLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {store?.visitorLoading ? (mode === "edit" ? "Updating..." : "Saving...") : mode === "edit" ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VisitorForm;
