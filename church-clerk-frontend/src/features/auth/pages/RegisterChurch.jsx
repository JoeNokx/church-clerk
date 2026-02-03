import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth.js";
import { createChurch } from "../../church/services/church.api.js";
import AuthCard from "../components/AuthCard.jsx";

function RegisterChurch() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState("");
  const [type, setType] = useState("Headquarters");
  const [parentChurchId, setParentChurchId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [foundedDate, setFoundedDate] = useState("");
  const [referralCodeInput, setReferralCodeInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegisterChurch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createChurch({
        name,
        type,
        parentChurchId: type === "Branch" ? parentChurchId : undefined,
        phoneNumber,
        email,
        streetAddress,
        city,
        region,
        country,
        foundedDate,
        referralCodeInput,
      });

      try {
        await refreshUser();
      } catch (e) {
        void e;
      }

      // redirect to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Register your church" subtitle="Tell us about your ministry">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleRegisterChurch} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Church Name</label>
          <input
            type="text"
            placeholder="Your church name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Church Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
          >
            <option value="Headquarters">Headquarters</option>
            <option value="Branch">Branch</option>
            <option value="Independent">Independent</option>
          </select>
        </div>

        {type === "Branch" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Church ID (HQ)</label>
            <input
              type="text"
              placeholder="Enter headquarters church ID"
              value={parentChurchId}
              onChange={(e) => setParentChurchId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
              required
            />
          </div>
        )}

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
          <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address (optional)</label>
          <input
            type="text"
            placeholder="Street address"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Region (optional)</label>
          <input
            type="text"
            placeholder="State / Region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country (optional)</label>
          <input
            type="text"
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Founded Date (optional)</label>
          <input
            type="date"
            value={foundedDate}
            onChange={(e) => setFoundedDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Referral Code (optional)</label>
          <input
            type="text"
            placeholder="Referral code"
            value={referralCodeInput}
            onChange={(e) => setReferralCodeInput(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-900 text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Register Church"}
        </button>
      </form>
    </AuthCard>
  );
}

export default RegisterChurch;
