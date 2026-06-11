import { useState } from "react";
import { Link } from "react-router-dom";
import AuthCard from "../components/AuthCard.jsx";
import { forgotPassword } from "../services/auth.api.js";
import { validateForm, hasErrors } from "../../../shared/utils/validate.js";
import { forgotPasswordSchema } from "../auth.schemas.js";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const errs = validateForm(forgotPasswordSchema, { email });
    if (hasErrors(errs)) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await forgotPassword({ email });
      setSuccess(res?.data?.message || "If an account exists for that email, a reset link has been sent.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to request password reset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Forgot password"
      subtitle="We’ll email you a password reset link"
      footer={
        <div className="space-y-3">
          <div className="text-gray-600 text-sm">
            <Link to="/login" className="font-semibold text-blue-900 hover:underline">
              Back to login
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
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">{error}</div> : null}
      {success ? (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700 text-sm">{success}</div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-900 text-white py-3 md:py-2.5 rounded-lg font-semibold shadow-sm hover:bg-blue-800 active:bg-blue-950 disabled:opacity-50 text-sm"
        >
          {loading ? "Sending link..." : "Send reset link"}
        </button>
      </form>
    </AuthCard>
  );
}

export default ForgotPassword;
