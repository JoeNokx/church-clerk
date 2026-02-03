import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth.js";
import { registerUser } from "../services/auth.api.js";
import AuthCard from "../components/AuthCard.jsx";

function Register() {
  const navigate = useNavigate();
  const { setUser, refreshUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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

      const needsChurch =
        effectiveUser && !effectiveUser.church && effectiveUser.role !== "superadmin";

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
        <div className="text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-blue-900 hover:underline">
            Sign in
          </a>
        </div>
      }
    >
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="text"
            placeholder="+1 (555) 000-0000"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-900 text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}

export default Register;
