import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthCard from "../components/AuthCard.jsx";
import { resendEmailVerification, verifyEmail } from "../services/auth.api.js";
import { useAuth } from "../useAuth.js";

const AUTH_TOKEN_KEY = "cckAuthToken";

function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();

  const token = useMemo(() => String(searchParams.get("token") || "").trim(), [searchParams]);
  const email = useMemo(() => String(searchParams.get("email") || "").trim(), [searchParams]);

  const [loading, setLoading] = useState(Boolean(token));
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

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
      if (!token) return;

      setLoading(true);
      setMessage("");

      try {
        const res = await verifyEmail({ token });
        const jwt = res?.data?.token;
        if (jwt) {
          sessionStorage.setItem(AUTH_TOKEN_KEY, String(jwt));
        }

        const userData = await refreshUser();
        setSuccess(true);

        const needsChurch = userData && !userData.church;
        if (needsChurch) {
          navigate("/register-church", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch (err) {
        setSuccess(false);
        setMessage(err?.response?.data?.message || "Email verification failed");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [navigate, refreshUser, token]);

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
          <div className="text-sm text-gray-600">
            Already verified?{" "}
            <Link to="/login" className="font-semibold text-blue-900 hover:underline">
              Sign in
            </Link>
          </div>
          <div className="text-sm text-gray-500">
            <Link to="/" className="hover:text-blue-900 hover:underline">
              Back to home
            </Link>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="text-sm text-gray-700">Verifying your email…</div>
      ) : message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div>
      ) : null}

      {showInstructions ? (
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            We&apos;ve sent a verification link to{email ? ` ${email}` : " your email"}. Please open the email and click the
            verification link.
          </p>
          <p className="text-gray-600">
            If you don&apos;t see it, check your spam folder.
          </p>

          <div className="pt-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email address</label>
            <input
              type="email"
              value={resendEmail}
              onChange={(ev) => setResendEmail(ev.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
              autoComplete="email"
            />
          </div>

          {resendError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{resendError}</div>
          ) : null}
          {resendMessage ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{resendMessage}</div>
          ) : null}

          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || resendCooldown > 0}
            className="w-full bg-blue-900 text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-800 disabled:opacity-50"
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
