import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import { getChurchProfile, requestMyChurchSenderId, searchHeadquartersChurches, searchBranchChurches, updateChurchProfile } from "../../church/services/church.api.js";
import Skeleton from "react-loading-skeleton";
import Select from "react-select";
import currencyCodes from "currency-codes";
import { Country, State } from "country-state-city";
import { AFRICAN_COUNTRY_CODES } from "../../../shared/utils/africanCountries.js";
import { AFRICAN_CURRENCY_CODES } from "../../../shared/utils/africanCurrencies.js";
import { updateMyPassword, updateMyProfile } from "../../auth/services/auth.api.js";
import { getActivityLogMeta, getActivityLogs } from "../../activityLog/services/activityLog.api.js";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import PageTabs from "../../../shared/components/PageTabs/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import Button from "../../../shared/components/Button/index.jsx";
import Spinner from "../../../shared/components/Spinner.jsx";
import {
  getRolePermissions,
  getChurchUsers,
  createChurchUser,
  updateChurchUser,
  setChurchUserStatus,
  canCreateChurchUser,
  getGovernanceFlagsSnapshot,
  toggleGovernanceFlags
} from "../services/settings.api.js";

const humanizeKey = (key) => {
  const raw = String(key || "").trim();
  if (!raw) return "—";
  const label = raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
  return label.replace(/\b\w/g, (c) => c.toUpperCase());
};

function formatYmdLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getChurchTypeInfo(type) {
  const t = String(type || "");
  if (t === "Headquarters") {
    return "Headquarters churches can manage their own data and (where enabled) view linked branches.";
  }
  if (t === "Branch") {
    return "Branch churches belong to a Headquarters. In the system, a branch can be managed by its HQ and may have read-only rules when viewed from HQ context.";
  }
  if (t === "Independent") {
    return "Independent churches operate as a standalone church with no HQ/Branch relationship.";
  }
  return "";
}

function activityTextFromLog(row) {
  const module = String(row?.module || "").trim();
  const action = String(row?.action || "").trim();

  const nouns = {
    Members: "Member",
    Attendance: "Attendance",
    Events: "Event",
    Announcements: "Announcement",
    Tithe: "Tithe",
    Income: "Income",
    Expense: "Expense",
    SpecialFunds: "Special fund",
    Offerings: "Offering",
    Welfare: "Welfare",
    Church: "Church",
    Settings: "Settings",
    Authentication: "Authentication",
    ReportsAnalytics: "Report",
    Dashboard: "Dashboard",
    System: "System"
  };

  const subject = nouns[module] || module || "Activity";
  if (!action) return subject;

  const verb = action.toLowerCase();
  return `${subject} ${verb}`;
}

function SettingsPage() {
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const churchCtx = useContext(ChurchContext);
  const activeChurch = churchCtx?.activeChurch;
  const switchChurch = churchCtx?.switchChurch;

  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(() => (typeof can === "function" ? can("settings", "read") : true), [can]);
  const canWrite = useMemo(() => (typeof can === "function" ? can("settings", "update") : true), [can]);
  const canDeactivateUsers = useMemo(
    () => (typeof can === "function" ? can("settingsUsersRoles", "deactivate") : false),
    [can]
  );

  const [tab, setTab] = useState("my-profile");

  const [myProfileLoading, setMyProfileLoading] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [myProfileError, setMyProfileError] = useState("");
  const [myProfileSuccess, setMyProfileSuccess] = useState("");

  const [myFullName, setMyFullName] = useState("");
  const [myEmail, setMyEmail] = useState("");
  const [myPhone, setMyPhone] = useState("");
  const [myRole, setMyRole] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [removeAvatarConfirmOpen, setRemoveAvatarConfirmOpen] = useState(false);
  const [avatarEnlarged, setAvatarEnlarged] = useState(false);
  const avatarInputRef = useRef(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [logoEnlarged, setLogoEnlarged] = useState(false);
  const logoInputRef = useRef(null);

  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const passwordSectionRef = useRef(null);
  const [pwOldShow, setPwOldShow] = useState(false);
  const [pwNewShow, setPwNewShow] = useState(false);
  const [pwConfirmShow, setPwConfirmShow] = useState(false);

  const isUserActive = useMemo(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("userIsActive") !== "0";
  }, []);

  const isSystemAdmin = useMemo(() => {
    const raw = String(user?.role || "").trim().toLowerCase();
    const norm = raw.replace(/[\s_\-]+/g, "");
    return norm === "superadmin" || norm === "supportadmin";
  }, [user?.role]);

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const requestedTab = String(sp.get("tab") || "").trim().toLowerCase();
    if (requestedTab === "my-profile") {
      setTab("my-profile");
      return;
    }
    if (requestedTab === "church-profile" || requestedTab === "profile") {
      setTab("profile");
      return;
    }
    if (requestedTab === "users") {
      setTab("users");
      return;
    }
    if (requestedTab === "audit") {
      setTab("audit");
      return;
    }
    if (requestedTab === "system" || requestedTab === "governance") {
      setTab("system");
      return;
    }
  }, [location.search]);

  useEffect(() => {
    setMyFullName(user?.fullName || "");
    setMyEmail(user?.email || "");
    setMyPhone(user?.phoneNumber || "");
    setMyRole(user?.role || "");
  }, [user?._id]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const section = String(sp.get("section") || "").trim().toLowerCase();
    if (tab !== "my-profile") return;
    if (section !== "password") return;

    const t = setTimeout(() => {
      passwordSectionRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 0);
    return () => clearTimeout(t);
  }, [location.search, tab]);

  const [profileLoading, setProfileLoading] = useState(false);
  const [isSubmittingChurchProfile, setIsSubmittingChurchProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

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
  const branchBoxRef = useRef(null);

  const [selectedBranches, setSelectedBranches] = useState([]);
  const [branchSearch, setBranchSearch] = useState("");
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchMessage, setBranchMessage] = useState("");
  const [branchResults, setBranchResults] = useState([]);

  const isHeadquarters = type === "Headquarters";
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [currency, setCurrency] = useState("");
  const [currencyLocked, setCurrencyLocked] = useState(false);
  const [foundedDate, setFoundedDate] = useState("");
  const [referralCodeInput, setReferralCodeInput] = useState("");

  const [senderIdStatus, setSenderIdStatus] = useState("none");
  const [senderIdCurrent, setSenderIdCurrent] = useState("");
  const [senderIdRequestedAt, setSenderIdRequestedAt] = useState(null);
  const [senderIdApprovedAt, setSenderIdApprovedAt] = useState(null);
  const [senderIdInput, setSenderIdInput] = useState("");
  const [senderIdLoading, setSenderIdLoading] = useState(false);
  const [senderIdError, setSenderIdError] = useState("");
  const [senderIdSuccess, setSenderIdSuccess] = useState("");

  const countryOptions = useMemo(() => {
    const allow = new Set(AFRICAN_COUNTRY_CODES);
    return Country.getAllCountries()
      .filter((c) => allow.has(String(c?.isoCode || "").trim()))
      .map((c) => ({
        value: c.isoCode,
        label: c.name
      }));
  }, []);

  const selectedCountryOption = useMemo(() => {
    const code = String(countryCode || "").trim();
    if (code) {
      return countryOptions.find((o) => String(o.value) === code) || null;
    }

    const label = String(country || "").trim().toLowerCase();
    if (!label) return null;
    return countryOptions.find((o) => String(o.label || "").trim().toLowerCase() === label) || null;
  }, [country, countryCode, countryOptions]);

  const regionOptions = useMemo(() => {
    const code = String(countryCode || "").trim();
    if (!code) return [];
    if (!AFRICAN_COUNTRY_CODES.includes(code)) return [];
    return State.getStatesOfCountry(code).map((s) => ({
      value: s.isoCode,
      label: s.name
    }));
  }, [countryCode]);

  const selectedRegionOption = useMemo(() => {
    const code = String(stateCode || "").trim();
    if (code) {
      return regionOptions.find((o) => String(o.value) === code) || null;
    }

    const label = String(region || "").trim().toLowerCase();
    if (!label) return null;
    return regionOptions.find((o) => String(o.label || "").trim().toLowerCase() === label) || null;
  }, [region, regionOptions, stateCode]);

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
    if (!AFRICAN_CURRENCY_CODES.includes(cur)) {
      return currencyLocked ? { value: cur, label: cur } : null;
    }
    return currencyOptions.find((o) => String(o.value) === cur) || { value: cur, label: cur };
  }, [currency, currencyLocked, currencyOptions]);

  const isBranch = type === "Branch";

  const avatarUrl = avatarPreviewUrl || (avatarRemoved ? "" : (
    user?.profileImageUrl ||
    user?.avatarUrl ||
    user?.photoUrl ||
    user?.imageUrl ||
    user?.image ||
    ""
  ));

  const handlePickAvatar = () => {
    avatarInputRef.current?.click?.();
  };

  const handleSaveMyProfile = async (e) => {
    e.preventDefault();
    if (isSubmittingProfile) return;
    setIsSubmittingProfile(true);
    setMyProfileError("");
    setMyProfileSuccess("");

    if (!isValidPhoneNumber(myPhone)) {
      setIsSubmittingProfile(false);
      setMyProfileError("Invalid phone number");
      return;
    }

    try {
      setMyProfileLoading(true);

      const fd = new FormData();
      fd.append("fullName", myFullName);
      fd.append("email", myEmail);
      fd.append("phoneNumber", myPhone);
      if (avatarFile) {
        fd.append("avatar", avatarFile);
      } else if (avatarRemoved) {
        fd.append("removeAvatar", "true");
      }

      await updateMyProfile(fd);
      await refreshUser?.();
      setAvatarFile(null);
      setMyProfileSuccess("Profile updated successfully");
    } catch (err) {
      setMyProfileError(err?.response?.data?.message || err?.message || "Failed to update profile");
    } finally {
      setMyProfileLoading(false);
      setIsSubmittingProfile(false);
    }
  };

  const handleUpdateMyPassword = async (e) => {
    e.preventDefault();
    if (isSubmittingPassword) return;
    setIsSubmittingPassword(true);
    setPwError("");
    setPwSuccess("");

    try {
      setPwLoading(true);
      await updateMyPassword({ oldPassword: pwOld, newPassword: pwNew, confirmPassword: pwConfirm });
      setPwOld("");
      setPwNew("");
      setPwConfirm("");
      setPwSuccess("Password updated successfully");
    } catch (err) {
      setPwError(err?.response?.data?.message || err?.message || "Failed to update password");
    } finally {
      setPwLoading(false);
      setIsSubmittingPassword(false);
    }
  };

  const selectedHqLabel = useMemo(() => {
    const row = hqResults.find((r) => r?._id === headquarterChurchId);
    if (!row) return "";
    const location = `${row?.city || ""}${row?.region ? `, ${row.region}` : ""}`.trim();
    return location ? `${row?.name || ""} (${location})` : `${row?.name || ""}`;
  }, [headquarterChurchId, hqResults]);

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

  const formatDateTimeShort = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  const senderStatusMeta = useMemo(() => {
    const raw = String(senderIdStatus || "none").trim().toLowerCase();
    const label =
      raw === "approved"
        ? "Approved: Active"
        : raw === "pending"
          ? "Pending: Under review"
          : raw === "rejected"
            ? "Rejected: Try again"
            : "Not requested: Default (CHURCHCLERK)";
    const cls =
      raw === "approved"
        ? "bg-green-100 text-green-700"
        : raw === "pending"
          ? "bg-blue-100 text-blue-700"
          : raw === "rejected"
            ? "bg-red-100 text-red-700"
            : "bg-gray-100 text-gray-700";
    return { raw, label, cls };
  }, [senderIdStatus]);

  const senderIdInputLen = useMemo(() => {
    return String(senderIdInput || "").length;
  }, [senderIdInput]);

  const senderIdCharsLeft = useMemo(() => {
    return Math.max(0, 11 - senderIdInputLen);
  }, [senderIdInputLen]);

  const handleRequestSenderId = async () => {
    if (!activeChurch?._id) return;
    if (!canWrite) return;

    setSenderIdLoading(true);
    setSenderIdError("");
    setSenderIdSuccess("");

    try {
      const res = await requestMyChurchSenderId({ senderId: senderIdInput });
      const updated = res?.data?.church || null;
      if (updated) {
        setSenderIdStatus(String(updated?.sender_id_status || "none"));
        setSenderIdCurrent(String(updated?.sender_id || "").trim());
        setSenderIdRequestedAt(updated?.sender_id_requested_at || null);
        setSenderIdApprovedAt(updated?.sender_id_approved_at || null);
      }

      if (typeof switchChurch === "function") {
        try {
          await switchChurch(activeChurch._id);
        } catch (e) {
          void e;
        }
      }

      setSenderIdInput("");
      setSenderIdSuccess("Sender ID request submitted");
    } catch (e) {
      setSenderIdError(e?.response?.data?.message || e?.message || "Failed to submit sender ID request");
    } finally {
      setSenderIdLoading(false);
    }
  };

  useEffect(() => {
    if (!canRead) return;
    if (!activeChurch?._id) return;

    let cancelled = false;

    const load = async () => {
      setProfileLoading(true);
      setProfileError("");
      setProfileSuccess("");

      try {
        const res = await getChurchProfile(activeChurch._id);
        const church = res?.data?.church || res?.data?.data?.church || null;

        if (cancelled) return;

        setName(church?.name || "");
        setPastor(church?.pastor || "");
        setType(church?.type || "Headquarters");
        const parentId = typeof church?.parentChurch === "string" ? church.parentChurch : church?.parentChurch?._id;
        setParentChurchId(parentId || "");
        setHeadquarterChurchId(parentId || "");
        const parentLabel = church?.parentChurch?.name
          ? `${church.parentChurch.name}${church?.parentChurch?.city ? ` (${church.parentChurch.city}${church?.parentChurch?.region ? `, ${church.parentChurch.region}` : ""})` : ""}`
          : "";
        setHqSearch(parentLabel);
        setHqResults(parentId && church?.parentChurch?._id ? [church.parentChurch] : []);
        setHqMessage("");
        setHqDropdownOpen(false);
        setPhoneNumber(church?.phoneNumber || "");
        setEmail(church?.email || user?.email || "");
        setCity(church?.city || "");
        const nextCountry = String(church?.country || "").trim().toLowerCase();
        const matchedCountry = nextCountry
          ? countryOptions.find((o) => String(o.label || "").trim().toLowerCase() === nextCountry) || null
          : null;

        if (matchedCountry?.value) {
          setCountry(String(matchedCountry.label || ""));
          setCountryCode(matchedCountry.value || "");
        } else {
          setCountry("");
          setCountryCode("");
        }

        if (matchedCountry?.value) {
          const nextRegion = String(church?.region || "").trim().toLowerCase();
          const states = State.getStatesOfCountry(matchedCountry.value);
          const matchedState = nextRegion
            ? (Array.isArray(states) ? states : []).find((s) => String(s.name || "").trim().toLowerCase() === nextRegion) || null
            : null;

          if (matchedState?.isoCode) {
            setRegion(String(matchedState.name || ""));
            setStateCode(matchedState.isoCode || "");
          } else {
            setRegion("");
            setStateCode("");
          }
        } else {
          setRegion("");
          setStateCode("");
        }
        const nextCurrency = String(church?.currency || "").trim().toUpperCase();
        const lockFlag = Boolean(church?.currencyLocked);
        setCurrencyLocked(lockFlag);
        setCurrency(lockFlag ? (nextCurrency || "GHS") : (AFRICAN_CURRENCY_CODES.includes(nextCurrency) ? nextCurrency : "GHS"));
        setFoundedDate(formatYmdLocal(church?.foundedDate));
        setLogoPreviewUrl(church?.logoUrl || "");
        setReferralCodeInput("");

        const sStatus = String(church?.sender_id_status || "none").trim() || "none";
        setSenderIdStatus(sStatus);
        setSenderIdCurrent(String(church?.sender_id || "").trim());
        setSenderIdRequestedAt(church?.sender_id_requested_at || null);
        setSenderIdApprovedAt(church?.sender_id_approved_at || null);
        setSenderIdInput("");
        setSenderIdError("");
        setSenderIdSuccess("");
      } catch (e) {
        if (cancelled) return;
        setProfileError(e?.response?.data?.message || e?.message || "Failed to load church profile");
      } finally {
        if (cancelled) return;
        setProfileLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [activeChurch?._id, canRead, countryOptions, user?.email]);

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (isSubmittingChurchProfile) return;
    setIsSubmittingChurchProfile(true);
    if (!activeChurch?._id) { setIsSubmittingChurchProfile(false); return; }

    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess("");

    if (!isValidPhoneNumber(phoneNumber)) {
      setProfileLoading(false);
      setIsSubmittingChurchProfile(false);
      setProfileError("Invalid phone number");
      return;
    }

    const hasCountry = Boolean(String(country || "").trim());
    const hasRegion = Boolean(String(region || "").trim());

    if (hasCountry && !selectedCountryOption?.value) {
      setProfileLoading(false);
      setIsSubmittingChurchProfile(false);
      setProfileError("Please select a country from the dropdown list.");
      return;
    }

    if (hasRegion && !hasCountry) {
      setProfileLoading(false);
      setIsSubmittingChurchProfile(false);
      setProfileError("Please select a country first.");
      return;
    }

    if (hasRegion && !selectedRegionOption?.value) {
      setProfileLoading(false);
      setIsSubmittingChurchProfile(false);
      setProfileError("Please select a region from the dropdown list.");
      return;
    }

    try {
      const payload = {
        name,
        pastor,
        type,
        parentChurch: type === "Branch" ? parentChurchId : null,
        branchIds: type === "Headquarters" && selectedBranches.length ? selectedBranches.map((b) => b._id) : undefined,
        phoneNumber,
        email,
        city,
        region,
        country,
        foundedDate: foundedDate || null
      };

      if (!currencyLocked) {
        payload.currency = String(currency || "").trim().toUpperCase();
      }

      if (logoFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (Array.isArray(v)) { v.forEach((item) => fd.append(k, item)); }
          else if (v !== null && v !== undefined) { fd.append(k, String(v)); }
        });
        fd.append("logo", logoFile);
        await updateChurchProfile(activeChurch._id, fd);
        setLogoFile(null);
      } else {
        await updateChurchProfile(activeChurch._id, payload);
      }

      if (typeof switchChurch === "function") {
        try {
          await switchChurch(activeChurch._id);
        } catch (e) {
          void e;
        }
      }

      setProfileSuccess("Church profile updated successfully");
    } catch (e) {
      setProfileError(e?.response?.data?.message || e?.message || "Failed to update church profile");
    } finally {
      setProfileLoading(false);
      setIsSubmittingChurchProfile(false);
    }
  };

  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState("");
  const [roleConfig, setRoleConfig] = useState(null);

  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 20,
    nextPage: null,
    prevPage: null
  });
  const [auditSearch, setAuditSearch] = useState("");
  const [auditModule, setAuditModule] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditRole, setAuditRole] = useState("");
  const [auditModuleOptions, setAuditModuleOptions] = useState([]);
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(20);

  const [auditDetailOpen, setAuditDetailOpen] = useState(false);
  const [auditDetailRow, setAuditDetailRow] = useState(null);

  const auditDatePickerRef = useRef(null);
  const [auditDatePickerOpen, setAuditDatePickerOpen] = useState(false);
  const [auditDraftFrom, setAuditDraftFrom] = useState("");
  const [auditDraftTo, setAuditDraftTo] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUser, setConfirmUser] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [addError, setAddError] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("");

  const [userLimitModalOpen, setUserLimitModalOpen] = useState(false);
  const [userLimitMessage, setUserLimitMessage] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [isSubmittingEditUser, setIsSubmittingEditUser] = useState(false);
  const [editError, setEditError] = useState("");
  const [editUser, setEditUser] = useState(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");

  // Governance flags state (System tab)
  const [govLoading, setGovLoading] = useState(false);
  const [govError, setGovError] = useState("");
  const [enforceBackdating, setEnforceBackdating] = useState(false);
  const [enforceImmutability, setEnforceImmutability] = useState(false);

  useEffect(() => {
    if (!isSystemAdmin) return;
    if (tab !== "system") return;
    let cancelled = false;
    (async () => {
      setGovLoading(true);
      setGovError("");
      try {
        const res = await getGovernanceFlagsSnapshot();
        if (cancelled) return;
        const data = res?.data || {};
        setEnforceBackdating(Boolean(data?.enforceBackdating));
        setEnforceImmutability(Boolean(data?.enforceImmutability));
      } catch (e) {
        if (cancelled) return;
        setGovError(e?.response?.data?.message || e?.message || "Failed to load governance flags");
      } finally {
        if (cancelled) return;
        setGovLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, isSystemAdmin]);

  const handleToggleFlag = async (key, value) => {
    if (!isSystemAdmin) return;
    setGovError("");
    setGovLoading(true);
    const prev = { enforceBackdating, enforceImmutability };
    if (key === "enforceBackdating") setEnforceBackdating(value);
    if (key === "enforceImmutability") setEnforceImmutability(value);
    try {
      await toggleGovernanceFlags({ [key]: value });
    } catch (e) {
      setGovError(e?.response?.data?.message || e?.message || "Failed to update flag");
      setEnforceBackdating(prev.enforceBackdating);
      setEnforceImmutability(prev.enforceImmutability);
    } finally {
      setGovLoading(false);
    }
  };

  const loadRoles = async () => {
    setRolesLoading(true);
    setRolesError("");
    try {
      const res = await getRolePermissions();
      setRoleConfig(res?.data || null);
    } catch (e) {
      setRoleConfig(null);
      setRolesError(e?.response?.data?.message || e?.message || "Failed to load roles");
    } finally {
      setRolesLoading(false);
    }
  };

  const loadUsers = async ({ search, role } = {}) => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const res = await getChurchUsers({ search: search ?? userSearch, role: role ?? userRoleFilter });
      const rows = Array.isArray(res?.data?.users) ? res.data.users : [];
      setUsers(rows);
    } catch (e) {
      setUsers([]);
      setUsersError(e?.response?.data?.message || e?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (!canRead) return;
    if (tab !== "users") return;

    loadRoles();
    loadUsers({});
  }, [canRead, tab]);

  useEffect(() => {
    if (!canRead) return;
    if (tab !== "users") return;

    const t = setTimeout(() => {
      loadUsers({ search: userSearch, role: userRoleFilter });
    }, 250);

    return () => clearTimeout(t);
  }, [tab, userSearch, userRoleFilter, canRead]);

  useEffect(() => {
    if (!auditDatePickerOpen) return;

    const onDocMouseDown = (e) => {
      if (!auditDatePickerRef.current) return;
      if (auditDatePickerRef.current.contains(e.target)) return;
      setAuditDatePickerOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [auditDatePickerOpen]);

  useEffect(() => {
    if (!canRead) return;
    if (tab !== "audit") return;

    setAuditDraftFrom(auditDateFrom || "");
    setAuditDraftTo(auditDateTo || "");
  }, [auditDateFrom, auditDateTo, canRead, tab]);

  const fetchAuditLogs = async (partial = {}) => {
    const next = {
      search: auditSearch,
      module: auditModule,
      action: auditAction,
      role: auditRole,
      dateFrom: auditDateFrom,
      dateTo: auditDateTo,
      page: auditPage,
      limit: auditLimit,
      ...(partial || {})
    };

    setAuditLoading(true);
    setAuditError("");

    try {
      const params = {
        page: next.page,
        limit: next.limit
      };

      if (next.search) params.search = next.search;
      if (next.module) params.module = next.module;
      if (next.action) params.action = next.action;
      if (next.role) params.role = next.role;
      if (next.dateFrom) params.dateFrom = next.dateFrom;
      if (next.dateTo) params.dateTo = next.dateTo;

      const res = await getActivityLogs(params);
      const logs = Array.isArray(res?.data?.logs) ? res.data.logs : [];
      const pagination = res?.data?.pagination || null;

      setAuditLogs(logs);
      if (pagination) {
        setAuditPagination(pagination);
      } else {
        setAuditPagination({
          total: logs.length,
          totalPages: 1,
          currentPage: 1,
          limit: next.limit,
          nextPage: null,
          prevPage: null
        });
      }

      setAuditSearch(next.search);
      setAuditModule(next.module);
      setAuditAction(next.action);
      setAuditRole(next.role);
      setAuditDateFrom(next.dateFrom);
      setAuditDateTo(next.dateTo);
      setAuditPage(next.page);
      setAuditLimit(next.limit);
    } catch (e) {
      setAuditLogs([]);
      setAuditPagination({
        total: 0,
        totalPages: 1,
        currentPage: 1,
        limit: auditLimit,
        nextPage: null,
        prevPage: null
      });
      setAuditError(e?.response?.data?.message || e?.message || "Failed to load audit logs");
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (!canRead) return;
    if (tab !== "audit") return;

    fetchAuditLogs({ page: 1 });
  }, [tab, canRead]);

  useEffect(() => {
    if (!canRead) return;
    if (tab !== "audit") return;

    const fallback = [
      "Authentication",
      "Members",
      "Attendance",
      "Events",
      "Announcements",
      "Tithe",
      "Income",
      "Expense",
      "SpecialFunds",
      "Offerings",
      "Welfare",
      "Church",
      "Settings",
      "ReportsAnalytics",
      "Dashboard",
      "System"
    ];

    (async () => {
      try {
        const res = await getActivityLogMeta();
        const mods = Array.isArray(res?.data?.modules) ? res.data.modules : [];
        const cleaned = mods
          .map((m) => String(m || "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        setAuditModuleOptions(cleaned.length ? cleaned : fallback);
      } catch (e) {
        setAuditModuleOptions(fallback);
      }
    })();
  }, [tab, canRead]);

  useEffect(() => {
    if (!canRead) return;
    if (tab !== "audit") return;

    const t = setTimeout(() => {
      fetchAuditLogs({
        search: auditSearch,
        module: auditModule,
        action: auditAction,
        role: auditRole,
        dateFrom: auditDateFrom,
        dateTo: auditDateTo,
        page: 1
      });
    }, 300);

    return () => clearTimeout(t);
  }, [auditSearch, auditModule, auditAction, auditRole, auditDateFrom, auditDateTo, canRead, tab]);

  const openDeactivateConfirm = (row) => {
    setConfirmUser(row);
    setConfirmOpen(true);
  };

  const openAuditDetail = (row) => {
    setAuditDetailRow(row || null);
    setAuditDetailOpen(true);
  };

  const handleToggleActive = async () => {
    if (!confirmUser?._id) return;

    setUsersError("");
    try {
      const nextActive = confirmUser?.isActive === false;
      const res = await setChurchUserStatus(confirmUser._id, nextActive);
      const updated = res?.data?.user;

      setUsers((prev) =>
        prev.map((u) => (String(u?._id) === String(updated?._id) ? updated : u))
      );
      setConfirmOpen(false);
      setConfirmUser(null);
    } catch (e) {
      setUsersError(e?.response?.data?.message || e?.message || "Failed to update user status");
    }
  };

  const handleOpenAdd = async () => {
    try {
      const res = await canCreateChurchUser();
      if (res?.data?.allowed !== false) {
        setAddError("");
        setNewFullName("");
        setNewEmail("");
        setNewPhone("");
        setNewPassword("");
        setNewRole("");
        setAddOpen(true);
      } else {
        setUserLimitMessage(res?.data?.message || "You cannot add more users.");
        setUserLimitModalOpen(true);
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to check limit";
      setUserLimitMessage(msg);
      setUserLimitModalOpen(true);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (isSubmittingUser) return;
    setIsSubmittingUser(true);

    setAddLoading(true);
    setAddError("");

    if (!isValidPhoneNumber(newPhone)) {
      setAddLoading(false);
      setIsSubmittingUser(false);
      setAddError("Invalid phone number");
      return;
    }

    try {
      const res = await createChurchUser({
        fullName: newFullName,
        email: newEmail,
        phoneNumber: newPhone,
        password: newPassword,
        role: newRole
      });

      const created = res?.data?.user;
      if (created) {
        setUsers((prev) => [created, ...prev]);
      } else {
        await loadUsers({});
      }

      setAddOpen(false);
    } catch (e) {
      setAddError(e?.response?.data?.message || e?.message || "Failed to create user");
    } finally {
      setAddLoading(false);
      setIsSubmittingUser(false);
    }
  };

  const handleOpenEdit = (row) => {
    setEditError("");
    setEditUser(row);
    setEditFullName(row?.fullName || "");
    setEditEmail(row?.email || "");
    setEditPhone(row?.phoneNumber || "");
    setEditRole(row?.role || "");
    setEditOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (isSubmittingEditUser) return;
    setIsSubmittingEditUser(true);
    if (!editUser?._id) { setIsSubmittingEditUser(false); return; }

    setEditLoading(true);
    setEditError("");

    if (!isValidPhoneNumber(editPhone)) {
      setEditLoading(false);
      setIsSubmittingEditUser(false);
      setEditError("Invalid phone number");
      return;
    }

    try {
      const res = await updateChurchUser(editUser._id, {
        fullName: editFullName,
        email: editEmail,
        phoneNumber: editPhone,
        role: editRole
      });

      const updated = res?.data?.user;
      setUsers((prev) => prev.map((u) => (String(u?._id) === String(updated?._id) ? updated : u)));
      setEditOpen(false);
      setEditUser(null);
    } catch (e) {
      setEditError(e?.response?.data?.message || e?.message || "Failed to update user");
    } finally {
      setEditLoading(false);
      setIsSubmittingEditUser(false);
    }
  };

  const churchRoles = useMemo(() => {
    const list = roleConfig?.roleList?.churchRoles;
    return Array.isArray(list) ? list : [];
  }, [roleConfig]);

  const rolePermissions = roleConfig?.roles || {};

  const availableRoleModules = useMemo(() => {
    const modules = roleConfig?.modules;
    if (!modules || typeof modules !== "object") return [];
    return Object.keys(modules);
  }, [roleConfig]);

  if (!canRead) {
    return (
      <div className="max-w-6xl">
        <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Settings</h2>
        <p className="mt-1 text-gray-500 text-sm">You do not have permission to view settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div>
        <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Settings</h2>
        <p className="mt-1 text-gray-500 text-sm">Manage your church profile, users and roles</p>
      </div>

      <PageTabs
        tabs={[
          { key: "my-profile", label: "My Profile" },
          { key: "profile", label: "Church Profile" },
          { key: "users", label: "Users & Roles" },
          { key: "audit", label: "Audit Log" },
        ]}
        activeTab={tab}
        onChange={setTab}
        sticky={false}
        className="mt-4"
      />

      {tab === "my-profile" ? (
        <div className="mt-6">
          {myProfileError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{myProfileError}</div> : null}
          {myProfileSuccess ? <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700 text-sm">{myProfileSuccess}</div> : null}

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold text-gray-900 text-sm">User Details</div>
                <div className="mt-1 text-gray-500 text-xs">Update your account information and profile picture.</div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-4 flex-wrap md:gap-5">
              <div className="shrink-0">
                <div className="relative h-24 w-24">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.fullName || "User"}
                      className="h-24 w-24 rounded-full object-cover border border-gray-200 cursor-zoom-in"
                      onClick={() => setAvatarEnlarged(true)}
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-blue-900 text-white flex items-center justify-center font-semibold text-2xl">
                      {(user?.fullName || "U").slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <button
                    type="button"
                    aria-label="Edit profile photo"
                    onClick={handlePickAvatar}
                    disabled={!isUserActive}
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                    title="Change photo"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gray-700">
                      <path d="M4 20h4l10.5-10.5a2 2 0 10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>

                  {avatarUrl ? (
                    <button
                      type="button"
                      aria-label="Remove profile photo"
                      onClick={() => setRemoveAvatarConfirmOpen(true)}
                      disabled={!isUserActive}
                      className="absolute -top-1 -left-1 h-7 w-7 rounded-full bg-red-600 text-white border-2 border-white flex items-center justify-center hover:bg-red-700 disabled:opacity-50"
                      title="Remove photo"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  ) : null}

                  {removeAvatarConfirmOpen ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                          <div className="font-semibold text-gray-900 text-sm">Remove Profile Photo</div>
                          <button type="button" onClick={() => setRemoveAvatarConfirmOpen(false)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                          </button>
                        </div>
                        <div className="p-5">
                          <p className="text-gray-600 text-sm">Are you sure you want to remove your profile photo? This will be applied when you save your profile.</p>
                          <div className="mt-5 flex items-center justify-end gap-3">
                            <button type="button" onClick={() => setRemoveAvatarConfirmOpen(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm">Cancel</button>
                            <button
                              type="button"
                              onClick={() => {
                                setAvatarFile(null);
                                setAvatarRemoved(true);
                                setMyProfileError("");
                                if (avatarInputRef.current) avatarInputRef.current.value = "";
                                setRemoveAvatarConfirmOpen(false);
                              }}
                              className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-red-700 text-sm"
                            >
                              Remove Photo
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f && f.size > 2 * 1024 * 1024) {
                        setMyProfileError("Photo must be under 2 MB. Please choose a smaller image.");
                        e.target.value = "";
                        return;
                      }
                      setMyProfileError("");
                      setAvatarRemoved(false);
                      setAvatarFile(f);
                    }}
                  />
                </div>
                <div className="mt-2 text-center text-gray-400 text-xs">Max 2 MB · JPG PNG WEBP</div>
              </div>

              {avatarEnlarged && avatarUrl ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setAvatarEnlarged(false)}>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <img src={avatarUrl} alt={user?.fullName || "User"} className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl" />
                    <button type="button" className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50" onClick={() => setAvatarEnlarged(false)}>
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleSaveMyProfile} className="flex-1 min-w-[260px] space-y-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1 text-sm">Full Name</label>
                  <input
                    type="text"
                    value={myFullName}
                    onChange={(e) => setMyFullName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                    required
                    disabled={!isUserActive}
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1 text-sm">Email</label>
                  <input
                    type="email"
                    value={myEmail}
                    onChange={(e) => setMyEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                    required
                    disabled={!isUserActive}
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1 text-sm">Phone Number</label>
                  <PhoneNumberInput
                    value={myPhone}
                    onChange={setMyPhone}
                    error={Boolean(myProfileError && String(myProfileError).toLowerCase().includes("invalid phone"))}
                    inputClassName="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                    disabled={!isUserActive}
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1 text-sm">Role</label>
                  <input
                    type="text"
                    value={myRole}
                    readOnly
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 bg-gray-50 text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmittingProfile}
                  loadingText="Saving..."
                  disabled={!isUserActive}
                  className="w-full bg-blue-900 text-white py-2.5 rounded-lg font-semibold shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm"
                >
                  Save Profile
                </Button>
              </form>
            </div>
          </div>

          <div ref={passwordSectionRef} className="mt-4 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
            <div className="font-semibold text-gray-900 text-sm">Change Password</div>
            <div className="mt-1 text-gray-500 text-xs">Update your password using your current password.</div>

            {pwError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{pwError}</div> : null}
            {pwSuccess ? <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700 text-sm">{pwSuccess}</div> : null}

            <form onSubmit={handleUpdateMyPassword} className="mt-4 space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Old Password</label>
                <div className="relative">
                  <input
                    type={pwOldShow ? "text" : "password"}
                    value={pwOld}
                    onChange={(e) => setPwOld(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                    required
                    disabled={!isUserActive}
                  />
                  <button type="button" aria-label="Toggle password visibility" onClick={() => setPwOldShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                    {pwOldShow ? <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> : <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1 text-sm">New Password</label>
                  <div className="relative">
                    <input
                      type={pwNewShow ? "text" : "password"}
                      value={pwNew}
                      onChange={(e) => setPwNew(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                      required
                      disabled={!isUserActive}
                    />
                    <button type="button" aria-label="Toggle password visibility" onClick={() => setPwNewShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                      {pwNewShow ? <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> : <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1 text-sm">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={pwConfirmShow ? "text" : "password"}
                      value={pwConfirm}
                      onChange={(e) => setPwConfirm(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                      required
                      disabled={!isUserActive}
                    />
                    <button type="button" aria-label="Toggle password visibility" onClick={() => setPwConfirmShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                      {pwConfirmShow ? <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> : <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={isSubmittingPassword}
                loadingText="Updating..."
                disabled={!isUserActive}
                className="w-full bg-blue-700 text-white py-2.5 rounded-lg font-semibold shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm"
              >
                Update Password
              </Button>
            </form>
          </div>
        </div>
      ) : null}


      {auditDetailOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAuditDetailOpen(false)} />
          <div className="relative w-full max-w-4xl rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            <div className="border-b border-gray-200 py-4 flex items-start justify-between gap-4 px-4 md:px-6">
              <div>
                <div className="font-semibold text-gray-900 text-lg">Audit Log Details</div>
                <div className="mt-1 text-gray-500 text-xs">All captured fields for this activity.</div>
              </div>
              <button
                type="button"
                onClick={() => setAuditDetailOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-4 md:p-6 lg:p-8">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Timestamp</div>
                    <div className="mt-1 text-gray-900">
                      {auditDetailRow?.createdAt ? new Date(auditDetailRow.createdAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Status</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.status || "—"}</div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-500 text-xs">User</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.user?.fullName || auditDetailRow?.userName || "—"}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Role</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.user?.role || auditDetailRow?.userRole || "—"}</div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Module</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.module || "—"}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Action</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.action || "—"}</div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Activity</div>
                    <div className="mt-1 text-gray-900">{activityTextFromLog(auditDetailRow) || "—"}</div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Device Type</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.deviceType || "—"}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Model</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.model || "—"}</div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-500 text-xs">Browser</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.browser || "—"}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-500 text-xs">OS</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.os || "—"}</div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="font-semibold text-gray-500 text-xs">IP Address</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.ipAddress || "—"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "profile" ? (
        <div className="mt-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-lg bg-blue-50 flex items-center justify-center md:h-12 md:w-12">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-700">
                  <path d="M12 3v3M10.5 6h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M4 21V11l8-5 8 5v10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M9 21V15h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M2 21h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">Current Church Type: {type || "—"}</div>
                <div className="mt-1 text-gray-600 text-sm">{getChurchTypeInfo(type) || "—"}</div>
              </div>
            </div>
          </div>

          {profileError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{profileError}</div> : null}
          {profileSuccess ? <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700 text-sm">{profileSuccess}</div> : null}

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <div className="relative h-20 w-20 shrink-0">
                  {logoPreviewUrl ? (
                    <img src={logoPreviewUrl} alt="Church logo" className="h-20 w-20 rounded-xl object-cover border border-gray-200 cursor-zoom-in" onClick={() => setLogoEnlarged(true)} />
                  ) : (
                    <div className="h-20 w-20 rounded-xl bg-blue-50 border border-gray-200 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-blue-300"><path d="M12 3L4 8V21H20V8L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                  <button type="button" onClick={() => logoInputRef.current?.click()} disabled={!canWrite} className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-50" title="Change logo">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gray-700"><path d="M4 20h4l10.5-10.5a2 2 0 10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  </button>
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 2 * 1024 * 1024) { setProfileError("Logo must be under 2 MB"); return; } setProfileError(""); const url = URL.createObjectURL(f); setLogoPreviewUrl(url); setLogoFile(f); }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-700">Church Logo</div>
                  <div className="mt-0.5 text-xs text-gray-400">Click the pencil to upload · Max 2 MB · JPG PNG WEBP</div>
                </div>
              </div>

              {logoEnlarged && logoPreviewUrl ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLogoEnlarged(false)}>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <img src={logoPreviewUrl} alt="Church logo" className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl" />
                    <button type="button" className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50" onClick={() => setLogoEnlarged(false)}>
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Church Name</label>
                <input
                  type="text"
                  placeholder="Your church name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  required
                  disabled={!canWrite}
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Pastor's Name</label>
                <input
                  type="text"
                  placeholder="Pastor's full name"
                  value={pastor}
                  onChange={(e) => setPastor(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  required
                  disabled={!canWrite}
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Church Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  disabled={!canWrite}
                >
                  <option value="Headquarters">Headquarters</option>
                  <option value="Branch">Branch</option>
                  <option value="Independent">Independent</option>
                </select>
                {type === "Headquarters" && activeChurch?.type !== "Headquarters" && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 text-xs">
                    <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" aria-hidden="true">
                      <path d="M12 9v4m0 4h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div>Switching to <strong>Headquarters</strong> requires an active <strong>Premium</strong> subscription. Please upgrade to Premium on the Billing page first.</div>
                  </div>
                )}
              </div>

              {type === "Headquarters" && (
                <div ref={branchBoxRef} className="relative">
                  <label className="block font-medium text-gray-700 mb-1 text-sm">Link Branch Churches (optional)</label>
                  {selectedBranches.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {selectedBranches.map((b) => (
                        <span key={b._id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-blue-800 text-xs font-medium">
                          {b.name}
                          <button type="button" disabled={!canWrite} onClick={() => setSelectedBranches((prev) => prev.filter((x) => x._id !== b._id))} className="ml-0.5 text-blue-500 hover:text-blue-700">✕</button>
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                    disabled={!canWrite}
                  />
                  {branchDropdownOpen && (
                    <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                      <div className="max-h-72 overflow-y-auto">
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
                                disabled={!canWrite}
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

              {type === "Branch" ? (
                <div ref={hqBoxRef} className="relative">
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
                    }}
                    onFocus={() => setHqDropdownOpen(true)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                    disabled={!canWrite}
                  />

                  {selectedHqLabel && parentChurchId ? (
                    <div className="mt-1 text-gray-500 text-xs">Selected: {selectedHqLabel}</div>
                  ) : null}

                  {hqDropdownOpen ? (
                    <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                      <div className="max-h-72 overflow-y-auto">
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
                              disabled={!canWrite}
                            >
                              <div className="font-semibold text-gray-900 truncate text-sm">{c?.name || "—"}</div>
                              <div className="mt-0.5 text-gray-600 truncate text-xs">
                                {`${c?.city || ""}${c?.region ? `, ${c.region}` : ""}`.trim() || "—"}
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
              ) : null}

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Phone Number</label>
                <PhoneNumberInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  error={Boolean(profileError && String(profileError).toLowerCase().includes("invalid phone"))}
                  inputClassName="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  disabled={!canWrite}
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Email (optional)</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  disabled={!canWrite}
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Country</label>
                <Select
                  inputId="church-country"
                  isSearchable
                  isClearable
                  options={countryOptions}
                  value={selectedCountryOption}
                  onChange={(opt) => {
                    if (!opt) {
                      setCountry("");
                      setCountryCode("");
                      setRegion("");
                      setStateCode("");
                      return;
                    }

                    setCountry(String(opt?.label || ""));
                    setCountryCode(String(opt?.value || ""));
                    setRegion("");
                    setStateCode("");
                  }}
                  placeholder="Select country"
                  isDisabled={!canWrite}
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
                <label className="block font-medium text-gray-700 mb-1 text-sm">Region</label>
                <Select
                  inputId="church-region"
                  isSearchable
                  isClearable
                  options={regionOptions}
                  value={selectedRegionOption}
                  onChange={(opt) => {
                    if (!opt) {
                      setRegion("");
                      setStateCode("");
                      return;
                    }

                    setRegion(String(opt?.label || ""));
                    setStateCode(String(opt?.value || ""));
                  }}
                  placeholder={countryCode ? "Select region" : "Select country first"}
                  isDisabled={!canWrite || !countryCode}
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
                <label className="block font-medium text-gray-700 mb-1 text-sm">Location</label>
                <input
                  type="text"
                  placeholder="Enter your location"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  required
                  disabled={!canWrite}
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Currency</label>
                <Select
                  inputId="church-currency"
                  isSearchable
                  options={currencyOptions}
                  value={selectedCurrencyOption}
                  onChange={(opt) => setCurrency(String(opt?.value || "").toUpperCase())}
                  placeholder="Select currency"
                  isDisabled={!canWrite || currencyLocked}
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
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 text-xs">
                  <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 text-amber-700" aria-hidden="true">
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  disabled={!canWrite}
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Referral Code (optional)</label>
                <input
                  type="text"
                  placeholder="Referral code"
                  value={referralCodeInput}
                  onChange={(e) => setReferralCodeInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  disabled
                />
              </div>

              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">SMS Sender ID</div>
                    <div className="mt-1 text-gray-500 text-xs">Request a custom sender ID for your church (requires manual approval).</div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold ${senderStatusMeta.cls} text-xs`}>{senderStatusMeta.label}</span>
                </div>

                {senderIdError ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{senderIdError}</div> : null}
                {senderIdSuccess ? <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700 text-sm">{senderIdSuccess}</div> : null}

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="font-semibold text-gray-500 text-xs">Requested Sender ID</div>
                    <div className="mt-1 font-semibold text-gray-900 text-sm">{senderIdCurrent || "Default (CHURCHCLERK)"}</div>
                    <div className="mt-1 text-gray-500 text-xs">Requested: {formatDateTimeShort(senderIdRequestedAt)}</div>
                    <div className="mt-1 text-gray-500 text-xs">Approved: {formatDateTimeShort(senderIdApprovedAt)}</div>
                    <div className="mt-2 text-gray-600 text-xs">
                      Your members will see your sender ID as: {senderStatusMeta.raw === "approved" ? (senderIdCurrent || "CHURCHCLERK") : "CHURCHCLERK"}
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-1 text-sm">New Sender ID</label>
                    <input
                      value={senderIdInput}
                      onChange={(e) => setSenderIdInput(String(e.target.value || "").toUpperCase())}
                      maxLength={11}
                      placeholder="E.g. MYCHURCH"
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                      disabled={!canWrite || senderIdLoading}
                    />
                    <div className="mt-1 text-gray-500 text-xs">
                      Max 11 characters. Letters and numbers only. {senderIdInputLen}/11 ({senderIdCharsLeft} left)
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRequestSenderId}
                        disabled={!canWrite || senderIdLoading || !String(senderIdInput || "").trim()}
                        className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
                      >
                        {senderIdLoading ? "Submitting..." : senderStatusMeta.raw === "pending" ? "Resubmit Request" : "Request Sender ID"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSenderIdError("");
                          setSenderIdSuccess("");
                          setSenderIdInput("");
                        }}
                        disabled={senderIdLoading}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={isSubmittingChurchProfile}
                loadingText="Saving..."
                disabled={!canWrite || (type === "Branch" && !parentChurchId)}
                className="w-full bg-blue-900 text-white py-2.5 rounded-lg font-semibold shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm"
              >
                Update Church Profile
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      {tab === "users" ? (
        <div className="mt-6">
          {rolesError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{rolesError}</div> : null}
          {usersError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{usersError}</div> : null}

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-3">
              <div className="flex items-center justify-between md:block">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Users &amp; Roles</div>
                  <div className="mt-1 text-gray-500 text-xs">Manage user accounts and their assigned roles.</div>
                </div>
                {canWrite ? (
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="md:hidden inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 text-sm h-10"
                  >
                    Add User
                  </button>
                ) : null}
              </div>
              <FilterBar
                searchValue={userSearch}
                onSearchChange={(v) => setUserSearch(v)}
                searchPlaceholder="Search user name, email or phone…"
                searchWidth="md:w-[320px]"
                selects={[
                  {
                    key: "role",
                    value: userRoleFilter,
                    onChange: (v) => setUserRoleFilter(v),
                    options: churchRoles.map((r) => ({ label: r, value: r })),
                    placeholder: "All roles",
                  },
                ]}
              >
                {canWrite ? (
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 text-sm h-10"
                  >
                    Add User
                  </button>
                ) : null}
              </FilterBar>
              <MobileFilterBar
                searchValue={userSearch}
                onSearchChange={(v) => setUserSearch(v)}
                searchPlaceholder="Search user name, email or phone…"
                filters={[
                  {
                    key: "role",
                    label: "Role",
                    value: userRoleFilter,
                    defaultValue: "",
                    options: [{ label: "All roles", value: "" }, ...churchRoles.map((r) => ({ label: r, value: r }))],
                  },
                ]}
                onApply={(pending) => setUserRoleFilter(pending.role)}
                resultCount={users.length}
                getLiveCount={async ({ filters: f }) => {
                  try {
                    const params = {};
                    if (f?.role && f.role !== "") params.role = f.role;
                    if (userSearch) params.search = userSearch;
                    const res = await getChurchUsers(params);
                    const rows = Array.isArray(res?.data?.users) ? res.data.users : [];
                    return rows.length;
                  } catch {
                    return null;
                  }
                }}
              />
            </div>

            {usersLoading ? (
              <div className="mt-4 text-gray-600 text-sm flex items-center gap-2"><Spinner size="sm" className="text-gray-400" /> Loading users…</div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Email</th>
                      <th className="px-4 py-3 text-left font-semibold">Phone</th>
                      <th className="px-4 py-3 text-left font-semibold">Role</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.length ? (
                      users.map((row) => {
                        const isActive = row?.isActive !== false;
                        return (
                          <tr key={row?._id} className="hover:bg-gray-50">
                            <td className="sticky left-0 z-10 bg-white px-4 py-3 font-semibold text-gray-900">{row?.fullName || "—"}</td>
                            <td className="px-4 py-3 text-gray-700">{row?.email || "—"}</td>
                            <td className="px-4 py-3 text-gray-700">{row?.phoneNumber || "—"}</td>
                            <td className="px-4 py-3 text-gray-700">{row?.role || "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"} text-xs`}>
                                {isActive ? "Active" : "Deactivated"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <TableKebabMenu items={[
                                { label: "Edit", onClick: () => handleOpenEdit(row), disabled: !canWrite, desktopClassName: "rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-xs" },
                                canDeactivateUsers && { label: isActive ? "Deactivate" : "Activate", onClick: () => openDeactivateConfirm(row), danger: isActive, desktopClassName: `rounded-lg px-3 py-1.5 font-semibold text-xs ${isActive ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100" : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"}` }
                              ]} />
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 text-center text-gray-600 py-4 md:py-6">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Available Roles</div>
                <div className="mt-1 text-gray-500 text-xs">Roles and what they can do in the system</div>
                <div className="mt-2 text-[11px] text-gray-500">
                  ✓ = has permission, × = no permission, - = not supported
                </div>
              </div>
            </div>

            {rolesLoading ? (
              <div className="mt-4 text-gray-600 text-sm flex items-center gap-2"><Spinner size="sm" className="text-gray-400" /> Loading roles…</div>
            ) : churchRoles.length ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {churchRoles.map((r) => {
                  const modules = availableRoleModules;
                  const normalizedRole = String(r || "").trim().toLowerCase();
                  const perms = rolePermissions?.[normalizedRole] || {};
                  const moduleCatalog = roleConfig?.modules || {};

                  return (
                    <div key={r} className="rounded-lg border border-gray-200 p-4">
                      <div className="font-semibold text-gray-900 text-sm">{r}</div>
                      <div className="mt-3">
                        {modules.length ? (
                          <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full text-xs">
                              <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                  <th className="px-3 py-1.5 text-left font-semibold">Modules</th>
                                  <th className="px-3 py-1.5 text-center font-semibold">View</th>
                                  <th className="px-3 py-1.5 text-center font-semibold">Create</th>
                                  <th className="px-3 py-1.5 text-center font-semibold">Update</th>
                                  <th className="px-3 py-1.5 text-center font-semibold">Delete</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {modules.map((m) => {
                                  const supported = Array.isArray(moduleCatalog?.[m]) ? moduleCatalog[m] : [];
                                  const supportsView = supported.includes("read") || supported.includes("view");
                                  const supportsCreate = supported.includes("create");
                                  const supportsUpdate = supported.includes("update");
                                  const supportsDelete = supported.includes("delete");

                                  const canView = Boolean(perms?.[m]?.read || perms?.[m]?.view);
                                  const canCreate = Boolean(perms?.[m]?.create);
                                  const canUpdate = Boolean(perms?.[m]?.update);
                                  const canDelete = Boolean(perms?.[m]?.delete);

                                  const markClass = (ok) => (ok ? "font-bold text-green-700" : "font-bold text-gray-400");

                                  return (
                                    <tr key={`${r}-${m}`} className="hover:bg-gray-50">
                                      <td className="px-3 py-1 text-left font-semibold text-gray-900 whitespace-nowrap">{humanizeKey(m)}</td>
                                      <td className="px-3 py-1 text-center">
                                        {supportsView ? <span className={markClass(canView)}>{canView ? "✓" : "×"}</span> : <span className="font-bold text-gray-300">-</span>}
                                      </td>
                                      <td className="px-3 py-1 text-center">
                                        {supportsCreate ? <span className={markClass(canCreate)}>{canCreate ? "✓" : "×"}</span> : <span className="font-bold text-gray-300">-</span>}
                                      </td>
                                      <td className="px-3 py-1 text-center">
                                        {supportsUpdate ? <span className={markClass(canUpdate)}>{canUpdate ? "✓" : "×"}</span> : <span className="font-bold text-gray-300">-</span>}
                                      </td>
                                      <td className="px-3 py-1 text-center">
                                        {supportsDelete ? <span className={markClass(canDelete)}>{canDelete ? "✓" : "×"}</span> : <span className="font-bold text-gray-300">-</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-gray-600 text-xs">No permissions configured.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 text-gray-600 text-sm">No role data available.</div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="mt-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-3">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Audit Log</div>
                <div className="mt-1 text-gray-500 text-xs">Search and filter user activity within your current church context.</div>
              </div>
              <FilterBar
                searchValue={auditSearch}
                onSearchChange={(v) => setAuditSearch(v)}
                searchPlaceholder="Search user name"
                searchWidth="md:w-[320px]"
                selects={[
                  {
                    key: "module",
                    value: auditModule,
                    onChange: (v) => setAuditModule(v),
                    options: auditModuleOptions.map((m) => ({ label: m, value: m })),
                    placeholder: "All Modules",
                  },
                  {
                    key: "action",
                    value: auditAction,
                    onChange: (v) => setAuditAction(v),
                    options: ["Create","Update","Delete","Activate","Deactivate","Convert","Login","Register","Logout","ChangePassword"].map((a) => ({ label: a, value: a })),
                    placeholder: "All Actions",
                  },
                  {
                    key: "role",
                    value: auditRole,
                    onChange: (v) => setAuditRole(v),
                    options: ["churchadmin","associateadmin","secretary","financialofficer","leader"].map((r) => ({ label: r, value: r })),
                    placeholder: "All Roles",
                  },
                ]}
                dateFrom={auditDateFrom}
                dateTo={auditDateTo}
                onDateApply={(from, to) => { setAuditDateFrom(from); setAuditDateTo(to); }}
              />
              <MobileFilterBar
                searchValue={auditSearch}
                onSearchChange={(v) => setAuditSearch(v)}
                searchPlaceholder="Search user name"
                dateFrom={auditDateFrom}
                dateTo={auditDateTo}
                onDateApply={(from, to) => { setAuditDateFrom(from); setAuditDateTo(to); }}
                filters={[
                  {
                    key: "module",
                    label: "Module",
                    value: auditModule,
                    defaultValue: "",
                    options: [{ label: "All Modules", value: "" }, ...auditModuleOptions.map((m) => ({ label: m, value: m }))],
                  },
                  {
                    key: "action",
                    label: "Action",
                    value: auditAction,
                    defaultValue: "",
                    options: [{ label: "All Actions", value: "" }, ...["Create","Update","Delete","Activate","Deactivate","Convert","Login","Register","Logout","ChangePassword"].map((a) => ({ label: a, value: a }))],
                  },
                  {
                    key: "role",
                    label: "Role",
                    value: auditRole,
                    defaultValue: "",
                    options: [{ label: "All Roles", value: "" }, ...["churchadmin","associateadmin","secretary","financialofficer","leader"].map((r) => ({ label: r, value: r }))],
                  },
                ]}
                onApply={(pending) => { setAuditModule(pending.module); setAuditAction(pending.action); setAuditRole(pending.role); }}
                resultCount={auditPagination?.total ?? null}
                getLiveCount={async ({ filters: f, dateFrom: dFrom, dateTo: dTo }) => {
                  try {
                    const params = { page: 1, limit: 1 };
                    if (f?.module && f.module !== "") params.module = f.module;
                    if (f?.action && f.action !== "") params.action = f.action;
                    if (f?.role && f.role !== "") params.role = f.role;
                    if (auditSearch) params.search = auditSearch;
                    if (dFrom) params.dateFrom = dFrom;
                    if (dTo) params.dateTo = dTo;
                    const res = await getActivityLogs(params);
                    return res?.data?.pagination?.total ?? null;
                  } catch {
                    return null;
                  }
                }}
              />
            </div>
            {auditError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{auditError}</div>
            ) : null}
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left font-semibold">Timestamp</th>
                    <th className="px-4 py-3 text-left font-semibold">User</th>
                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                    <th className="px-4 py-3 text-left font-semibold">Module</th>
                    <th className="px-4 py-3 text-left font-semibold">Activity</th>
                    <th className="px-4 py-3 text-left font-semibold">Device Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {auditLoading ? (
                    <>
                      {[0, 1, 2, 3].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="sticky left-0 z-10 bg-white px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                          <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                          <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                          <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                          <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                          <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                          <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                          <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-gray-200" /></td>
                        </tr>
                      ))}
                    </>
                  ) : auditLogs.length ? (
                    auditLogs.map((row) => {
                      const userName = row?.user?.fullName || row?.userName || "—";
                      const userRole = row?.user?.role || row?.userRole || "—";
                      const timestamp = row?.createdAt ? new Date(row.createdAt).toLocaleString() : "—";
                      const activity = activityTextFromLog(row) || "—";
                      const ok = String(row?.status || "").toLowerCase() === "success";
                      const deviceType = String(row?.deviceType || "").trim() || "—";
                      return (
                        <tr key={row?._id} className="hover:bg-gray-50">
                          <td className="sticky left-0 z-10 bg-white px-4 py-3 text-gray-700 whitespace-nowrap">{timestamp}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{userName}</div>
                            <div className="text-gray-500 text-xs">{userRole}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{row?.action || "—"}</td>
                          <td className="px-4 py-3 text-gray-700">{row?.module || "—"}</td>
                          <td className="px-4 py-3 text-gray-700">{activity}</td>
                          <td className="px-4 py-3 text-gray-700">{deviceType}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-xs ${ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {row?.status || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openAuditDetail(row)}
                              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 text-center text-gray-600 py-4 md:py-6">No audit logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-gray-500 text-xs">
              Total: <span className="font-semibold text-gray-700">{auditPagination?.total ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const prev = auditPagination?.prevPage;
                  if (!prev) return;
                  fetchAuditLogs({ page: prev });
                }}
                disabled={!auditPagination?.prevPage || auditLoading}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-xs"
              >
                Prev
              </button>
              <div className="text-gray-600 text-xs">
                Page <span className="font-semibold">{auditPagination?.currentPage ?? 1}</span> of <span className="font-semibold">{auditPagination?.totalPages ?? 1}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = auditPagination?.nextPage;
                  if (!next) return;
                  fetchAuditLogs({ page: next });
                }}
                disabled={!auditPagination?.nextPage || auditLoading}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-xl md:p-6 lg:p-8">
            <div className="font-semibold text-gray-900 text-lg">Confirm Action</div>

            <div className="mt-2 text-gray-700 text-sm">
              {confirmUser?.isActive === false
                ? "Activate this user? They will regain all permissions allowed by their role."
                : "Deactivate this user? They will no longer be able to create, edit or delete anything in the system, but can still view what their role permits."}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={!canWrite}
                className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white p-4 shadow-xl md:p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900 text-lg">Add User</div>
                <div className="mt-1 text-gray-600 text-sm">Create a new user and assign a role.</div>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-md px-2 py-1 font-semibold text-gray-500 hover:text-gray-900 text-sm"
              >
                ×
              </button>
            </div>

            {addError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{addError}</div> : null}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Phone Number</label>
                <PhoneNumberInput
                  value={newPhone}
                  onChange={setNewPhone}
                  error={Boolean(addError && String(addError).toLowerCase().includes("invalid phone"))}
                  inputClassName="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Password</label>
                <input
                  type="password"
                  placeholder="Create a password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  required
                >
                  <option value="">Select role</option>
                  {churchRoles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmittingUser}
                  loadingText="Saving..."
                  className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
                >
                  Add User
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white p-4 shadow-xl md:p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900 text-lg">Edit User</div>
                <div className="mt-1 text-gray-600 text-sm">Update user details and role.</div>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-md px-2 py-1 font-semibold text-gray-500 hover:text-gray-900 text-sm"
              >
                ×
              </button>
            </div>

            {editError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{editError}</div> : null}

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Phone Number</label>
                <PhoneNumberInput
                  value={editPhone}
                  onChange={setEditPhone}
                  error={Boolean(editError && String(editError).toLowerCase().includes("invalid phone"))}
                  inputClassName="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-sm">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  required
                >
                  <option value="">Select role</option>
                  {churchRoles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmittingEditUser}
                  loadingText="Saving..."
                  className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* User limit modal */}
      {userLimitModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setUserLimitModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-xl md:p-6 lg:p-8">
            <div className="font-semibold text-gray-900 text-lg">Limit Reached</div>
            <p className="mt-2 text-gray-600 text-sm">{userLimitMessage}</p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setUserLimitModalOpen(false)}
                className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SettingsPage;
