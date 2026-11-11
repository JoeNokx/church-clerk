import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth.js";
import { createChurch, searchHeadquartersChurches, searchBranchChurches } from "../../church/services/church.api.js";
import AuthCard from "../components/AuthCard.jsx";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";
import Select from "react-select";
import currencyCodes from "currency-codes";
import { Country, State } from "country-state-city";
import { AFRICAN_COUNTRY_CODES } from "../../../shared/utils/africanCountries.js";
import { AFRICAN_CURRENCY_CODES } from "../../../shared/utils/africanCurrencies.js";
import Button from "../../../shared/components/Button/index.jsx";
import { focusFirstInvalid, fieldFromServerMessage } from "../utils/fieldErrors.js";

const STEPS = [
  { label: "Church", fields: ["name", "type", "parentChurch"] },
  { label: "Contact", fields: ["pastor", "phoneNumber", "email"] },
  { label: "Location", fields: ["country", "region", "city"] },
  { label: "Finish", fields: ["currency", "referralCodeInput"] }
];

function RegisterChurch() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const isLastStep = step === STEPS.length - 1;
  const formRef = useRef(null);
  const focusPendingRef = useRef(false);

  useEffect(() => {
    if (user?.isEmailVerified === false) {
      const email = user?.email ? `?email=${encodeURIComponent(user.email)}` : "";
      navigate(`/verify-email${email}`, { replace: true });
    }
  }, [navigate, user]);

  const [name, setName] = useState("");
  const [pastor, setPastor] = useState("");
  const [type, setType] = useState("");
  const [parentChurchId, setParentChurchId] = useState("");
  const [headquarterChurchId, setHeadquarterChurchId] = useState("");
  const [hqSearch, setHqSearch] = useState("");
  const [hqDropdownOpen, setHqDropdownOpen] = useState(false);
  const [hqLoading, setHqLoading] = useState(false);
  const [hqMessage, setHqMessage] = useState("");
  const [hqResults, setHqResults] = useState([]);
  const hqBoxRef = useRef(null);
  const branchBoxRef = useRef(null);

  const [selectedBranches, setSelectedBranches] = useState([]);
  const [branchSearch, setBranchSearch] = useState("");
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchMessage, setBranchMessage] = useState("");
  const [branchResults, setBranchResults] = useState([]);

  const isHeadquarters = type === "Headquarters";
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("Ghana");
  const [currency, setCurrency] = useState("GHS");
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [foundedDate, setFoundedDate] = useState("");
  const [registerAsMember, setRegisterAsMember] = useState(true);
  const [referralCodeInput, setReferralCodeInput] = useState("");

  const countryOptions = useMemo(() => {
    const allow = new Set(AFRICAN_COUNTRY_CODES);
    return Country.getAllCountries()
      .filter((c) => allow.has(String(c?.isoCode || "").trim()))
      .map((c) => ({ value: c.isoCode, label: c.name }));
  }, []);

  const selectedCountryOption = useMemo(() => {
    const label = String(country || "").trim().toLowerCase();
    if (!label) return null;
    return countryOptions.find((o) => String(o.label || "").trim().toLowerCase() === label) || null;
  }, [country, countryOptions]);

  const regionOptions = useMemo(() => {
    const code = String(selectedCountryOption?.value || "").trim();
    if (!code) return [];
    if (!AFRICAN_COUNTRY_CODES.includes(code)) return [];
    return State.getStatesOfCountry(code).map((s) => ({ value: s.isoCode, label: s.name }));
  }, [selectedCountryOption?.value]);

  const selectedRegionOption = useMemo(() => {
    const label = String(region || "").trim().toLowerCase();
    if (!label) return null;
    return regionOptions.find((o) => String(o.label || "").trim().toLowerCase() === label) || null;
  }, [region, regionOptions]);

  const selectStyles = useMemo(() => {
    const build = (hasError) => ({
      control: (base, state) => ({
        ...base,
        minHeight: "44px",
        borderRadius: "0.5rem",
        borderColor: hasError ? "#ef4444" : state.isFocused ? "#1e3a8a" : "#d1d5db",
        boxShadow: state.isFocused ? (hasError ? "0 0 0 2px rgba(239,68,68,0.25)" : "0 0 0 2px rgba(30,58,138,0.2)") : "none",
        ":hover": { borderColor: hasError ? "#ef4444" : state.isFocused ? "#1e3a8a" : "#9ca3af" }
      }),
      valueContainer: (base) => ({ ...base, padding: "0 0.75rem" }),
      input: (base) => ({ ...base, margin: 0, padding: 0 }),
      placeholder: (base) => ({ ...base, color: "#9ca3af" }),
      singleValue: (base) => ({ ...base, color: "#111827" })
    });
    return { normal: build(false), error: build(true) };
  }, []);

  const [fieldErrors, setFieldErrors] = useState({});
  const clearFieldError = (key) => setFieldErrors((p) => (p[key] ? { ...p, [key]: undefined } : p));
  const inputCls = (key) =>
    `w-full border rounded-lg px-3 py-3 md:py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 text-sm ${
      fieldErrors[key] ? "border-red-500 focus:ring-red-400 focus:border-red-500" : "border-gray-300 focus:ring-blue-900 focus:border-blue-900"
    }`;
  const fieldError = (key) => (fieldErrors[key] ? <p className="mt-1 text-xs text-red-600">{fieldErrors[key]}</p> : null);

  const countryCurrencyByIso = useMemo(() => {
    const map = new Map();
    Country.getAllCountries().forEach((c) => {
      const iso = String(c?.isoCode || "").trim();
      const cur = String(c?.currency || "").trim().toUpperCase();
      if (!iso || !cur) return;
      map.set(iso, cur);
    });
    return map;
  }, []);

  const currencyOptions = useMemo(() => {
    const allow = new Set(AFRICAN_CURRENCY_CODES);
    const rows = Array.isArray(currencyCodes?.data) ? currencyCodes.data : [];
    if (rows.length) {
      return rows
        .filter((r) => r?.code && allow.has(String(r.code).toUpperCase()))
        .map((r) => ({
          value: String(r.code).toUpperCase(),
          label: `${String(r.code).toUpperCase()} - ${String(r.currency || "").trim() || String(r.code).toUpperCase()}`
        }));
    }

    const codes = typeof currencyCodes?.codes === "function" ? currencyCodes.codes() : [];
    return (Array.isArray(codes) ? codes : [])
      .map((c) => String(c).toUpperCase())
      .filter((c) => allow.has(c))
      .map((c) => ({ value: c, label: c }));
  }, []);

  const selectedCurrencyOption = useMemo(() => {
    const cur = String(currency || "").trim().toUpperCase();
    if (!cur) return null;
    if (!AFRICAN_CURRENCY_CODES.includes(cur)) return null;
    return currencyOptions.find((o) => String(o.value) === cur) || { value: cur, label: cur };
  }, [currency, currencyOptions]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!isHeadquarters) {
      setSelectedBranches([]);
      setBranchSearch("");
      setBranchResults([]);
      setBranchMessage("");
      setBranchDropdownOpen(false);
    }
  }, [isHeadquarters]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!branchBoxRef.current) return;
      if (branchBoxRef.current.contains(event.target)) return;
      setBranchDropdownOpen(false);
    };
    if (branchDropdownOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [branchDropdownOpen]);

  useEffect(() => {
    if (!isHeadquarters) return;
    const q = String(branchSearch || "").trim();
    if (!q) { setBranchResults([]); setBranchMessage(""); return; }
    setBranchLoading(true);
    setBranchMessage("");
    const t = setTimeout(async () => {
      try {
        const res = await searchBranchChurches({ search: q });
        const data = res?.data;
        const rows = Array.isArray(data) ? data : Array.isArray(data?.churches) ? data.churches : [];
        setBranchResults(rows);
        setBranchMessage(rows.length ? "" : (data?.message || "No branch matched your search"));
      } catch (e) {
        setBranchResults([]);
        setBranchMessage(e?.response?.data?.message || "Failed to search branches");
      } finally {
        setBranchLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [branchSearch, isHeadquarters]);

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

  const validateAll = () => {
    const errs = {};
    if (!name.trim()) errs.name = "Church name is required";
    if (!pastor.trim()) errs.pastor = "Pastor's name is required";
    if (!type) errs.type = "Church type is required";
    if (!phoneNumber) errs.phoneNumber = "Phone number is required";
    else if (!isValidPhoneNumber(phoneNumber)) errs.phoneNumber = "Enter a valid phone number";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Enter a valid email address";
    if (!String(country || "").trim()) errs.country = "Country is required";
    if (!String(region || "").trim()) errs.region = "Region is required";
    if (!String(city || "").trim()) errs.city = "City is required";
    if (!String(currency || "").trim()) errs.currency = "Currency is required";
    return errs;
  };

  // Show errors, jump to the earliest step that has one, and focus it after render.
  const showErrors = (errs) => {
    setFieldErrors(errs);
    const steps = Object.keys(errs).map((k) => STEPS.findIndex((s) => s.fields.includes(k))).filter((i) => i >= 0);
    if (steps.length) setStep(Math.min(...steps));
    focusPendingRef.current = true;
  };

  useEffect(() => {
    if (!focusPendingRef.current) return;
    focusPendingRef.current = false;
    focusFirstInvalid(formRef.current);
  }, [step, fieldErrors]);

  const goBack = () => {
    setFieldErrors({});
    setStep((s) => Math.max(0, s - 1));
  };

  const handleRegisterChurch = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");

    const allErrs = validateAll();

    if (!isLastStep) {
      const stepErrs = Object.fromEntries(Object.entries(allErrs).filter(([k]) => STEPS[step].fields.includes(k)));
      if (Object.keys(stepErrs).length) return showErrors(stepErrs);
      setFieldErrors({});
      setStep((s) => s + 1);
      return;
    }

    if (Object.keys(allErrs).length) return showErrors(allErrs);
    setFieldErrors({});

    setIsSubmitting(true);
    setLoading(true);

    try {
      await createChurch({
        name,
        pastor,
        type,
        parentChurchId: type === "Branch" ? parentChurchId : undefined,
        branchIds: type === "Headquarters" ? selectedBranches.map((b) => b._id) : undefined,
        phoneNumber,
        email,
        streetAddress,
        city,
        region,
        country,
        currency: String(currency || "").trim().toUpperCase(),
        foundedDate,
        referralCodeInput,
        registerAsMember,
      });

      try {
        await refreshUser();
      } catch (e) {
        void e;
      }

      // redirect to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong";
      const field = fieldFromServerMessage(msg, {
        parentChurch: ["hq", "headquarters"],
        currency: ["currency"],
        referralCodeInput: ["referral"],
        email: ["email"]
      });
      if (field) {
        showErrors({ [field]: msg });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard title="Register your church" subtitle="Tell us about your ministry">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">
          {error}
        </div>
      )}

      <ol className="mb-6 flex items-center" aria-label="Registration steps">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.label} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`} aria-current={active ? "step" : undefined}>
              <div className="flex flex-col items-center gap-1">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                    done ? "bg-blue-900 text-white" : active ? "border-2 border-blue-900 text-blue-900" : "border border-gray-300 text-gray-400"
                  }`}
                >
                  {done ? (
                    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M5 10.5l3 3 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={`text-[11px] font-medium ${active || done ? "text-gray-900" : "text-gray-400"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <span className={`mx-2 mb-5 h-px flex-1 ${done ? "bg-blue-900" : "bg-gray-200"}`} />}
            </li>
          );
        })}
      </ol>

      <form ref={formRef} onSubmit={handleRegisterChurch} noValidate className="space-y-4">
        {step === 0 && (<>
        <div data-invalid={Boolean(fieldErrors.name)}>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Church Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            placeholder="e.g. Grace Assembly Church"
            value={name}
            onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
            aria-invalid={Boolean(fieldErrors.name)}
            className={inputCls("name")}
          />
          {fieldError("name")}
        </div>

        <div data-invalid={Boolean(fieldErrors.type)}>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Church Type <span className="text-red-500">*</span></label>
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); clearFieldError("type"); }}
            aria-invalid={Boolean(fieldErrors.type)}
            className={`${inputCls("type")} ${type ? "" : "!text-gray-400"}`}
          >
            <option value="" disabled>Select type</option>
            <option value="Headquarters" className="text-gray-900">Headquarters</option>
            <option value="Branch" className="text-gray-900">Branch</option>
            <option value="Independent" className="text-gray-900">Independent</option>
          </select>
          {fieldError("type")}
        </div>

        {type === "Headquarters" && (
          <div ref={branchBoxRef} className="relative">
            <label className="block font-medium text-gray-700 mb-1 text-sm">Link Branch Churches (optional)</label>
            {selectedBranches.length > 0 && (
              <div className="mb-2 flex max-h-16 flex-wrap gap-2 overflow-y-auto no-scrollbar">
                {selectedBranches.map((b) => (
                  <span key={b._id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-blue-800 text-xs font-medium">
                    {b.name}
                    <button type="button" onClick={() => setSelectedBranches((prev) => prev.filter((x) => x._id !== b._id))} className="ml-0.5 text-blue-500 hover:text-blue-700">✕</button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder="Search branch churches to link"
              value={branchSearch}
              onChange={(e) => { setBranchSearch(e.target.value); setBranchDropdownOpen(true); }}
              onFocus={() => setBranchDropdownOpen(true)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 md:py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
            />
            {branchDropdownOpen && (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                <div className="max-h-44 overflow-y-auto no-scrollbar">
                  {branchLoading ? (
                    <div className="px-4 py-3 text-gray-600 text-sm">Searching…</div>
                  ) : branchMessage && !branchResults.length ? (
                    <div className="px-4 py-3 text-gray-600 text-sm">{branchMessage}</div>
                  ) : branchResults.length ? (
                    branchResults
                      .filter((c) => !selectedBranches.some((s) => s._id === c._id))
                      .map((c) => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => {
                            setSelectedBranches((prev) => [...prev, c]);
                            setBranchSearch("");
                            setBranchResults([]);
                            setBranchDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50"
                        >
                          <div className="font-semibold text-gray-900 truncate text-sm">{c.name || "—"}</div>
                          <div className="mt-0.5 text-gray-500 truncate text-xs">
                            {`${c.city || ""}${c.region ? `, ${c.region}` : ""}`.trim() || "—"}
                          </div>
                        </button>
                      ))
                  ) : (
                    <div className="px-4 py-3 text-gray-600 text-sm">Type to search branch churches.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {type === "Branch" && (
          <div ref={hqBoxRef} data-invalid={Boolean(fieldErrors.parentChurch)} className="relative">
            <label className="block font-medium text-gray-700 mb-1 text-sm">Parent Church ID (HQ) (optional)</label>
            <input type="hidden" name="parentId" value={parentChurchId} />
            <input
              type="text"
              placeholder="Search headquarters church (optional)"
              value={hqSearch}
              onChange={(e) => {
                setHqSearch(e.target.value);
                setParentChurchId("");
                setHeadquarterChurchId("");
                setHqDropdownOpen(true);
                clearFieldError("parentChurch");
              }}
              onFocus={() => setHqDropdownOpen(true)}
              aria-invalid={Boolean(fieldErrors.parentChurch)}
              className={inputCls("parentChurch")}
            />
            {fieldError("parentChurch")}

            {selectedHqLabel && parentChurchId ? (
              <div className="mt-1 text-gray-500 text-xs">Selected: {selectedHqLabel}</div>
            ) : null}

            {hqDropdownOpen ? (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                <div className="max-h-44 overflow-y-auto no-scrollbar">
                  {hqLoading ? (
                    <div className="px-4 py-3 text-gray-600 text-sm">Searching…</div>
                  ) : hqMessage && !hqResults.length ? (
                    <div className="px-4 py-3 text-gray-600 text-sm">{hqMessage}</div>
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
                        <div className="font-semibold text-gray-900 truncate text-sm">{c?.name || "—"}</div>
                        <div className="mt-0.5 text-gray-600 truncate text-xs">
                          {`${c?.city || ""}${c?.region ? `, ${c.region}` : ""}`.trim() || "—"}
                        </div>
                        <div className="mt-0.5 text-gray-500 truncate text-xs">
                          Pastor: {c?.createdBy?.fullName || "—"}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-600 text-sm">Type to search headquarters churches.</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
        </>)}

        {step === 1 && (<>
        <div data-invalid={Boolean(fieldErrors.pastor)}>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Pastor's Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            placeholder="e.g. Rev. John Mensah"
            value={pastor}
            onChange={(e) => { setPastor(e.target.value); clearFieldError("pastor"); }}
            aria-invalid={Boolean(fieldErrors.pastor)}
            className={inputCls("pastor")}
          />
          {fieldError("pastor")}
        </div>

        <div data-invalid={Boolean(fieldErrors.phoneNumber)}>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Church Phone Number <span className="text-red-500">*</span></label>
          <PhoneNumberInput
            value={phoneNumber}
            onChange={(v) => { setPhoneNumber(v); clearFieldError("phoneNumber"); }}
            inputClassName={inputCls("phoneNumber")}
          />
          {fieldError("phoneNumber")}
        </div>

        <div data-invalid={Boolean(fieldErrors.email)}>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Church Email (optional)</label>
          <input
            type="email"
            placeholder="e.g. name@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
            aria-invalid={Boolean(fieldErrors.email)}
            className={inputCls("email")}
          />
          {fieldError("email")}
        </div>
        </>)}

        {step === 2 && (<>
        <div data-invalid={Boolean(fieldErrors.country)}>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Country <span className="text-red-500">*</span></label>
          <Select
            inputId="church-country"
            isSearchable
            isClearable
            options={countryOptions}
            value={selectedCountryOption}
            aria-invalid={Boolean(fieldErrors.country)}
            onChange={(opt) => {
              clearFieldError("country");
              clearFieldError("region");
              if (!opt) {
                setCountry("");
                setRegion("");
                if (!currencyTouched) {
                  setCurrency("");
                }
                return;
              }

              const nextLabel = String(opt?.label || "");
              setCountry(nextLabel);
              setRegion("");

              if (currencyTouched) return;
              const iso = String(opt?.value || "").trim();
              const nextCurrency = String(countryCurrencyByIso.get(iso) || "").trim().toUpperCase();
              if (!nextCurrency) return;
              if (!AFRICAN_CURRENCY_CODES.includes(nextCurrency)) return;
              setCurrency(nextCurrency);
              clearFieldError("currency");
            }}
            placeholder="Select country"
            styles={fieldErrors.country ? selectStyles.error : selectStyles.normal}
          />
          {fieldError("country")}
        </div>

        <div data-invalid={Boolean(fieldErrors.region)}>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Region <span className="text-red-500">*</span></label>
          <Select
            inputId="church-region"
            isSearchable
            isClearable
            options={regionOptions}
            value={selectedRegionOption}
            aria-invalid={Boolean(fieldErrors.region)}
            onChange={(opt) => {
              clearFieldError("region");
              if (!opt) {
                setRegion("");
                return;
              }

              setRegion(String(opt?.label || ""));
            }}
            placeholder={selectedCountryOption ? "Select region" : "Select country first"}
            isDisabled={!selectedCountryOption}
            styles={fieldErrors.region ? selectStyles.error : selectStyles.normal}
          />
          {fieldError("region")}
        </div>

        <div data-invalid={Boolean(fieldErrors.city)}>
          <label className="block font-medium text-gray-700 mb-1 text-sm">City <span className="text-red-500">*</span></label>
          <input
            type="text"
            placeholder="e.g. Accra"
            value={city}
            onChange={(e) => { setCity(e.target.value); clearFieldError("city"); }}
            aria-invalid={Boolean(fieldErrors.city)}
            className={inputCls("city")}
          />
          {fieldError("city")}
        </div>

        <div>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Location (optional)</label>
          <input
            type="text"
            placeholder="e.g. 12 Main Street"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-3 md:py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
          />
        </div>
        </>)}

        {step === 3 && (<>
        <div data-invalid={Boolean(fieldErrors.currency)}>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Currency <span className="text-red-500">*</span></label>
          <Select
            inputId="church-currency"
            isSearchable
            options={currencyOptions}
            value={selectedCurrencyOption}
            aria-invalid={Boolean(fieldErrors.currency)}
            onChange={(opt) => {
              setCurrencyTouched(true);
              setCurrency(String(opt?.value || "").toUpperCase());
              clearFieldError("currency");
            }}
            placeholder="Select currency"
            styles={fieldErrors.currency ? selectStyles.error : selectStyles.normal}
          />
          {fieldError("currency")}
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 text-xs">
            <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true">
              <path
                d="M12 9v4m0 4h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>Currency can be updated, but it will be locked after you start making transactions.</div>
          </div>
        </div>

        <div>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Founded Date (optional)</label>
          <input
            type="date"
            value={foundedDate}
            onChange={(e) => setFoundedDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-3 md:py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
          />
        </div>

        <div data-invalid={Boolean(fieldErrors.referralCodeInput)}>
          <label className="block font-medium text-gray-700 mb-1 text-sm">Referral Code (optional)</label>
          <input
            type="text"
            placeholder="e.g. GRACE2026"
            value={referralCodeInput}
            onChange={(e) => { setReferralCodeInput(e.target.value); clearFieldError("referralCodeInput"); }}
            aria-invalid={Boolean(fieldErrors.referralCodeInput)}
            className={inputCls("referralCodeInput")}
          />
          {fieldError("referralCodeInput")}
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={registerAsMember}
            onChange={(e) => setRegisterAsMember(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-900 focus:ring-blue-900"
          />
          <span className="text-sm text-gray-700">
            I'm a member of this church
            <span className="mt-0.5 block text-xs text-gray-400">You'll be added as the first member — you can complete your member profile later.</span>
          </span>
        </label>
        </>)}

        <div className="flex gap-3 pt-1">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              disabled={isSubmitting}
              className="h-[44px] w-1/3 rounded-[10px] border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 md:h-12 md:rounded-lg lg:h-9"
            >
              Back
            </button>
          )}
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            loadingText="Registering..."
            className="flex-1 w-full bg-blue-900 text-white py-3 md:py-2.5 rounded-lg font-semibold shadow-sm hover:bg-blue-800 active:bg-blue-950 disabled:opacity-50 text-sm"
          >
            {isLastStep ? "Register Church" : "Continue"}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}

export default RegisterChurch;
