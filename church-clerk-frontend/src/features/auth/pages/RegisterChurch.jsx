import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth.js";
import { createChurch, searchHeadquartersChurches } from "../../church/services/church.api.js";
import AuthCard from "../components/AuthCard.jsx";
import Select from "react-select";
import { Country, State } from "country-state-city";
import currencyCodes from "currency-codes";

function RegisterChurch() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState("");
  const [pastor, setPastor] = useState("");
  const [type, setType] = useState("Headquarters");
  const [parentChurchId, setParentChurchId] = useState("");
  const [headquarterChurchId, setHeadquarterChurchId] = useState("");
  const [hqSearch, setHqSearch] = useState("");
  const [hqDropdownOpen, setHqDropdownOpen] = useState(false);
  const [hqLoading, setHqLoading] = useState(false);
  const [hqMessage, setHqMessage] = useState("");
  const [hqResults, setHqResults] = useState([]);
  const hqBoxRef = useRef(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [foundedDate, setFoundedDate] = useState("");
  const [referralCodeInput, setReferralCodeInput] = useState("");

  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");

  const countryOptions = useMemo(() => {
    return Country.getAllCountries().map((c) => ({
      value: c.isoCode,
      label: c.name
    }));
  }, []);

  const stateOptions = useMemo(() => {
    if (!countryCode) return [];
    return State.getStatesOfCountry(countryCode).map((s) => ({
      value: s.isoCode,
      label: s.name
    }));
  }, [countryCode]);

  const selectedCountryOption = useMemo(() => {
    if (!countryCode) return null;
    return countryOptions.find((o) => String(o.value) === String(countryCode)) || null;
  }, [countryCode, countryOptions]);

  const selectedStateOption = useMemo(() => {
    if (!stateCode) return null;
    return stateOptions.find((o) => String(o.value) === String(stateCode)) || null;
  }, [stateCode, stateOptions]);

  const currencyOptions = useMemo(() => {
    const rows = Array.isArray(currencyCodes?.data) ? currencyCodes.data : [];
    if (rows.length) {
      return rows
        .filter((r) => r?.code)
        .map((r) => ({
          value: String(r.code).toUpperCase(),
          label: `${String(r.code).toUpperCase()} - ${String(r.currency || "").trim() || String(r.code).toUpperCase()}`
        }));
    }

    const codes = typeof currencyCodes?.codes === "function" ? currencyCodes.codes() : [];
    return (Array.isArray(codes) ? codes : []).map((c) => ({
      value: String(c).toUpperCase(),
      label: String(c).toUpperCase()
    }));
  }, []);

  const selectedCurrencyOption = useMemo(() => {
    const cur = String(currency || "").trim().toUpperCase();
    if (!cur) return null;
    return currencyOptions.find((o) => String(o.value) === cur) || { value: cur, label: cur };
  }, [currency, currencyOptions]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isBranch = type === "Branch";

  const selectedHqLabel = useMemo(() => {
    const row = hqResults.find((r) => r?._id === headquarterChurchId);
    if (!row) return "";
    const location = `${row?.city || ""}${row?.region ? `, ${row.region}` : ""}`.trim();
    return location ? `${row?.name || ""} (${location})` : `${row?.name || ""}`;
  }, [headquarterChurchId, hqResults]);

  useEffect(() => {
    if (!isBranch) {
      setParentChurchId("");
      setHeadquarterChurchId("");
      setHqSearch("");
      setHqResults([]);
      setHqMessage("");
      setHqDropdownOpen(false);
      setHqLoading(false);
    }
  }, [isBranch]);

  useEffect(() => {
    const handleOutside = (event) => {
      const el = hqBoxRef.current;
      if (!el) return;
      if (el.contains(event.target)) return;
      setHqDropdownOpen(false);
    };

    if (hqDropdownOpen) {
      document.addEventListener("mousedown", handleOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [hqDropdownOpen]);

  useEffect(() => {
    if (!isBranch) return;

    if (parentChurchId && !hqDropdownOpen) {
      setHqLoading(false);
      return;
    }

    const q = String(hqSearch || "").trim();
    if (!q) {
      setHqLoading(false);
      setHqMessage("");
      setHqResults([]);
      return;
    }

    setHqLoading(true);
    setHqMessage("");

    const t = setTimeout(async () => {
      try {
        const res = await searchHeadquartersChurches({ search: q });
        const data = res?.data;

        if (Array.isArray(data)) {
          setHqResults(data);
          setHqMessage(data.length ? "" : "No church matched your search");
          return;
        }

        const rows = Array.isArray(data?.churches) ? data.churches : [];
        setHqResults(rows);
        setHqMessage(data?.message || (rows.length ? "" : "No church matched your search"));
      } catch (e) {
        setHqResults([]);
        setHqMessage(e?.response?.data?.message || e?.message || "Failed to search churches");
      } finally {
        setHqLoading(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [hqDropdownOpen, hqSearch, isBranch, parentChurchId]);

  const handleRegisterChurch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (type === "Branch" && !parentChurchId) {
      setLoading(false);
      setError("Please select a headquarters church from the list");
      return;
    }

    if (!String(country || "").trim()) {
      setLoading(false);
      setError("Country is required");
      return;
    }

    if (!String(region || "").trim()) {
      setLoading(false);
      setError("State/Region is required");
      return;
    }

    if (!String(city || "").trim()) {
      setLoading(false);
      setError("Location is required");
      return;
    }

    if (!String(currency || "").trim()) {
      setLoading(false);
      setError("Currency is required");
      return;
    }

    try {
      await createChurch({
        name,
        pastor,
        type,
        parentChurchId: type === "Branch" ? parentChurchId : undefined,
        phoneNumber,
        email,
        city,
        region,
        country,
        currency: String(currency || "").trim().toUpperCase(),
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Pastor's Name</label>
          <input
            type="text"
            placeholder="Pastor's full name"
            value={pastor}
            onChange={(e) => setPastor(e.target.value)}
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
          <div ref={hqBoxRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Church ID (HQ)</label>
            <input type="hidden" name="parentId" value={parentChurchId} />
            <input
              type="text"
              placeholder="Search headquarters church"
              value={hqSearch}
              onChange={(e) => {
                setHqSearch(e.target.value);
                setParentChurchId("");
                setHeadquarterChurchId("");
                setHqDropdownOpen(true);
              }}
              onFocus={() => setHqDropdownOpen(true)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
              required
            />

            {selectedHqLabel && parentChurchId ? (
              <div className="mt-1 text-xs text-gray-500">Selected: {selectedHqLabel}</div>
            ) : null}

            {hqDropdownOpen ? (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  {hqLoading ? (
                    <div className="px-4 py-3 text-sm text-gray-600">Searching…</div>
                  ) : hqMessage && !hqResults.length ? (
                    <div className="px-4 py-3 text-sm text-gray-600">{hqMessage}</div>
                  ) : hqResults.length ? (
                    hqResults.map((c) => (
                      <button
                        key={c?._id}
                        type="button"
                        onClick={() => {
                          setParentChurchId(c?._id || "");
                          setHeadquarterChurchId(c?._id || "");
                          const location = `${c?.city || ""}${c?.region ? `, ${c.region}` : ""}`.trim();
                          setHqSearch(c?.name ? `${c.name}${location ? ` (${location})` : ""}` : "");
                          setHqDropdownOpen(false);
                          setHqMessage("");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50"
                      >
                        <div className="text-sm font-semibold text-gray-900 truncate">{c?.name || "—"}</div>
                        <div className="mt-0.5 text-xs text-gray-600 truncate">
                          {`${c?.city || ""}${c?.region ? `, ${c.region}` : ""}`.trim() || "—"}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500 truncate">
                          Pastor: {c?.createdBy?.fullName || "—"}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-600">Type to search headquarters churches.</div>
                  )}
                </div>
              </div>
            ) : null}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <Select
            inputId="church-country"
            isSearchable
            options={countryOptions}
            value={selectedCountryOption}
            onChange={(opt) => {
              setCountry(String(opt?.label || ""));
              setCountryCode(String(opt?.value || ""));
              setRegion("");
              setStateCode("");
              setCity("");
              const nextCurrency = String(opt?.label || "").trim().toLowerCase() === "ghana" ? "GHS" : "USD";
              setCurrency(nextCurrency);
            }}
            placeholder="Select country"
            styles={{
              control: (base, state) => ({
                ...base,
                minHeight: "44px",
                borderRadius: "0.5rem",
                borderColor: state.isFocused ? "#1e3a8a" : "#d1d5db",
                boxShadow: state.isFocused ? "0 0 0 2px rgba(30,58,138,0.2)" : "none",
                ":hover": { borderColor: state.isFocused ? "#1e3a8a" : "#9ca3af" }
              }),
              valueContainer: (base) => ({ ...base, padding: "0 0.75rem" }),
              input: (base) => ({ ...base, margin: 0, padding: 0 }),
              placeholder: (base) => ({ ...base, color: "#9ca3af" }),
              singleValue: (base) => ({ ...base, color: "#111827" })
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State / Region</label>
          <Select
            inputId="church-state"
            isSearchable
            isDisabled={!countryCode}
            options={stateOptions}
            value={selectedStateOption}
            onChange={(opt) => {
              setRegion(String(opt?.label || ""));
              setStateCode(String(opt?.value || ""));
              setCity("");
            }}
            placeholder={countryCode ? "Select state/region" : "Select country first"}
            styles={{
              control: (base, state) => ({
                ...base,
                minHeight: "44px",
                borderRadius: "0.5rem",
                borderColor: state.isFocused ? "#1e3a8a" : "#d1d5db",
                boxShadow: state.isFocused ? "0 0 0 2px rgba(30,58,138,0.2)" : "none",
                ":hover": { borderColor: state.isFocused ? "#1e3a8a" : "#9ca3af" }
              }),
              valueContainer: (base) => ({ ...base, padding: "0 0.75rem" }),
              input: (base) => ({ ...base, margin: 0, padding: 0 }),
              placeholder: (base) => ({ ...base, color: "#9ca3af" }),
              singleValue: (base) => ({ ...base, color: "#111827" })
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            placeholder="Enter your location"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <Select
            inputId="church-currency"
            isSearchable
            options={currencyOptions}
            value={selectedCurrencyOption}
            onChange={(opt) => setCurrency(String(opt?.value || "").toUpperCase())}
            placeholder="Select currency"
            styles={{
              control: (base, state) => ({
                ...base,
                minHeight: "44px",
                borderRadius: "0.5rem",
                borderColor: state.isFocused ? "#1e3a8a" : "#d1d5db",
                boxShadow: state.isFocused ? "0 0 0 2px rgba(30,58,138,0.2)" : "none",
                ":hover": { borderColor: state.isFocused ? "#1e3a8a" : "#9ca3af" }
              }),
              valueContainer: (base) => ({ ...base, padding: "0 0.75rem" }),
              input: (base) => ({ ...base, margin: 0, padding: 0 }),
              placeholder: (base) => ({ ...base, color: "#9ca3af" }),
              singleValue: (base) => ({ ...base, color: "#111827" })
            }}
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
          disabled={loading || (type === "Branch" && !parentChurchId)}
          className="w-full bg-blue-900 text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Register Church"}
        </button>
      </form>
    </AuthCard>
  );
}

export default RegisterChurch;
