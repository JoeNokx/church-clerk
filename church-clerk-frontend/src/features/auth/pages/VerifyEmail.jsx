import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthCard from "../components/AuthCard.jsx";
import { checkVerificationStatus, resendEmailVerification, verifyEmail } from "../services/auth.api.js";
import { useAuth } from "../useAuth.js";

const AUTH_TOKEN_KEY = "cckAuthToken";

function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();

  const token = useMemo(() => String(searchParams.get("token") || "").trim(), [searchParams]);
  const email = useMemo(() => String(searchParams.get("email") || "").trim(), [searchParams]);
  const session = useMemo(() => String(searchParams.get("session") || "").trim(), [searchParams]);

  const verifyStarted = useRef(false);

  const [loading, setLoading] = useState(Boolean(token));
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  const [resendEmail, setResendEmail] = useState(email);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    setResendEmail(email);
  }, [email]);

  useEffect(() => {
    if (!resendCooldown) return;
    const t = setInterval(() => {
      setResendCooldown((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    const run = async () => {
      if (!token || verifyStarted.current) return;
      verifyStarted.current = true;

      setLoading(true);
      setMessage("");

      try {
        const res = await verifyEmail(email ? { token, email } : { token });
        const jwt = res?.data?.token;
        if (jwt) {
          sessionStorage.setItem(AUTH_TOKEN_KEY, String(jwt));
        }

        const alreadyVerified = res?.data?.data?.alreadyVerified === true;
        const userData = await refreshUser().catch(() => null);
        setSuccess(true);

        if (alreadyVerified && !userData) {
          setNotice("Your email address is already verified. Please sign in to continue.");
          return;
        }

        if (userData && !userData.church) {
          navigate("/register-church", { replace: true });
        } else if (userData) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      } catch (err) {
        verifyStarted.current = false;
        setSuccess(false);
        setMessage(err?.response?.data?.message || "Email verification failed");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [navigate, refreshUser, token, email]);

  // Poll while waiting so that verifying on another device (e.g. phone)
  // automatically continues the flow on this device too.
  useEffect(() => {
    if (token || !session) return undefined;

    let cancelled = false;
    let claiming = false;

    const claim = async () => {
      if (cancelled || claiming) return;
      claiming = true;
      try {
        const res = await checkVerificationStatus({ session });
        if (cancelled || !res?.data?.data?.verified) return;

        const jwt = res?.data?.token;
        if (jwt) {
          sessionStorage.setItem(AUTH_TOKEN_KEY, String(jwt));
        }

        const userData = await refreshUser().catch(() => null);
        if (cancelled) return;
        setSuccess(true);

        if (userData && !userData.church) {
          navigate("/register-church", { replace: true });
        } else if (userData) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      } catch {
        // Invalid/expired session — stop polling and keep the manual instructions.
        cancelled = true;
      } finally {
        claiming = false;
      }
    };

    const interval = setInterval(claim, 4000);
    claim();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, session, navigate, refreshUser]);

  const showInstructions = !token && !loading && !success;

  const handleResend = async () => {
    const e = String(resendEmail || "").trim();
    if (!e) {
      setResendError("Please enter your email address.");
      return;
    }

    setResendLoading(true);
    setResendMessage("");
    setResendError("");

    try {
      const res = await resendEmailVerification({ email: e });
      setResendMessage(res?.data?.message || "Verification email sent.");
      setResendCooldown(30);
    } catch (err) {
      setResendError(err?.response?.data?.message || "Failed to resend verification email");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthCard
      title="Verify your email"
      subtitle="Please verify your email address to continue"
      footer={
        <div className="space-y-3">
          <div className="text-gray-600 text-sm">
            Already verified?{" "}
            <Link to="/login" className="font-semibold text-blue-900 hover:underline">
              Sign in
            </Link>
          </div>
          <div className="text-gray-500 text-sm">
            <Link to="/" className="hover:text-blue-900 hover:underline">
              Back to home
            </Link>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="text-gray-700 text-sm">Verifying your email…</div>
      ) : message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">{message}</div>
      ) : notice ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700 text-sm">{notice}</div>
      ) : null}

      {showInstructions ? (
        <div className="space-y-3 text-gray-700 text-sm">
          <p>
            We&apos;ve sent a verification link to{email ? ` ${email}` : " your email"}. Please open the email and click the
            verification link.
          </p>
          <p className="text-gray-600">
            If you don&apos;t see it, check your spam folder.
          </p>
          {session ? (
            <p className="text-gray-500 text-xs">
              Waiting for verification… This page will continue automatically once your email is verified, even on
              another device.
            </p>
          ) : null}

          <div className="pt-1">
            <label className="block font-semibold text-gray-600 mb-1 text-xs">Email address</label>
            <input
              type="email"
              value={resendEmail}
              onChange={(ev) => setResendEmail(ev.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
              autoComplete="email"
            />
          </div>

          {resendError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">{resendError}</div>
          ) : null}
          {resendMessage ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700 text-sm">{resendMessage}</div>
          ) : null}

          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || resendCooldown > 0}
            className="w-full bg-blue-900 text-white py-2.5 rounded-lg font-semibold shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm"
          >
            {resendLoading
              ? "Sending…"
              : resendCooldown > 0
                ? `Resend email (${resendCooldown}s)`
                : "Resend email"}
          </button>
        </div>
      ) : null}
    </AuthCard>
  );
}

export default VerifyEmail;
