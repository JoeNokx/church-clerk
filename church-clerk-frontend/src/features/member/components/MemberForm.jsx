import { useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import MemberContext from "../member.store.js";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";
import Button from "../../../shared/components/Button/index.jsx";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Dormant", value: "dormant" },
  { label: "Transferred", value: "transferred" },
  { label: "Left Church", value: "left_church" },
  { label: "Deceased", value: "deceased" },
  { label: "Temporarily Away", value: "temporarily_away" },
];

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

const AGE_GROUP_OPTIONS = [
  { label: "Children", value: "children" },
  { label: "Youth", value: "youth" },
  { label: "Adult", value: "adult" },
  { label: "Elderly", value: "elderly" },
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
  const [ageGroup, setAgeGroup] = useState("");
  const [gender, setGender] = useState("");
  const [note, setNote] = useState("");
  const [visitorId, setVisitorId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setFormError(null);
    setIsSubmitting(false);

    if (mode === "edit" && initialData) {
      setFirstName(initialData.firstName || "");
      setLastName(initialData.lastName || "");
      setPhoneNumber(initialData.phoneNumber || "");
      setEmail(initialData.email || "");
      setCity(initialData.city || "");
      setStatus(initialData.status || "active");
      setAgeGroup(initialData.ageGroup || "");
      setGender(initialData.gender || "");
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
    setAgeGroup(initialData?.ageGroup || "");
    setGender(initialData?.gender || "");
    setNote(initialData?.note || "");
    setVisitorId(initialData?.visitorId || null);
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    if (!firstName?.trim() || !lastName?.trim() || !phoneNumber?.trim()) {
      setFormError("First name, last name and phone number are required.");
      setIsSubmitting(false);
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setFormError("Invalid phone number");
      setIsSubmitting(false);
      return;
    }

    if (!gender) {
      setFormError("Please select a gender.");
      setIsSubmitting(false);
      return;
    }

    if (!ageGroup) {
      setFormError("Please select an age group.");
      setIsSubmitting(false);
      return;
    }

    if (!city?.trim()) {
      setFormError("Location / Residential address is required.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      firstName,
      lastName,
      phoneNumber,
      email,
      gender,
      city,
      status,
      ageGroup,
      note,
      visitorId: visitorId || null
    };

    try {
      if (mode === "edit") {
        if (!canEdit) { setIsSubmitting(false); return; }
        await store?.updateMember(initialData?._id, payload);
      } else {
        if (!canCreate) { setIsSubmitting(false); return; }
        await store?.createMember(payload);
      }

      onSuccess?.();
    } catch (e2) {
      const message = e2?.response?.data?.error || e2?.response?.data?.message || e2?.message || "Request failed";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
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
                placeholder="e.g. John"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                placeholder="e.g. Doe"
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
                placeholder="e.g. john.doe@email.com (optional)"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Location / Residential Address</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                placeholder="e.g. Accra, Greater Accra"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Age Group</label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
              >
                <option value="">Select age group</option>
                {AGE_GROUP_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-500 text-xs">Membership Status</label>
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
              <label className="block font-semibold text-gray-500 text-xs">Additional Information</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 text-sm"
                rows={3}
                placeholder="Any extra notes about this member (optional)"
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
              className="rounded-lg px-4 py-2 shadow-sm text-sm"
            >
              {mode === "edit" ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MemberForm;
