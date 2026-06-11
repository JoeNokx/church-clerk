import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth.js";
import { registerUser } from "../services/auth.api.js";
import AuthCard from "../components/AuthCard.jsx";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";
import { validateForm, hasErrors } from "../../../shared/utils/validate.js";
import { registerSchema } from "../auth.schemas.js";

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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    const errs = validateForm(registerSchema, { fullName, email, phoneNumber, password });
    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      errs.phoneNumber = "Enter a valid phone number";
    }
    if (hasErrors(errs)) {
      setFieldErrors(errs);
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
    }
  };

  return (
    <AuthCard
      title="Create an account"
      subtitle="Start by creating your admin account"
      footer={
        <div className="text-gray-600 text-sm">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-blue-900 hover:underline">
            Sign in
          </a>
        </div>
      }
    >
      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Full Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); setFieldErrors((p) => ({ ...p, fullName: undefined })); }}
            className={`w-full border rounded-lg px-3 py-3 md:py-2.5 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 text-sm ${
              fieldErrors.fullName
                ? "border-red-500 focus:ring-red-400 focus:border-red-500"
                : "border-gray-300 focus:ring-blue-900 focus:border-blue-900"
            }`}
          />
          {fieldErrors.fullName && <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>}
        </div>

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
          <label className="block font-medium text-gray-700 mb-1 text-sm">Phone Number</label>
          <PhoneNumberInput
            value={phoneNumber}
            onChange={(v) => { setPhoneNumber(v); setFieldErrors((p) => ({ ...p, phoneNumber: undefined })); }}
            error={Boolean(fieldErrors.phoneNumber)}
            inputClassName={`w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 ${
              fieldErrors.phoneNumber
                ? "border-red-500 focus:ring-red-400 focus:border-red-500"
                : "border-gray-300 focus:ring-blue-900 focus:border-blue-900"
            }`}
          />
          {fieldErrors.phoneNumber && <p className="mt-1 text-xs text-red-600">{fieldErrors.phoneNumber}</p>}
        </div>

        <div>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Create a password (min. 8 characters)"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
              className={`w-full border rounded-lg px-3 pr-10 py-3 md:py-2.5 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 text-sm ${
                fieldErrors.password
                  ? "border-red-500 focus:ring-red-400 focus:border-red-500"
                  : "border-gray-300 focus:ring-blue-900 focus:border-blue-900"
              }`}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-900 text-white py-3 md:py-2.5 rounded-lg font-semibold shadow-sm hover:bg-blue-800 active:bg-blue-950 disabled:opacity-50 text-sm"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}

export default Register;
