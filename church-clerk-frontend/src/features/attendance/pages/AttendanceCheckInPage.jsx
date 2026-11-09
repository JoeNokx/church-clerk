import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  getSelfCheckInInfo,
  submitSelfCheckIn,
  getOrgAttendanceInfoByToken,
  submitOrgAttendanceCheckIn
} from "../services/publicAttendance.api.js";
import Button from "../../../shared/components/Button/index.jsx";

function formatDate(val) {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDay(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-GB", { weekday: "long" });
}

export default function AttendanceCheckInPage() {
  const { token } = useParams();
  const { pathname } = useLocation();
  const isSelf = pathname.startsWith("/attend/qr") || pathname.startsWith("/attend/link");
  const getInfo = isSelf ? getSelfCheckInInfo : getOrgAttendanceInfoByToken;

  const [session, setSession] = useState(null);
  const [selfSessions, setSelfSessions] = useState([]);
  const [selfSessionId, setSelfSessionId] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoadingSession(true);
    setSessionError("");
    getInfo(token)
      .then((res) => {
        if (isSelf) {
          const sessions = Array.isArray(res?.data?.sessions) ? res.data.sessions : [];
          setSession({ church: res?.data?.church || null });
          setSelfSessions(sessions);
          setSelfSessionId(sessions[0]?._id ? String(sessions[0]._id) : "");
        } else {
          setSession(res?.data?.attendance || null);
        }
      })
      .catch((e) => setSessionError(e?.response?.data?.message || "This check-in link is invalid or has expired."))
      .finally(() => setLoadingSession(false));
  }, [token, getInfo, isSelf]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError("");
    if (!phoneNumber.trim()) {
      setFormError("Phone number is required.");
      setIsSubmitting(false);
      return;
    }
    if (isSelf && !selfSessionId) {
      setFormError("Please select a service session.");
      setIsSubmitting(false);
      return;
    }
    if (!agreed) {
      setFormError("Please confirm you attended this service session.");
      setIsSubmitting(false);
      return;
    }
    try {
      const res = isSelf
        ? await submitSelfCheckIn(token, { sessionId: selfSessionId, phoneNumber: phoneNumber.trim() })
        : await submitOrgAttendanceCheckIn(token, { phoneNumber: phoneNumber.trim() });
      setSuccess({ message: res?.data?.message || "Check-in successful!", memberName: res?.data?.memberName || null });
    } catch (e) {
      setFormError(e?.response?.data?.message || "Check-in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-pulse space-y-4">
          <div className="h-8 w-40 rounded bg-gray-200 mx-auto" />
          <div className="h-4 w-56 rounded bg-gray-200 mx-auto" />
          <div className="h-40 rounded-xl bg-gray-200" />
        </div>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="font-bold text-gray-900 text-lg mb-2">Link Unavailable</div>
          <div className="text-gray-500 text-sm">{sessionError}</div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="font-bold text-gray-900 text-xl mb-2">Checked In!</div>
          {success.memberName && (
            <div className="text-blue-700 font-semibold text-base mb-2">{success.memberName}</div>
          )}
          <div className="text-gray-600 text-sm">{success.message}</div>
          <div className="mt-4 text-gray-400 text-xs">You can now close this page.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 mb-3">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          {session?.church?.name && (
            <h1 className="font-bold text-gray-900 text-2xl">{session.church.name}</h1>
          )}
          {session?.church?.pastor && (
            <p className="mt-1 text-gray-500 text-sm">Pastor: {session.church.pastor}</p>
          )}
          <div className="mt-3 inline-flex flex-col items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 px-5 py-3">
            <span className="font-semibold text-blue-900 text-base">
              {isSelf
                ? (selfSessions.find((s) => String(s._id) === selfSessionId)?.serviceType || "Service")
                : (session?.serviceType || "Service")}
            </span>
            {session?.entityName ? (
              <span className="text-blue-800 text-xs font-medium">{session.entityName}</span>
            ) : null}
            <span className="text-blue-600 text-sm">
              {isSelf
                ? formatDate(selfSessions.find((s) => String(s._id) === selfSessionId)?.date)
                : formatDate(session?.date)}
            </span>
          </div>
          <p className="mt-4 text-gray-600 text-sm">Enter the phone number you registered with the church to mark your attendance.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{formError}</div>
          )}

          {isSelf ? (
            <div>
              <label className="block font-semibold text-gray-600 text-xs mb-1.5">
                Service Session <span className="text-red-500">*</span>
              </label>
              <select
                value={selfSessionId}
                onChange={(e) => setSelfSessionId(e.target.value)}
                disabled={!selfSessions.length}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {selfSessions.length === 0 ? <option value="">No service sessions available</option> : null}
                {selfSessions.map((s) => (
                  <option key={s._id} value={s._id}>
                    {`${formatDay(s?.date)}, ${formatDate(s?.date)} — ${s?.serviceType || "Service"}`}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="block font-semibold text-gray-600 text-xs mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+233544455566"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
            />
            <span className="text-gray-600 text-sm">
              I agree I attended church on <span className="font-semibold">{isSelf
                ? `${selfSessions.find((s) => String(s._id) === selfSessionId)?.serviceType || "Service"}, ${formatDate(selfSessions.find((s) => String(s._id) === selfSessionId)?.date)}`
                : `${session?.serviceType || "Service"}, ${formatDate(session?.date)}`}</span>
            </span>
          </label>

          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            loadingText="Checking in..."
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 text-sm transition-colors"
          >
            Mark Present
          </Button>
        </form>

        <p className="mt-5 text-center text-gray-400 text-xs">
          Powered by <span className="font-semibold text-gray-500">ChurchClerk</span>
        </p>
      </div>
    </div>
  );
}
