import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import { getChurchProfile, searchHeadquartersChurches, updateChurchProfile } from "../../church/services/church.api.js";
import Select from "react-select";
import currencyCodes from "currency-codes";
import { Country, State } from "country-state-city";
import { updateMyPassword, updateMyProfile } from "../../auth/services/auth.api.js";
import { getActivityLogs } from "../../activityLog/services/activityLog.api.js";
import {
  createChurchUser,
  getChurchUsers,
  getRolePermissions,
  setChurchUserStatus,
  updateChurchUser
} from "../services/settings.api.js";

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

  const [tab, setTab] = useState("my-profile");

  const [myProfileLoading, setMyProfileLoading] = useState(false);
  const [myProfileError, setMyProfileError] = useState("");
  const [myProfileSuccess, setMyProfileSuccess] = useState("");

  const [myFullName, setMyFullName] = useState("");
  const [myEmail, setMyEmail] = useState("");
  const [myPhone, setMyPhone] = useState("");
  const [myRole, setMyRole] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const avatarInputRef = useRef(null);

  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const passwordSectionRef = useRef(null);

  const isUserActive = useMemo(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("userIsActive") !== "0";
  }, []);

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
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [currency, setCurrency] = useState("");
  const [foundedDate, setFoundedDate] = useState("");
  const [referralCodeInput, setReferralCodeInput] = useState("");

  const countryOptions = useMemo(() => {
    return Country.getAllCountries().map((c) => ({
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

  const isBranch = type === "Branch";

  const avatarUrl =
    avatarPreviewUrl ||
    user?.profileImageUrl ||
    user?.avatarUrl ||
    user?.photoUrl ||
    user?.imageUrl ||
    user?.image ||
    "";

  const handlePickAvatar = () => {
    avatarInputRef.current?.click?.();
  };

  const handleSaveMyProfile = async (e) => {
    e.preventDefault();
    setMyProfileError("");
    setMyProfileSuccess("");

    try {
      setMyProfileLoading(true);

      const fd = new FormData();
      fd.append("fullName", myFullName);
      fd.append("email", myEmail);
      fd.append("phoneNumber", myPhone);
      if (avatarFile) {
        fd.append("avatar", avatarFile);
      }

      await updateMyProfile(fd);
      await refreshUser?.();
      setAvatarFile(null);
      setMyProfileSuccess("Profile updated successfully");
    } catch (err) {
      setMyProfileError(err?.response?.data?.message || err?.message || "Failed to update profile");
    } finally {
      setMyProfileLoading(false);
    }
  };

  const handleUpdateMyPassword = async (e) => {
    e.preventDefault();
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
        setRegion(church?.region || "");
        setCountry(church?.country || "");

        const nextCountry = String(church?.country || "").trim().toLowerCase();
        const matchedCountry = nextCountry
          ? countryOptions.find((o) => String(o.label || "").trim().toLowerCase() === nextCountry) || null
          : null;
        setCountryCode(matchedCountry?.value || "");

        if (matchedCountry?.value) {
          const nextRegion = String(church?.region || "").trim().toLowerCase();
          const states = State.getStatesOfCountry(matchedCountry.value);
          const matchedState = nextRegion
            ? (Array.isArray(states) ? states : []).find((s) => String(s.name || "").trim().toLowerCase() === nextRegion) || null
            : null;
          setStateCode(matchedState?.isoCode || "");
        } else {
          setStateCode("");
        }
        setCurrency(
          String(church?.currency || "").trim().toUpperCase() ||
            (String(church?.country || "").trim().toLowerCase() === "ghana" ? "GHS" : "USD")
        );
        setFoundedDate(formatYmdLocal(church?.foundedDate));
        setReferralCodeInput("");
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
    if (!activeChurch?._id) return;

    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess("");

    if (type === "Branch" && !parentChurchId) {
      setProfileLoading(false);
      setProfileError("Please select a headquarters church from the list");
      return;
    }

    try {
      const payload = {
        name,
        pastor,
        type,
        parentChurch: type === "Branch" ? parentChurchId : null,
        phoneNumber,
        email,
        city,
        region,
        country,
        currency: String(currency || "").trim().toUpperCase(),
        foundedDate: foundedDate || null
      };

      await updateChurchProfile(activeChurch._id, payload);

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
  const [addError, setAddError] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editUser, setEditUser] = useState(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");

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

  const handleOpenAdd = () => {
    setAddError("");
    setNewFullName("");
    setNewEmail("");
    setNewPhone("");
    setNewPassword("");
    setNewRole("");
    setAddOpen(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    setAddLoading(true);
    setAddError("");

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
    if (!editUser?._id) return;

    setEditLoading(true);
    setEditError("");

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
    }
  };

  const churchRoles = useMemo(() => {
    const list = roleConfig?.roleList?.churchRoles;
    return Array.isArray(list) ? list : [];
  }, [roleConfig]);

  const rolePermissions = roleConfig?.roles || {};

  const availableRoleModules = useMemo(
    () => [
      "Members",
      "Attendance",
      "Programs & Events",
      "Ministries",
      "Announcement",
      "Tithes",
      "Special fund",
      "Offerings",
      "Welfare",
      "Pledges",
      "Business Ventures",
      "Expenses",
      "Financial statement",
      "Reports & Analytics",
      "Billing",
      "Referrals",
      "Settings",
      "Support & Help"
    ],
    []
  );

  if (!canRead) {
    return (
      <div className="max-w-6xl">
        <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
        <p className="mt-2 text-sm text-gray-600">You do not have permission to view settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
          <p className="mt-2 text-sm text-gray-600">Manage your church profile, users and roles</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setTab("my-profile")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "my-profile" ? "bg-white shadow-sm text-blue-900" : "text-gray-600 hover:text-gray-900"}`}
            >
              My Profile
            </button>
            <button
              type="button"
              onClick={() => setTab("profile")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "profile" ? "bg-white shadow-sm text-blue-900" : "text-gray-600 hover:text-gray-900"}`}
            >
              Church Profile
            </button>
            <button
              type="button"
              onClick={() => setTab("users")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "users" ? "bg-white shadow-sm text-blue-900" : "text-gray-600 hover:text-gray-900"}`}
            >
              Users &amp; Roles
            </button>
            <button
              type="button"
              onClick={() => setTab("audit")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "audit" ? "bg-white shadow-sm text-blue-900" : "text-gray-600 hover:text-gray-900"}`}
            >
              Audit Log
            </button>
          </div>
        </div>
      </div>

      {tab === "my-profile" ? (
        <div className="mt-6">
          {myProfileError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{myProfileError}</div> : null}
          {myProfileSuccess ? <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{myProfileSuccess}</div> : null}

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-gray-900">User Details</div>
                <div className="mt-1 text-xs text-gray-500">Update your account information and profile picture.</div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-5 flex-wrap">
              <div className="shrink-0">
                <div className="relative h-24 w-24">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.fullName || "User"}
                      className="h-24 w-24 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-blue-900 text-white flex items-center justify-center text-2xl font-semibold">
                      {(user?.fullName || "U").slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handlePickAvatar}
                    disabled={!isUserActive}
                    className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                    title="Edit"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-700">
                      <path d="M4 20h4l10.5-10.5a2 2 0 10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setAvatarFile(f);
                    }}
                  />
                </div>
              </div>

              <form onSubmit={handleSaveMyProfile} className="flex-1 min-w-[260px] space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={myFullName}
                    onChange={(e) => setMyFullName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                    required
                    disabled={!isUserActive}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={myEmail}
                    onChange={(e) => setMyEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                    required
                    disabled={!isUserActive}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={myPhone}
                    onChange={(e) => setMyPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                    required
                    disabled={!isUserActive}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={myRole}
                    readOnly
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-gray-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={myProfileLoading || !isUserActive}
                  className="w-full bg-blue-900 text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-800 disabled:opacity-50"
                >
                  {myProfileLoading ? "Saving..." : "Save Profile"}
                </button>
              </form>
            </div>
          </div>

          <div ref={passwordSectionRef} className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Change Password</div>
            <div className="mt-1 text-xs text-gray-500">Update your password using your current password.</div>

            {pwError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{pwError}</div> : null}
            {pwSuccess ? <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{pwSuccess}</div> : null}

            <form onSubmit={handleUpdateMyPassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Old Password</label>
                <input
                  type="password"
                  value={pwOld}
                  onChange={(e) => setPwOld(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  required
                  disabled={!isUserActive}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={pwNew}
                    onChange={(e) => setPwNew(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                    required
                    disabled={!isUserActive}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                    required
                    disabled={!isUserActive}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pwLoading || !isUserActive}
                className="w-full bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-800 disabled:opacity-50"
              >
                {pwLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {auditDetailOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAuditDetailOpen(false)} />
          <div className="relative w-full max-w-4xl rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">Audit Log Details</div>
                <div className="mt-1 text-xs text-gray-500">All captured fields for this activity.</div>
              </div>
              <button
                type="button"
                onClick={() => setAuditDetailOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Timestamp</div>
                    <div className="mt-1 text-gray-900">
                      {auditDetailRow?.createdAt ? new Date(auditDetailRow.createdAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Status</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.status || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500">User</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.user?.fullName || auditDetailRow?.userName || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Role</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.user?.role || auditDetailRow?.userRole || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500">Module</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.module || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Action</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.action || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500">Activity</div>
                    <div className="mt-1 text-gray-900">{activityTextFromLog(auditDetailRow) || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Description</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.description || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500">HTTP Method</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.httpMethod || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Path</div>
                    <div className="mt-1 text-gray-900 break-all">{auditDetailRow?.path || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500">Resource</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.resource || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Response Code</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.responseStatusCode ?? "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500">Device Type</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.deviceType || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Model</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.model || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500">Browser</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.browser || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500">OS</div>
                    <div className="mt-1 text-gray-900">{auditDetailRow?.os || "—"}</div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-xs font-semibold text-gray-500">User Agent</div>
                    <div className="mt-1 text-gray-900 break-all">{auditDetailRow?.userAgent || "—"}</div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-xs font-semibold text-gray-500">IP Address</div>
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
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-700">
                  <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Current Church Type: {type || "—"}</div>
                <div className="mt-1 text-sm text-gray-600">{getChurchTypeInfo(type) || "—"}</div>
              </div>
            </div>
          </div>

          {profileError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{profileError}</div> : null}
          {profileSuccess ? <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{profileSuccess}</div> : null}

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Church Name</label>
                <input
                  type="text"
                  placeholder="Your church name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  required
                  disabled={!canWrite}
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
                  disabled={!canWrite}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Church Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  disabled={!canWrite}
                >
                  <option value="Headquarters">Headquarters</option>
                  <option value="Branch">Branch</option>
                  <option value="Independent">Independent</option>
                </select>
              </div>

              {type === "Branch" ? (
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
                    disabled={!canWrite}
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
                              disabled={!canWrite}
                            >
                              <div className="text-sm font-semibold text-gray-900 truncate">{c?.name || "—"}</div>
                              <div className="mt-0.5 text-xs text-gray-600 truncate">
                                {`${c?.city || ""}${c?.region ? `, ${c.region}` : ""}`.trim() || "—"}
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
              ) : null}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  required
                  disabled={!canWrite}
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
                  disabled={!canWrite}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="Enter your location"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  required
                  disabled={!canWrite}
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
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Founded Date (optional)</label>
                <input
                  type="date"
                  value={foundedDate}
                  onChange={(e) => setFoundedDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  disabled={!canWrite}
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
                  disabled
                />
              </div>

              <button
                type="submit"
                disabled={profileLoading || !canWrite || (type === "Branch" && !parentChurchId)}
                className="w-full bg-blue-900 text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-800 disabled:opacity-50"
              >
                {profileLoading ? "Saving..." : "Update Church Profile"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {tab === "users" ? (
        <div className="mt-6">
          {rolesError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{rolesError}</div> : null}
          {usersError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{usersError}</div> : null}

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user name, email or phone…"
                  className="w-full sm:max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                />

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="w-full sm:max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                >
                  <option value="">All roles</option>
                  {churchRoles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  disabled={!canWrite}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  Add User
                </button>
              </div>
            </div>

            {usersLoading ? (
              <div className="mt-4 text-sm text-gray-600">Loading users…</div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
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
                            <td className="px-4 py-3 font-semibold text-gray-900">{row?.fullName || "—"}</td>
                            <td className="px-4 py-3 text-gray-700">{row?.email || "—"}</td>
                            <td className="px-4 py-3 text-gray-700">{row?.phoneNumber || "—"}</td>
                            <td className="px-4 py-3 text-gray-700">{row?.role || "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                                {isActive ? "Active" : "Deactivated"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(row)}
                                  disabled={!canWrite}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeactivateConfirm(row)}
                                  disabled={!canWrite}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${isActive ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100" : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"}`}
                                >
                                  {isActive ? "Deactivate" : "Activate"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-gray-600">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">Available Roles</div>
                <div className="mt-1 text-xs text-gray-500">Roles and what they can do in the system</div>
              </div>
            </div>

            {rolesLoading ? (
              <div className="mt-4 text-sm text-gray-600">Loading roles…</div>
            ) : churchRoles.length ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {churchRoles.map((r) => {
                  const modules = availableRoleModules;
                  const normalizedRole = String(r || "").trim().toLowerCase();
                  const isChurchAdmin = normalizedRole === "churchadmin";

                  return (
                    <div key={r} className="rounded-lg border border-gray-200 p-4">
                      <div className="text-sm font-semibold text-gray-900">{r}</div>
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
                                  const canView = isChurchAdmin || true;
                                  const canCreate = isChurchAdmin || true;
                                  const canUpdate = isChurchAdmin;
                                  const canDelete = isChurchAdmin;

                                  const markClass = (ok) => (ok ? "font-bold text-green-700" : "font-bold text-gray-400");

                                  return (
                                    <tr key={`${r}-${m}`} className="hover:bg-gray-50">
                                      <td className="px-3 py-1 text-left font-semibold text-gray-900 whitespace-nowrap">{m}</td>
                                      <td className="px-3 py-1 text-center"><span className={markClass(canView)}>{canView ? "✓" : "×"}</span></td>
                                      <td className="px-3 py-1 text-center"><span className={markClass(canCreate)}>{canCreate ? "✓" : "×"}</span></td>
                                      <td className="px-3 py-1 text-center"><span className={markClass(canUpdate)}>{canUpdate ? "✓" : "×"}</span></td>
                                      <td className="px-3 py-1 text-center"><span className={markClass(canDelete)}>{canDelete ? "✓" : "×"}</span></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-600">No permissions configured.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 text-sm text-gray-600">No role data available.</div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="mt-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-gray-900">Audit Log</div>
                <div className="mt-1 text-xs text-gray-500">Search and filter user activity within your current church context.</div>
              </div>
            </div>

            {auditError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{auditError}</div>
            ) : null}

            <div className="mt-4 flex flex-nowrap items-end gap-3 overflow-x-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Search:</span>
                <input
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="h-9 w-[240px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  placeholder="User name"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Module:</span>
                <select
                  value={auditModule}
                  onChange={(e) => setAuditModule(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                >
                  <option value="">All Modules</option>
                  <option value="Authentication">Authentication</option>
                  <option value="Members">Members</option>
                  <option value="Attendance">Attendance</option>
                  <option value="Events">Events</option>
                  <option value="Announcements">Announcements</option>
                  <option value="Tithe">Tithe</option>
                  <option value="Income">Income</option>
                  <option value="Expense">Expense</option>
                  <option value="SpecialFunds">SpecialFunds</option>
                  <option value="Offerings">Offerings</option>
                  <option value="Welfare">Welfare</option>
                  <option value="Church">Church</option>
                  <option value="Settings">Settings</option>
                  <option value="ReportsAnalytics">ReportsAnalytics</option>
                  <option value="Dashboard">Dashboard</option>
                  <option value="System">System</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Action:</span>
                <select
                  value={auditAction}
                  onChange={(e) => setAuditAction(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                >
                  <option value="">All Actions</option>
                  <option value="Create">Create</option>
                  <option value="Update">Update</option>
                  <option value="Delete">Delete</option>
                  <option value="Activate">Activate</option>
                  <option value="Deactivate">Deactivate</option>
                  <option value="Convert">Convert</option>
                  <option value="Login">Login</option>
                  <option value="Register">Register</option>
                  <option value="Logout">Logout</option>
                  <option value="ChangePassword">ChangePassword</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Role:</span>
                <select
                  value={auditRole}
                  onChange={(e) => setAuditRole(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                >
                  <option value="">All Roles</option>
                  <option value="churchadmin">churchadmin</option>
                  <option value="associateadmin">associateadmin</option>
                  <option value="secretary">secretary</option>
                  <option value="financialofficer">financialofficer</option>
                  <option value="leader">leader</option>
                </select>
              </div>

              <div className="relative" ref={auditDatePickerRef}>
                <button
                  type="button"
                  onClick={() => setAuditDatePickerOpen((v) => !v)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-500">
                    <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  <span className="text-gray-700">Date</span>
                  <span className="text-xs text-gray-500">{auditDateFrom || auditDateTo ? "Filtered" : "All"}</span>
                </button>

                {auditDatePickerOpen ? (
                  <div className="absolute right-0 z-20 mt-2 w-[320px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
                    <div className="flex items-center justify-between gap-3 pb-3">
                      <div className="text-xs font-semibold text-gray-500">Filter by date</div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuditDraftFrom("");
                          setAuditDraftTo("");
                          setAuditDateFrom("");
                          setAuditDateTo("");
                          setAuditDatePickerOpen(false);
                        }}
                        className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs font-semibold text-gray-500">From</div>
                        <input
                          type="date"
                          value={auditDraftFrom}
                          onChange={(e) => {
                            const value = e.target.value;
                            setAuditDraftFrom(value);
                            if (auditDraftTo && value && auditDraftTo < value) {
                              setAuditDraftTo("");
                            }
                          }}
                          className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500">To</div>
                        <input
                          type="date"
                          value={auditDraftTo}
                          min={auditDraftFrom || undefined}
                          onChange={(e) => setAuditDraftTo(e.target.value)}
                          className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                        />
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const from = auditDraftFrom || "";
                          const to = auditDraftTo || "";

                          if (!from && !to) {
                            setAuditDateFrom("");
                            setAuditDateTo("");
                            setAuditDatePickerOpen(false);
                            return;
                          }

                          if ((from && !to) || (!from && to)) {
                            const single = from || to;
                            setAuditDateFrom(single);
                            setAuditDateTo(single);
                            setAuditDatePickerOpen(false);
                            return;
                          }

                          setAuditDateFrom(from);
                          setAuditDateTo(to);
                          setAuditDatePickerOpen(false);
                        }}
                        className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
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
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-gray-600">Loading...</td>
                    </tr>
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
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{timestamp}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{userName}</div>
                            <div className="text-xs text-gray-500">{userRole}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{row?.action || "—"}</td>
                          <td className="px-4 py-3 text-gray-700">{row?.module || "—"}</td>
                          <td className="px-4 py-3 text-gray-700">{activity}</td>
                          <td className="px-4 py-3 text-gray-700">{deviceType}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {row?.status || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openAuditDetail(row)}
                              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-gray-600">No audit logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-gray-500">
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
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Prev
              </button>
              <div className="text-xs text-gray-600">
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
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
          <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="text-lg font-semibold text-gray-900">Confirm Action</div>

            <div className="mt-2 text-sm text-gray-700">
              {confirmUser?.isActive === false
                ? "Activate this user? They will regain all permissions allowed by their role."
                : "Deactivate this user? They will no longer be able to create, edit or delete anything in the system, but can still view what their role permits."}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={!canWrite}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
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
          <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">Add User</div>
                <div className="mt-1 text-sm text-gray-600">Create a new user and assign a role.</div>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-md px-2 py-1 text-sm font-semibold text-gray-500 hover:text-gray-900"
              >
                ×
              </button>
            </div>

            {addError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{addError}</div> : null}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Create a password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
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
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {addLoading ? "Saving..." : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">Edit User</div>
                <div className="mt-1 text-sm text-gray-600">Update user details and role.</div>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-md px-2 py-1 text-sm font-semibold text-gray-500 hover:text-gray-900"
              >
                ×
              </button>
            </div>

            {editError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{editError}</div> : null}

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
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
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SettingsPage;
