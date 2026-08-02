import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getChurchInfoByToken, submitSelfRegistration } from "../services/publicRegistration.api.js";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";

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
  const [maritalStatus, setMaritalStatus] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("Ghana");
  const [churchRole, setChurchRole] = useState("");
  const [dateJoined, setDateJoined] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoadingChurch(true);
    setChurchError("");
    getChurchInfoByToken(token)
      .then((res) => {
        setChurch(res?.data?.church || null);
      })
      .catch((e) => {
        setChurchError(e?.response?.data?.message || "This registration link is invalid or has expired.");
      })
      .finally(() => setLoadingChurch(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!firstName.trim()) return setFormError("First name is required.");
    if (!lastName.trim()) return setFormError("Last name is required.");
    if (!phoneNumber.trim()) return setFormError("Phone number is required.");
    if (!isValidPhoneNumber(phoneNumber)) return setFormError("Please enter a valid phone number.");

    setSubmitting(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber,
        email: email.trim() || undefined,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        occupation: occupation.trim() || undefined,
        nationality: nationality.trim() || undefined,
        maritalStatus: maritalStatus || undefined,
        streetAddress: streetAddress.trim() || undefined,
        city: city.trim() || undefined,
        region: region.trim() || undefined,
        country: country.trim() || "Ghana",
        churchRole: churchRole.trim() || undefined,
        dateJoined: dateJoined || undefined
      };

      const res = await submitSelfRegistration(token, payload);
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
      <div className="rounded-2xl bg-white px-8 py-10 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.55)] md:px-10 md:py-12">

        {/* Church header */}
        <div className="mb-7 text-center">
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

          {/* Personal Information */}
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Personal Information</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" required>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="e.g. John" />
                </Field>
                <Field label="Last Name" required>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="e.g. Doe" />
                </Field>
              </div>
              <Field label="Phone Number" required>
                <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber}
                  error={Boolean(formError && !isValidPhoneNumber(phoneNumber || ""))} />
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g. john@example.com" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Gender">
                  <select value={gender} onChange={(e) => setGender(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="">Select</option>
                    {GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </Field>
                <Field label="Date of Birth">
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Occupation">
                  <input value={occupation} onChange={(e) => setOccupation(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="e.g. Teacher" />
                </Field>
                <Field label="Nationality">
                  <input value={nationality} onChange={(e) => setNationality(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="e.g. Ghanaian" />
                </Field>
              </div>
              <Field label="Marital Status">
                <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="">Select status</option>
                  {MARITAL_STATUS_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Address */}
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Address</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country">
                  <input value={country} onChange={(e) => setCountry(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="e.g. Ghana" />
                </Field>
                <Field label="Region">
                  <input value={region} onChange={(e) => setRegion(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="e.g. Greater Accra" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <input value={city} onChange={(e) => setCity(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="e.g. Accra" />
                </Field>
                <Field label="Location">
                  <input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="e.g. 12 Main St" />
                </Field>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Church Info */}
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Church Information</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Church Role">
                <input value={churchRole} onChange={(e) => setChurchRole(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g. Deacon" />
              </Field>
              <Field label="Date Joined">
                <input type="date" value={dateJoined} onChange={(e) => setDateJoined(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </Field>
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60 text-sm transition-colors mt-2">
            {submitting ? "Submitting..." : "Register as Member"}
          </button>

          <p className="text-center text-gray-400 text-xs">
            Powered by <span className="font-semibold text-gray-500">ChurchClerk</span>
          </p>
        </form>
      </div>
    </BgShell>
  );
}
