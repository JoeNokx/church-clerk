import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/useAuth.js";
import PermissionContext from "../../permissions/permission.store.js";
import ChurchContext from "../../church/church.store.js";
import { getChurchProfile, searchHeadquartersChurches, updateChurchProfile } from "../../church/services/church.api.js";
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

function SettingsPage() {
  const { user } = useAuth();
  const churchCtx = useContext(ChurchContext);
  const activeChurch = churchCtx?.activeChurch;
  const switchChurch = churchCtx?.switchChurch;

  const { can } = useContext(PermissionContext) || {};
  const canRead = useMemo(() => (typeof can === "function" ? can("settings", "read") : true), [can]);
  const canWrite = useMemo(() => (typeof can === "function" ? can("settings", "update") : true), [can]);

  const [tab, setTab] = useState("profile");

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
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [foundedDate, setFoundedDate] = useState("");
  const [referralCodeInput, setReferralCodeInput] = useState("");

  const isBranch = type === "Branch";

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
        setStreetAddress(church?.streetAddress || "");
        setCity(church?.city || "");
        setRegion(church?.region || "");
        setCountry(church?.country || "");
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
  }, [activeChurch?._id, canRead, user?.email]);

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
        streetAddress,
        city,
        region,
        country,
        foundedDate: foundedDate || null,
        referralCodeInput: referralCodeInput || undefined
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

  const openDeactivateConfirm = (row) => {
    setConfirmUser(row);
    setConfirmOpen(true);
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address (optional)</label>
                <input
                  type="text"
                  placeholder="Street address"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  disabled={!canWrite}
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
                  disabled={!canWrite}
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
                  disabled={!canWrite}
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
                  disabled={!canWrite}
                />
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
                  disabled={!canWrite}
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

          <div className="rounded-xl border border-gray-200 bg-white p-5">
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
                  const cfg = rolePermissions?.[r] || {};
                  const modules = Object.keys(cfg).filter((k) => k !== "__all__" && Array.isArray(cfg[k]) && cfg[k].length);
                  return (
                    <div key={r} className="rounded-lg border border-gray-200 p-3">
                      <div className="text-sm font-semibold text-gray-900">{r}</div>
                      <div className="mt-2 space-y-1">
                        {modules.length ? (
                          modules.map((m) => (
                            <div key={`${r}-${m}`} className="text-xs text-gray-600">
                              <span className="font-semibold text-gray-800">{m}:</span> {cfg[m].join(", ")}
                            </div>
                          ))
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
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-sm font-semibold text-gray-900">Audit Log</div>
          <div className="mt-2 text-sm text-gray-600">This section will be added later.</div>
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
