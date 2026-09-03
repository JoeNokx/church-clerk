import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth.js";
import { registerUser } from "../services/auth.api.js";
import AuthCard from "../components/AuthCard.jsx";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";
import { validateForm, hasErrors } from "../../../shared/utils/validate.js";
import { registerSchema } from "../auth.schemas.js";
import Button from "../../../shared/components/Button/index.jsx";

function Register() {
  const navigate = useNavigate();
  const { setUser, refreshUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    const errs = validateForm(registerSchema, { fullName, email, phoneNumber, password });
    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      errs.phoneNumber = "Enter a valid phone number";
    }
    if (hasErrors(errs)) {
      setFieldErrors(errs);
      setIsSubmitting(false);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await registerUser({ fullName, email, phoneNumber, password });

      // Set user in context
      if (res?.data?.data?.user) setUser(res.data.data.user);

      let serverUser = null;
      try {
        serverUser = await refreshUser();
      } catch (e) {
        void e;
      }

      const nextStep = res?.data?.data?.nextStep;
      const effectiveUser = serverUser || res?.data?.data?.user;

      const needsChurch = effectiveUser && !effectiveUser.church;

      if (nextStep === "email-verification") {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`, { replace: true });
        return;
      }

      // Redirect to church registration if backend says nextStep
      if (nextStep === "church-registration" || needsChurch) {
        navigate("/register-church", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }

    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Something went wrong");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create an account"
      subtitle="Start by creating your admin account"
      footer={
        <div className="space-y-3">
          <div className="text-slate-500 text-sm">
            Already have an account?{" "}
            <a href="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
              Sign in
            </a>
          </div>
          <div className="text-slate-400 text-sm">
            <a href="/" className="hover:text-blue-600 hover:underline">
              ← Back to home
            </a>
          </div>
        </div>
      }
    >
      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); setFieldErrors((p) => ({ ...p, fullName: undefined })); }}
            className={`w-full rounded-xl border px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-2 ${
              fieldErrors.fullName
                ? "border-red-400 focus:ring-red-300 focus:border-red-400"
                : "border-slate-200 focus:ring-blue-500/30 focus:border-blue-500"
            }`}
          />
          {fieldErrors.fullName && <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
            className={`w-full rounded-xl border px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-2 ${
              fieldErrors.email
                ? "border-red-400 focus:ring-red-300 focus:border-red-400"
                : "border-slate-200 focus:ring-blue-500/30 focus:border-blue-500"
            }`}
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
          <PhoneNumberInput
            value={phoneNumber}
            onChange={(v) => { setPhoneNumber(v); setFieldErrors((p) => ({ ...p, phoneNumber: undefined })); }}
            error={Boolean(fieldErrors.phoneNumber)}
            inputClassName={`w-full rounded-xl border px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-2 ${
              fieldErrors.phoneNumber
                ? "border-red-400 focus:ring-red-300 focus:border-red-400"
                : "border-slate-200 focus:ring-blue-500/30 focus:border-blue-500"
            }`}
          />
          {fieldErrors.phoneNumber && <p className="mt-1 text-xs text-red-600">{fieldErrors.phoneNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Create a password (min. 8 characters)"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
              className={`w-full rounded-xl border px-4 pr-11 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-2 ${
                fieldErrors.password
                  ? "border-red-400 focus:ring-red-300 focus:border-red-400"
                  : "border-slate-200 focus:ring-blue-500/30 focus:border-blue-500"
              }`}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
        </div>

        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          loadingText="Creating account..."
          className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          Create Account
        </Button>
      </form>
    </AuthCard>
  );
}

export default Register;
