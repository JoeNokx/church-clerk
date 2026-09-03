import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getChurchInfoByToken, submitSelfRegistration } from "../services/publicRegistration.api.js";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";
import Button from "../../../shared/components/Button/index.jsx";

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" }
];

const MARITAL_STATUS_OPTIONS = [
  { label: "Single", value: "single" },
  { label: "Married", value: "married" },
  { label: "Divorced", value: "divorced" },
  { label: "Widowed", value: "widowed" },
  { label: "Other", value: "other" }
];

const AGE_GROUP_OPTIONS = [
  { label: "Children", value: "children" },
  { label: "Youth", value: "youth" },
  { label: "Adult", value: "adult" },
  { label: "Elderly", value: "elderly" }
];

const INPUT_CLS = "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200";
const SELECT_CLS = "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200";

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block font-semibold text-gray-600 text-xs mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">{children}</div>;
}

export default function JoinPage() {
  const { token } = useParams();

  const [church, setChurch] = useState(null);
  const [loadingChurch, setLoadingChurch] = useState(true);
  const [churchError, setChurchError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [occupation, setOccupation] = useState("");
  const [nationality, setNationality] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("Ghana");
  const [churchRole, setChurchRole] = useState("");
  const [dateJoined, setDateJoined] = useState("");
  const [note, setNote] = useState("");

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const photoInputRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoadingChurch(true);
    setChurchError("");
    getChurchInfoByToken(token)
      .then((res) => { setChurch(res?.data?.church || null); })
      .catch((e) => { setChurchError(e?.response?.data?.message || "This registration link is invalid or has expired."); })
      .finally(() => setLoadingChurch(false));
  }, [token]);

  useEffect(() => {
    if (!photoFile) { setPhotoPreviewUrl(""); return; }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setFormError("Photo must be under 5MB."); return; }
    setFormError("");
    setPhotoFile(file);
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setFormError("");

    if (!firstName.trim()) return setFormError("First name is required.");
    if (!lastName.trim()) return setFormError("Last name is required.");
    if (!phoneNumber.trim()) return setFormError("Phone number is required.");
    if (!isValidPhoneNumber(phoneNumber)) return setFormError("Please enter a valid phone number.");

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("firstName", firstName.trim());
      fd.append("lastName", lastName.trim());
      fd.append("phoneNumber", phoneNumber);
      if (email.trim()) fd.append("email", email.trim());
      if (gender) fd.append("gender", gender);
      if (dateOfBirth) fd.append("dateOfBirth", dateOfBirth);
      if (occupation.trim()) fd.append("occupation", occupation.trim());
      if (nationality.trim()) fd.append("nationality", nationality.trim());
      if (ageGroup) fd.append("ageGroup", ageGroup);
      if (maritalStatus) fd.append("maritalStatus", maritalStatus);
      if (streetAddress.trim()) fd.append("streetAddress", streetAddress.trim());
      if (city.trim()) fd.append("city", city.trim());
      if (region.trim()) fd.append("region", region.trim());
      fd.append("country", country.trim() || "Ghana");
      if (churchRole.trim()) fd.append("churchRole", churchRole.trim());
      if (dateJoined) fd.append("dateJoined", dateJoined);
      if (note.trim()) fd.append("note", note.trim());
      if (photoFile) fd.append("photo", photoFile);

      const res = await submitSelfRegistration(token, fd);
      setSuccess({
        message: res?.data?.message || "Registration successful!",
        memberId: res?.data?.memberId || null
      });
    } catch (e) {
      setFormError(e?.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const BgShell = ({ children }) => (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/church login.png')" }} />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/90 via-slate-900/85 to-indigo-950/92" />
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }} />
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-32 h-[480px] w-[480px] rounded-full bg-indigo-700/15 blur-3xl pointer-events-none" />
      <div className="relative z-10 w-full max-w-[460px]">{children}</div>
    </div>
  );

  if (loadingChurch) {
    return (
      <BgShell>
        <div className="rounded-2xl bg-white px-8 py-10 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.55)] md:px-10 md:py-12 animate-pulse space-y-4">
          <div className="h-8 w-40 rounded bg-gray-200 mx-auto" />
          <div className="h-4 w-56 rounded bg-gray-200 mx-auto" />
          <div className="space-y-3 mt-6">
            {[1,2,3,4].map(i => <div key={i} className="h-11 rounded-lg bg-gray-200" />)}
          </div>
        </div>
      </BgShell>
    );
  }

  if (churchError) {
    return (
      <BgShell>
        <div className="rounded-2xl bg-white px-8 py-10 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.55)] md:px-10 md:py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="font-bold text-gray-900 text-lg mb-2">Link Unavailable</div>
          <div className="text-gray-500 text-sm">{churchError}</div>
        </div>
      </BgShell>
    );
  }

  if (success) {
    return (
      <BgShell>
        <div className="rounded-2xl bg-white px-8 py-10 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.55)] md:px-10 md:py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="font-bold text-gray-900 text-xl mb-2">Welcome!</div>
          <div className="text-gray-600 text-sm mb-3">{success.message}</div>
          {success.memberId && (
            <div className="inline-block rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-blue-700 font-semibold text-sm">
              Member ID: <span className="font-bold">{success.memberId}</span>
            </div>
          )}
          <div className="mt-4 text-gray-500 text-xs">You can now close this page.</div>
        </div>
      </BgShell>
    );
  }

  return (
    <BgShell>
      <div className="rounded-2xl bg-white px-6 py-8 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.55)] md:px-8 md:py-10">

        {/* Church header */}
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 mb-3">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="font-bold text-gray-900 text-2xl">{church?.name}</h1>
          {church?.pastor && <p className="mt-1 text-gray-500 text-sm">Pastor: {church.pastor}</p>}
          {church?.city && <p className="text-gray-400 text-xs mt-0.5">{church.city}{church?.country ? `, ${church.country}` : ""}</p>}
          <p className="mt-2 text-gray-500 text-sm">Fill in your details to register as a member.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{formError}</div>
          )}

          {/* Photo */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="group relative h-20 w-20 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-colors overflow-hidden flex items-center justify-center"
            >
              {photoPreviewUrl ? (
                <img src={photoPreviewUrl} alt="Preview" className="h-full w-full object-cover rounded-full" />
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-gray-300 group-hover:text-blue-300 transition-colors">
                  <path d="M12 12c2.67 0 4.8-2.13 4.8-4.8S14.67 2.4 12 2.4 7.2 4.53 7.2 7.2 9.33 12 12 12zm0 2.4c-3.2 0-9.6 1.61-9.6 4.8v2.4h19.2v-2.4c0-3.19-6.4-4.8-9.6-4.8z" />
                </svg>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </button>
            <p className="text-xs text-gray-400">Click to upload photo (optional)</p>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          <div className="border-t border-gray-100" />

          {/* Personal Information */}
          <div>
            <SectionTitle>Personal Information</SectionTitle>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" required>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={INPUT_CLS} placeholder="e.g. John" />
                </Field>
                <Field label="Last Name" required>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={INPUT_CLS} placeholder="e.g. Doe" />
                </Field>
              </div>
              <Field label="Phone Number" required>
                <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber}
                  error={Boolean(formError && !isValidPhoneNumber(phoneNumber || ""))} />
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT_CLS} placeholder="e.g. john@example.com" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Gender">
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className={SELECT_CLS}>
                    <option value="">Select</option>
                    {GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </Field>
                <Field label="Date of Birth">
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={INPUT_CLS} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Occupation">
                  <input value={occupation} onChange={(e) => setOccupation(e.target.value)} className={INPUT_CLS} placeholder="e.g. Teacher" />
                </Field>
                <Field label="Nationality">
                  <input value={nationality} onChange={(e) => setNationality(e.target.value)} className={INPUT_CLS} placeholder="e.g. Ghanaian" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Marital Status">
                  <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className={SELECT_CLS}>
                    <option value="">Select status</option>
                    {MARITAL_STATUS_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </Field>
                <Field label="Age Group">
                  <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className={SELECT_CLS}>
                    <option value="">Select age group</option>
                    {AGE_GROUP_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Address */}
          <div>
            <SectionTitle>Address</SectionTitle>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country">
                  <input value={country} onChange={(e) => setCountry(e.target.value)} className={INPUT_CLS} placeholder="e.g. Ghana" />
                </Field>
                <Field label="Region">
                  <input value={region} onChange={(e) => setRegion(e.target.value)} className={INPUT_CLS} placeholder="e.g. Greater Accra" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <input value={city} onChange={(e) => setCity(e.target.value)} className={INPUT_CLS} placeholder="e.g. Accra" />
                </Field>
                <Field label="Location / Residential Address">
                  <input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className={INPUT_CLS} placeholder="e.g. 12 Main St" />
                </Field>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Church Information */}
          <div>
            <SectionTitle>Church Information</SectionTitle>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Church Role">
                  <input value={churchRole} onChange={(e) => setChurchRole(e.target.value)} className={INPUT_CLS} placeholder="e.g. Deacon" />
                </Field>
                <Field label="Date Joined">
                  <input type="date" value={dateJoined} onChange={(e) => setDateJoined(e.target.value)} className={INPUT_CLS} />
                </Field>
              </div>
              <Field label="Note">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Any additional information..." />
              </Field>
            </div>
          </div>

          <Button type="submit" variant="primary" loading={submitting} loadingText="Registering..."
            className="w-full rounded-xl py-3 text-sm transition-colors mt-2">
            Register as Member
          </Button>

          <p className="text-center text-gray-400 text-xs">
            Powered by <span className="font-semibold text-gray-500">ChurchClerk</span>
          </p>
        </form>
      </div>
    </BgShell>
  );
}
