import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthCard from "../components/AuthCard.jsx";
import { verifyEmail } from "../services/auth.api.js";
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
        </div>
      ) : null}
    </AuthCard>
  );
}

export default VerifyEmail;
