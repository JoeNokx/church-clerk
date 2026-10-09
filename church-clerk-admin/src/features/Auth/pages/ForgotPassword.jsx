import { useState } from "react";
import { Link } from "react-router-dom";
import AuthCard from "../components/AuthCard.jsx";
import { forgotAdminPassword } from "../services/auth.api.js";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotAdminPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Reset Password"
      subtitle="Enter your admin email address and we'll send you a reset link"
      footer={
        <div className="text-sm text-gray-500">
          <Link to="/admin/login" className="font-semibold text-blue-900 hover:text-blue-700 hover:underline">
            ← Back to login
          </Link>
        </div>
      }
    >
      {submitted ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <p className="font-semibold">Check your email</p>
          <p className="mt-1">If an admin account exists for <strong>{email}</strong>, a password reset link has been sent. The link expires in 1 hour.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}

export default ForgotPassword;
