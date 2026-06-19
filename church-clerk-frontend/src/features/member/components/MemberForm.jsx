import { useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import MemberContext from "../member.store.js";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Visitor", value: "visitor" },
  { label: "Former", value: "former" }
];

function MemberForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("members", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("members", "update") : false), [can]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("active");
  const [note, setNote] = useState("");
  const [visitorId, setVisitorId] = useState(null);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!open) return;

    setFormError(null);

    if (mode === "edit" && initialData) {
      setFirstName(initialData.firstName || "");
      setLastName(initialData.lastName || "");
      setPhoneNumber(initialData.phoneNumber || "");
      setEmail(initialData.email || "");
      setCity(initialData.city || "");
      setStatus(initialData.status || "active");
      setNote(initialData.note || "");
      setVisitorId(initialData.visitorId || null);
      return;
    }

    setFirstName(initialData?.firstName || "");
    setLastName(initialData?.lastName || "");
    setPhoneNumber(initialData?.phoneNumber || "");
    setEmail(initialData?.email || "");
    setCity(initialData?.city || "");
    setStatus(initialData?.status || "active");
    setNote(initialData?.note || "");
    setVisitorId(initialData?.visitorId || null);
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!firstName?.trim() || !lastName?.trim() || !phoneNumber?.trim()) {
      setFormError("First name, last name and phone number are required.");
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setFormError("Invalid phone number");
      return;
    }

    const payload = {
      firstName,
      lastName,
      phoneNumber,
      email,
      city,
      status,
      note,
      visitorId: visitorId || null
    };

    try {
      if (mode === "edit") {
        if (!canEdit) return;
        await store?.updateMember(initialData?._id, payload);
      } else {
        if (!canCreate) return;
        await store?.createMember(payload);
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
          <div className="font-semibold text-gray-900 text-sm">{mode === "edit" ? "Edit Member" : "Add Member"}</div>
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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div>
              <label className="block font-semibold text-gray-500 text-xs">First Name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                placeholder=""
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                placeholder=""
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Phone Number</label>
              <div className="mt-2">
                <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber} error={Boolean(formError)} />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                placeholder=""
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                placeholder=""
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
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

export default MemberForm;
