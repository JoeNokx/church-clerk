import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProgramCheckInInfo, submitProgramCheckIn, searchCheckInMembers } from "../services/programPublic.api.js";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";
import Button from "../../../shared/components/Button/index.jsx";

const INPUT_CLS = "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "short", day: "numeric" });
}

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

function BgShell({ children }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <div className="relative z-10 w-full max-w-[460px]">{children}</div>
    </div>
  );
}

export default function ProgramCheckInPage() {
  const { token } = useParams();

  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");

  const [attendeeType, setAttendeeType] = useState("member");
  const [heardAbout, setHeardAbout] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setLoadError("");
    getProgramCheckInInfo(token)
      .then((res) => setProgram(res?.data?.program || null))
      .catch((e) => setLoadError(e?.response?.data?.message || "This check-in link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (attendeeType !== "member" || selectedMember) {
      setMemberResults([]);
      return;
    }
    const q = memberQuery.trim();
    if (q.length < 2) {
      setMemberResults([]);
      return;
    }
    setMemberSearching(true);
    const t = setTimeout(() => {
      searchCheckInMembers(token, q)
        .then((res) => setMemberResults(res?.data?.members || []))
        .catch(() => setMemberResults([]))
        .finally(() => setMemberSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [memberQuery, attendeeType, selectedMember, token]);

  const pickMember = (m) => {
    setSelectedMember(m);
    setFullName(m?.fullName || "");
    setPhoneNumber(m?.phoneNumber || "");
    setEmail(m?.email || "");
    setLocation(m?.location || "");
    setMemberResults([]);
    setMemberQuery("");
  };

  const clearMember = () => {
    setSelectedMember(null);
    setFullName("");
    setPhoneNumber("");
    setEmail("");
    setLocation("");
    setMemberQuery("");
    setMemberResults([]);
  };

  const switchType = (t) => {
    setAttendeeType(t);
    setSelectedMember(null);
    setMemberQuery("");
    setMemberResults([]);
    setFullName("");
    setPhoneNumber("");
    setEmail("");
    setLocation("");
    setHeardAbout("");
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setFormError("");

    if (attendeeType === "member" && !selectedMember) {
      return setFormError("Search and select your name to continue.");
    }
    if (!fullName.trim()) return setFormError("Full name is required.");
    if (!phoneNumber.trim()) return setFormError("Phone number is required.");
    if (attendeeType === "guest" && !heardAbout) {
      return setFormError("Please tell us where you heard about this program.");
    }

    setSubmitting(true);
    try {
      const res = await submitProgramCheckIn(token, {
        fullName: fullName.trim(),
        phoneNumber,
        email: email.trim() || undefined,
        location: location.trim() || undefined,
        attendeeType,
        memberId: selectedMember?._id || undefined,
        heardAbout: attendeeType === "guest" ? heardAbout : undefined
      });
      setSuccess({ message: res?.data?.message || "Checked in!" });
    } catch (e) {
      setFormError(e?.response?.data?.message || "Check-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <BgShell>
        <div className="rounded-2xl bg-white px-8 py-10 border border-gray-200 shadow-lg animate-pulse space-y-4">
          <div className="h-8 w-40 rounded bg-gray-200 mx-auto" />
          <div className="h-4 w-56 rounded bg-gray-200 mx-auto" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map((i) => <div key={i} className="h-11 rounded-lg bg-gray-200" />)}
          </div>
        </div>
      </BgShell>
    );
  }

  if (loadError) {
    return (
      <BgShell>
        <div className="rounded-2xl bg-white px-8 py-10 border border-gray-200 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="font-bold text-gray-900 text-lg mb-2">Link Unavailable</div>
          <div className="text-gray-500 text-sm">{loadError}</div>
        </div>
      </BgShell>
    );
  }

  if (success) {
    return (
      <BgShell>
        <div className="rounded-2xl bg-white px-8 py-10 border border-gray-200 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="font-bold text-gray-900 text-xl mb-2">Checked In!</div>
          <div className="text-gray-600 text-sm mb-3">{success.message}</div>
          <div className="mt-4 text-gray-500 text-xs">You can now close this page.</div>
        </div>
      </BgShell>
    );
  }

  const dateText = [formatDate(program?.dateFrom), formatDate(program?.dateTo)]
    .filter(Boolean)
    .join(" — ");

  return (
    <BgShell>
      <div className="rounded-2xl bg-white px-6 py-8 border border-gray-200 shadow-lg md:px-8 md:py-10">
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 mb-3">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          {program?.church?.name && <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">{program.church.name}</p>}
          <h1 className="font-bold text-gray-900 text-2xl mt-1">{program?.title}</h1>
          {dateText && <p className="mt-1 text-blue-700 font-semibold text-sm">{dateText}</p>}
          {program?.time && <p className="text-gray-500 text-xs mt-0.5">{program.time}</p>}
          {program?.venue && <p className="text-gray-400 text-xs mt-0.5">{program.venue}</p>}
          <p className="mt-2 text-gray-500 text-sm">Check in to mark yourself present.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{formError}</div>
          )}

          <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
            {[["member", "Member"], ["guest", "Guest"]].map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => switchType(v)}
                className={`flex-1 rounded-md py-2 font-semibold text-sm transition-colors ${attendeeType === v ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {attendeeType === "member" ? (
            selectedMember ? (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{selectedMember.fullName}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{selectedMember.phoneNumber || "—"}</div>
                </div>
                <button type="button" onClick={clearMember} className="text-blue-700 font-semibold text-xs hover:underline">Change</button>
              </div>
            ) : (
              <div className="relative">
                <Field label="Search your name" required>
                  <input
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="Start typing your name…"
                  />
                </Field>
                {memberQuery.trim().length >= 2 && (
                  <div className="mt-1 rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 max-h-44 overflow-y-auto">
                    {memberSearching ? (
                      <div className="px-4 py-3 text-gray-400 text-sm">Searching…</div>
                    ) : memberResults.length === 0 ? (
                      <div className="px-4 py-3 text-gray-400 text-sm">No members found.</div>
                    ) : (
                      memberResults.map((m) => (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => pickMember(m)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                        >
                          <span className="font-semibold text-gray-900 text-sm">{m.fullName}</span>
                          <span className="text-gray-500 text-xs">{m.phoneNumber || "—"}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          ) : (
            <>
              <Field label="Full Name" required>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={INPUT_CLS} placeholder="e.g. John Doe" />
              </Field>
              <Field label="Phone Number" required>
                <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber}
                  error={Boolean(formError && !isValidPhoneNumber(phoneNumber || ""))} />
              </Field>
              <Field label="Where did you hear about this program?" required>
                <select value={heardAbout} onChange={(e) => setHeardAbout(e.target.value)} className={INPUT_CLS}>
                  <option value="">Select an option</option>
                  <option value="Friend / Family">Friend / Family</option>
                  <option value="TV / Radio">TV / Radio</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Church Announcement">Church Announcement</option>
                  <option value="Flyer / Poster">Flyer / Poster</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
            </>
          )}

          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT_CLS} placeholder="e.g. john@example.com" />
          </Field>
          <Field label="Location">
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={INPUT_CLS} placeholder="e.g. Accra" />
          </Field>

          <Button type="submit" variant="primary" loading={submitting} loadingText="Checking in..."
            className="w-full rounded-xl py-3 text-sm transition-colors mt-2">
            Check In
          </Button>
        </form>
      </div>
    </BgShell>
  );
}
