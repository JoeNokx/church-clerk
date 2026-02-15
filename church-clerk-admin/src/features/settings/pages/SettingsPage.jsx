import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Select from "react-select";
import { Country, State } from "country-state-city";
import currencyCodes from "currency-codes";

import { useAuth } from "../../Auth/useAuth.js";
import ChurchContext from "../../Church/church.store.js";
import PermissionContext from "../../Permissions/permission.store.js";

import { getChurchProfile, searchHeadquartersChurches, updateChurchProfile } from "../../Church/services/church.api.js";
import { getActivityLogs } from "../../activityLog/services/activityLog.api.js";
import { getSystemAuditLogs } from "../../SystemAdmin/Services/systemAdmin.api.js";
import {
  createChurchUser,
  getChurchUsers,
  getRolePermissions,
  setChurchUserStatus,
  updateChurchUser
} from "../services/settings.api.js";

function SettingsPage() {
  const location = useLocation();
  const { user } = useAuth();
  const churchCtx = useContext(ChurchContext);
  const activeChurch = churchCtx?.activeChurch;

  const normalizedRole = useMemo(() => {
    return String(user?.role || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }, [user?.role]);
  const isSystemAdmin = useMemo(() => {
    return normalizedRole === "superadmin" || normalizedRole === "supportadmin";
  }, [normalizedRole]);

  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(() => (isSystemAdmin ? true : typeof can === "function" ? can("settings", "read") : true), [can, isSystemAdmin]);
  const canWrite = useMemo(() => (typeof can === "function" ? can("settings", "update") : true), [can]);

  const [tab, setTab] = useState("church-profile");

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const next = String(sp.get("tab") || "").trim().toLowerCase();
    if (next === "church-profile" || next === "profile") setTab("church-profile");
    else if (next === "users") setTab("users");
    else if (next === "audit") setTab("audit");
    else setTab("church-profile");
  }, [location.search]);

  const [churchLoading, setChurchLoading] = useState(false);
  const [churchError, setChurchError] = useState("");
  const [churchSuccess, setChurchSuccess] = useState("");

  const [churchName, setChurchName] = useState("");
  const [churchEmail, setChurchEmail] = useState("");
  const [churchPhone, setChurchPhone] = useState("");
  const [churchPastor, setChurchPastor] = useState("");
  const [churchCity, setChurchCity] = useState("");

  const [churchType, setChurchType] = useState("Independent");
  const [churchParentChurchId, setChurchParentChurchId] = useState("");
  const [hqSearch, setHqSearch] = useState("");
  const [hqLoading, setHqLoading] = useState(false);
  const [hqMessage, setHqMessage] = useState("");
  const [hqResults, setHqResults] = useState([]);
  const [hqDropdownOpen, setHqDropdownOpen] = useState(false);

  const [churchStreetAddress, setChurchStreetAddress] = useState("");
  const [churchRegion, setChurchRegion] = useState("");
  const [churchCountry, setChurchCountry] = useState("");
  const [churchCurrency, setChurchCurrency] = useState("");
  const [churchFoundedDate, setChurchFoundedDate] = useState("");

  const countryOptions = useMemo(() => {
    const rows = Country.getAllCountries();
    return rows
      .map((c) => ({ value: c?.name || "", label: c?.name || "", isoCode: c?.isoCode || "" }))
      .filter((o) => o.value)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const selectedCountryOption = useMemo(() => {
    const raw = String(churchCountry || "").trim().toLowerCase();
    if (!raw) return null;
    return countryOptions.find((o) => String(o.value).toLowerCase() === raw) || null;
  }, [churchCountry, countryOptions]);

  const selectedCountryIso = selectedCountryOption?.isoCode || "";

  const regionOptions = useMemo(() => {
    if (!selectedCountryIso) return [];
    const rows = State.getStatesOfCountry(selectedCountryIso) || [];
    return rows
      .map((s) => ({ value: s?.name || "", label: s?.name || "" }))
      .filter((o) => o.value)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedCountryIso]);

  const selectedRegionOption = useMemo(() => {
    const raw = String(churchRegion || "").trim().toLowerCase();
    if (!raw) return null;
    return regionOptions.find((o) => String(o.value).toLowerCase() === raw) || null;
  }, [churchRegion, regionOptions]);

  const currencyOptions = useMemo(() => {
    const data = Array.isArray(currencyCodes?.data)
      ? currencyCodes.data
      : Array.isArray(currencyCodes?.default?.data)
        ? currencyCodes.default.data
        : [];
    const byCode = new Map();
    for (const row of data) {
      const code = String(row?.code || "").trim().toUpperCase();
      if (!code) continue;
      if (byCode.has(code)) continue;
      const name = String(row?.currency || "").trim();
      byCode.set(code, {
        value: code,
        label: name ? `${code} - ${name}` : code
      });
    }
    return Array.from(byCode.values()).sort((a, b) => a.value.localeCompare(b.value));
  }, []);

  const selectedCurrencyOption = useMemo(() => {
    const code = String(churchCurrency || "").trim().toUpperCase();
    if (!code) return null;
    return currencyOptions.find((o) => o.value === code) || null;
  }, [churchCurrency, currencyOptions]);

  const loadChurchProfile = async () => {
    if (!activeChurch?._id) return;
    setChurchLoading(true);
    setChurchError("");
    setChurchSuccess("");

    try {
      const res = await getChurchProfile(activeChurch._id);
      const row = res?.data?.church || res?.data?.data || res?.data || null;
      setChurchName(row?.name || "");
      setChurchEmail(row?.email || "");
      setChurchPhone(row?.phoneNumber || "");
      setChurchPastor(row?.pastor || "");
      setChurchCity(row?.city || "");

      setChurchType(row?.type || "Independent");
      const parentId = row?.parentChurch?._id || row?.parentChurch || "";
      setChurchParentChurchId(parentId ? String(parentId) : "");
      if (row?.parentChurch && typeof row.parentChurch === "object") {
        const loc = `${row?.parentChurch?.city || ""}${row?.parentChurch?.region ? `, ${row.parentChurch.region}` : ""}`.trim();
        setHqSearch(row?.parentChurch?.name ? `${row.parentChurch.name}${loc ? ` (${loc})` : ""}` : "");
      } else {
        setHqSearch("");
      }

      setChurchStreetAddress(row?.streetAddress || "");
      setChurchRegion(row?.region || "");
      setChurchCountry(row?.country || "");
      setChurchCurrency(row?.currency || "");
      setChurchFoundedDate(row?.foundedDate ? new Date(row.foundedDate).toISOString().slice(0, 10) : "");
    } catch (err) {
      setChurchError(err?.response?.data?.message || err?.message || "Failed to load church profile");
    } finally {
      setChurchLoading(false);
    }
  };

  useEffect(() => {
    if (!canRead) return;
    if (tab !== "church-profile") return;
    void loadChurchProfile();
  }, [tab, canRead, activeChurch?._id]);

  useEffect(() => {
    if (!canRead) return;
    if (tab !== "church-profile") return;
    if (churchType !== "Branch") {
      setHqResults([]);
      setHqMessage("");
      setHqLoading(false);
      setHqDropdownOpen(false);
      setChurchParentChurchId("");
      return;
    }

    if (!hqDropdownOpen) return;
    const q = String(hqSearch || "").trim();
    if (q.length < 2) {
      setHqResults([]);
      setHqMessage("Type to search headquarters churches.");
      return;
    }

    const t = setTimeout(async () => {
      setHqLoading(true);
      setHqMessage("");
      try {
        const res = await searchHeadquartersChurches({ search: q });
        const rows = Array.isArray(res?.data) ? res.data : [];
        setHqResults(rows);
        if (!rows.length) {
          setHqMessage(res?.data?.message || "No church matched your search");
        }
      } catch (err) {
        setHqResults([]);
        setHqMessage(err?.response?.data?.message || err?.message || "Failed to search headquarters churches");
      } finally {
        setHqLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [canRead, churchType, hqDropdownOpen, hqSearch, tab]);

  const saveChurchProfile = async (e) => {
    e.preventDefault();
    if (!activeChurch?._id) return;

    setChurchError("");
    setChurchSuccess("");

    try {
      setChurchLoading(true);
      await updateChurchProfile(activeChurch._id, {
        name: churchName,
        type: churchType,
        parentChurch: churchType === "Branch" ? churchParentChurchId || null : null,
        pastor: churchPastor,
        phoneNumber: churchPhone,
        email: churchEmail,
        city: churchCity,
        streetAddress: churchStreetAddress,
        region: churchRegion,
        country: churchCountry,
        currency: churchCurrency,
        foundedDate: churchFoundedDate || null
      });
      setChurchSuccess("Church profile updated successfully");
    } catch (err) {
      setChurchError(err?.response?.data?.message || err?.message || "Failed to update church profile");
    } finally {
      setChurchLoading(false);
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

  const churchRoles = useMemo(() => {
    const list = roleConfig?.roleList?.churchRoles;
    return Array.isArray(list) ? list : [];
  }, [roleConfig]);

  const loadRoles = async () => {
    setRolesLoading(true);
    setRolesError("");
    try {
      const res = await getRolePermissions();
      setRoleConfig(res?.data || null);
    } catch (err) {
      setRoleConfig(null);
      setRolesError(err?.response?.data?.message || err?.message || "Failed to load roles");
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
    } catch (err) {
      setUsers([]);
      setUsersError(err?.response?.data?.message || err?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (!canRead) return;
    if (tab !== "users") return;
    void loadRoles();
    void loadUsers({});
  }, [tab, canRead]);

  useEffect(() => {
    if (!canRead) return;
    if (tab !== "users") return;

    const t = setTimeout(() => {
      void loadUsers({ search: userSearch, role: userRoleFilter });
    }, 250);

    return () => clearTimeout(t);
  }, [tab, userSearch, userRoleFilter, canRead]);

  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("");

  const openAdd = () => {
    setAddError("");
    setNewFullName("");
    setNewEmail("");
    setNewPhone("");
    setNewPassword("");
    setNewRole("");
    setAddOpen(true);
  };

  const createUser = async (e) => {
    e.preventDefault();
    setAddError("");

    try {
      setAddLoading(true);
      const res = await createChurchUser({
        fullName: newFullName,
        email: newEmail,
        phoneNumber: newPhone,
        password: newPassword,
        role: newRole
      });

      const created = res?.data?.user;
      if (created?._id) {
        setUsers((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
      }
      setAddOpen(false);
    } catch (err) {
      setAddError(err?.response?.data?.message || err?.message || "Failed to create user");
    } finally {
      setAddLoading(false);
    }
  };

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editUser, setEditUser] = useState(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");

  const openEdit = (row) => {
    setEditError("");
    setEditUser(row || null);
    setEditFullName(row?.fullName || "");
    setEditEmail(row?.email || "");
    setEditPhone(row?.phoneNumber || "");
    setEditRole(row?.role || "");
    setEditOpen(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editUser?._id) return;

    setEditError("");

    try {
      setEditLoading(true);
      const res = await updateChurchUser(editUser._id, {
        fullName: editFullName,
        email: editEmail,
        phoneNumber: editPhone,
        role: editRole
      });
      const updated = res?.data?.user;
      if (updated?._id) {
        setUsers((prev) => (Array.isArray(prev) ? prev.map((u) => (String(u?._id) === String(updated._id) ? updated : u)) : prev));
      }
      setEditOpen(false);
      setEditUser(null);
    } catch (err) {
      setEditError(err?.response?.data?.message || err?.message || "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  };

  const toggleUserActive = async (row) => {
    if (!row?._id) return;

    setUsersError("");

    try {
      const nextActive = row?.isActive === false;
      const res = await setChurchUserStatus(row._id, nextActive);
      const updated = res?.data?.user;

      if (updated?._id) {
        setUsers((prev) => (Array.isArray(prev) ? prev.map((u) => (String(u?._id) === String(updated._id) ? updated : u)) : prev));
      }
    } catch (err) {
      setUsersError(err?.response?.data?.message || err?.message || "Failed to update user status");
    }
  };

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
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  const fetchAuditLogs = async (partial = {}) => {
    const next = {
      search: auditSearch,
      module: auditModule,
      action: auditAction,
      dateFrom: auditDateFrom,
      dateTo: auditDateTo,
      page: auditPage,
      limit: auditPagination.limit,
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
      if (next.dateFrom) params.dateFrom = next.dateFrom;
      if (next.dateTo) params.dateTo = next.dateTo;

      const res = isSystemAdmin
        ? await getSystemAuditLogs({ ...params, churchId: activeChurch?._id || undefined })
        : await getActivityLogs(params);
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
      setAuditDateFrom(next.dateFrom);
      setAuditDateTo(next.dateTo);
      setAuditPage(next.page);
    } catch (err) {
      setAuditLogs([]);
      setAuditPagination({ total: 0, totalPages: 1, currentPage: 1, limit: auditPagination.limit, nextPage: null, prevPage: null });
      setAuditError(err?.response?.data?.message || err?.message || "Failed to load audit logs");
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (!canRead) return;
    if (tab !== "audit") return;

    void fetchAuditLogs({ page: 1 });
  }, [tab, canRead]);

  useEffect(() => {
    if (!canRead) return;
    if (tab !== "audit") return;

    const t = setTimeout(() => {
      void fetchAuditLogs({ page: 1 });
    }, 300);

    return () => clearTimeout(t);
  }, [auditSearch, auditModule, auditAction, auditDateFrom, auditDateTo, tab, canRead]);

  if (!canRead) {
    return (
      <div className="max-w-6xl">
        <div className="text-2xl font-semibold text-gray-900">Settings</div>
        <div className="mt-2 text-sm text-gray-600">You do not have permission to view this page.</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Settings</div>
          <div className="mt-2 text-sm text-gray-600">Manage your church settings and users.</div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setTab("church-profile")}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "church-profile" ? "bg-white shadow-sm text-blue-900" : "text-gray-600 hover:text-gray-900"}`}
          >
            Church Profile
          </button>
          <button
            type="button"
            onClick={() => setTab("users")}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "users" ? "bg-white shadow-sm text-blue-900" : "text-gray-600 hover:text-gray-900"}`}
          >
            Users
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

      {tab === "church-profile" ? (
        <div className="mt-6">
          {churchError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{churchError}</div> : null}
          {churchSuccess ? <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{churchSuccess}</div> : null}

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Church Details</div>
            <div className="mt-2 text-xs text-gray-500">Active church: {activeChurch?.name || "—"}</div>

            {churchLoading ? <div className="mt-4 text-sm text-gray-600">Loading…</div> : null}

            <form onSubmit={saveChurchProfile} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-500">Name</div>
                <input
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Email</div>
                <input
                  value={churchEmail}
                  onChange={(e) => setChurchEmail(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Phone</div>
                <input
                  value={churchPhone}
                  onChange={(e) => setChurchPhone(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Pastor</div>
                <input
                  value={churchPastor}
                  onChange={(e) => setChurchPastor(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500">Church Type</div>
                <select
                  value={churchType}
                  onChange={(e) => {
                    setChurchType(e.target.value);
                    setHqSearch("");
                    setChurchParentChurchId("");
                    setHqDropdownOpen(false);
                  }}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                >
                  <option value="Headquarters">Headquarters</option>
                  <option value="Branch">Branch</option>
                  <option value="Independent">Independent</option>
                </select>
              </div>

              {churchType === "Branch" ? (
                <div className="relative">
                  <div className="text-xs font-semibold text-gray-500">Parent Church (HQ)</div>
                  <input
                    value={hqSearch}
                    onChange={(e) => {
                      setHqSearch(e.target.value);
                      setChurchParentChurchId("");
                      setHqDropdownOpen(true);
                    }}
                    onFocus={() => setHqDropdownOpen(true)}
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                    placeholder="Search headquarters church"
                  />

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
                                setChurchParentChurchId(c?._id ? String(c._id) : "");
                                const loc = `${c?.city || ""}${c?.region ? `, ${c.region}` : ""}`.trim();
                                setHqSearch(c?.name ? `${c.name}${loc ? ` (${loc})` : ""}` : "");
                                setHqDropdownOpen(false);
                                setHqMessage("");
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50"
                              disabled={!canWrite}
                            >
                              <div className="text-sm font-semibold text-gray-900 truncate">{c?.name || "—"}</div>
                              <div className="mt-0.5 text-xs text-gray-600 truncate">{`${c?.city || ""}${c?.region ? `, ${c.region}` : ""}`.trim() || "—"}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-600">Type to search headquarters churches.</div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {churchParentChurchId ? <div className="mt-1 text-xs text-gray-500">Selected: {churchParentChurchId}</div> : null}
                </div>
              ) : null}

              <div>
                <div className="text-xs font-semibold text-gray-500">City</div>
                <input
                  value={churchCity}
                  onChange={(e) => setChurchCity(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Street Address</div>
                <input
                  value={churchStreetAddress}
                  onChange={(e) => setChurchStreetAddress(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500">Region</div>
                <div className="mt-2">
                  <Select
                    value={selectedRegionOption}
                    options={regionOptions}
                    onChange={(opt) => setChurchRegion(opt?.value || "")}
                    placeholder={selectedCountryIso ? "Select region" : "Select a country first"}
                    isClearable
                    isSearchable
                    isDisabled={!canWrite || !selectedCountryIso}
                    classNamePrefix="react-select"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Country</div>
                <div className="mt-2">
                  <Select
                    value={selectedCountryOption}
                    options={countryOptions}
                    onChange={(opt) => {
                      setChurchCountry(opt?.value || "");
                      setChurchRegion("");
                    }}
                    placeholder="Select country"
                    isClearable
                    isSearchable
                    isDisabled={!canWrite}
                    classNamePrefix="react-select"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Currency (3-letter code)</div>
                <div className="mt-2">
                  <Select
                    value={selectedCurrencyOption}
                    options={currencyOptions}
                    onChange={(opt) => setChurchCurrency(opt?.value || "")}
                    placeholder="Select currency"
                    isClearable
                    isSearchable
                    isDisabled={!canWrite}
                    classNamePrefix="react-select"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Founded Date (optional)</div>
                <input
                  type="date"
                  value={churchFoundedDate}
                  onChange={(e) => setChurchFoundedDate(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={!canWrite || churchLoading || !activeChurch?._id || (churchType === "Branch" && !churchParentChurchId)}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {churchLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {tab === "users" ? (
        <div className="mt-6">
          {rolesError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{rolesError}</div> : null}
          {usersError ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{usersError}</div> : null}

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
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={openAdd}
                  disabled={!canWrite}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  Add User
                </button>
              </div>
            </div>

            {addOpen ? (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-900">New User</div>
                {addError ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{addError}</div> : null}
                <form onSubmit={createUser} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Full name"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  />
                  <input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Email"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  />
                  <input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Phone"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Temp password"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  />
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  >
                    <option value="">Select role</option>
                    {churchRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
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
                      disabled={!canWrite || addLoading}
                      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {addLoading ? "Creating…" : "Create"}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}

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
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {isActive ? "Active" : "Deactivated"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEdit(row)}
                                  disabled={!canWrite}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void toggleUserActive(row)}
                                  disabled={!canWrite}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                                    isActive
                                      ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                                      : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                                  }`}
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
                        <td colSpan={6} className="px-4 py-6 text-center text-gray-600">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {editOpen ? (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-900">Edit User</div>
                {editError ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{editError}</div> : null}
                <form onSubmit={saveEdit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="Full name"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  />
                  <input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  />
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  />
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  >
                    <option value="">Select role</option>
                    {churchRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <div className="md:col-span-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditOpen(false)}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!canWrite || editLoading}
                      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {editLoading ? "Saving…" : "Save"}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}

            {rolesLoading ? <div className="mt-4 text-sm text-gray-600">Loading roles…</div> : null}
          </div>
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="mt-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Audit Log</div>
            <div className="mt-1 text-xs text-gray-500">Search and filter user activity within your current church context.</div>

            {auditError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{auditError}</div> : null}

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-500">Search</div>
                <input
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="mt-2 h-9 w-[240px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  placeholder="User name"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Module</div>
                <select
                  value={auditModule}
                  onChange={(e) => setAuditModule(e.target.value)}
                  className="mt-2 h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                >
                  <option value="">All</option>
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
              <div>
                <div className="text-xs font-semibold text-gray-500">Action</div>
                <select
                  value={auditAction}
                  onChange={(e) => setAuditAction(e.target.value)}
                  className="mt-2 h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                >
                  <option value="">All</option>
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
              <div>
                <div className="text-xs font-semibold text-gray-500">From</div>
                <input
                  type="date"
                  value={auditDateFrom}
                  onChange={(e) => setAuditDateFrom(e.target.value)}
                  className="mt-2 h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">To</div>
                <input
                  type="date"
                  value={auditDateTo}
                  onChange={(e) => setAuditDateTo(e.target.value)}
                  className="mt-2 h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                />
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
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {auditLoading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-600">
                          Loading…
                        </td>
                      </tr>
                    ) : auditLogs.length ? (
                      auditLogs.map((row) => {
                        const userName = row?.user?.fullName || row?.userName || "—";
                        const userRole = row?.user?.role || row?.userRole || "";
                        const timestamp = row?.createdAt ? new Date(row.createdAt).toLocaleString() : "—";
                        const ok = String(row?.status || "").toLowerCase() === "success";
                        return (
                          <tr key={row?._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{timestamp}</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900">{userName}</div>
                              {userRole ? <div className="text-xs text-gray-500">{userRole}</div> : null}
                            </td>
                            <td className="px-4 py-3 text-gray-700">{row?.action || "—"}</td>
                            <td className="px-4 py-3 text-gray-700">{row?.module || "—"}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                }`}
                              >
                                {row?.status || "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-600">
                          No audit logs found.
                        </td>
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
                  onClick={() => void fetchAuditLogs({ page: Math.max(1, auditPage - 1) })}
                  disabled={auditLoading || auditPage <= 1}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="text-xs text-gray-600">
                  Page <span className="font-semibold text-gray-900">{auditPage}</span> of {auditPagination?.totalPages || 1}
                </div>
                <button
                  type="button"
                  onClick={() => void fetchAuditLogs({ page: auditPage + 1 })}
                  disabled={auditLoading || (auditPagination?.totalPages ? auditPage >= auditPagination.totalPages : false)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SettingsPage;
