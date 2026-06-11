import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth.js";
import AuthCard from "../components/AuthCard.jsx";
import { validateForm, hasErrors } from "../../../shared/utils/validate.js";
import { loginSchema } from "../auth.schemas.js";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const errs = validateForm(loginSchema, { email, password });
    if (hasErrors(errs)) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const userData = await login({ email, password, rememberMe });

      const needsChurch = userData && !userData.church;

      if (needsChurch) {
        navigate("/register-church", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      if (err?.response?.data?.needsEmailVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`, { replace: true });
        return;
      }

      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Welcome Back"
      subtitle="Sign in to access your account"
      footer={
        <div className="space-y-3">
          <div className="text-gray-600 text-sm">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-semibold text-blue-900 hover:underline">
              Create one
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
      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Email Address</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
            className={`w-full border rounded-lg px-3 py-3 md:py-2.5 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 text-sm ${
              fieldErrors.email
                ? "border-red-500 focus:ring-red-400 focus:border-red-500"
                : "border-gray-300 focus:ring-blue-900 focus:border-blue-900"
            }`}
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
        </div>

        <div>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
            className={`w-full border rounded-lg px-3 py-3 md:py-2.5 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 text-sm ${
              fieldErrors.password
                ? "border-red-500 focus:ring-red-400 focus:border-red-500"
                : "border-gray-300 focus:ring-blue-900 focus:border-blue-900"
            }`}
          />
          {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
        </div>

        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-gray-600 text-sm">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-900 focus:ring-blue-900"
            />
            Remember me
          </label>

          <Link to="/forgot-password" className="font-medium text-blue-900 hover:underline text-sm">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-900 text-white py-3 md:py-2.5 rounded-lg font-semibold shadow-sm hover:bg-blue-800 active:bg-blue-950 disabled:opacity-50 text-sm"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </AuthCard>
  );
}

export default Login;
