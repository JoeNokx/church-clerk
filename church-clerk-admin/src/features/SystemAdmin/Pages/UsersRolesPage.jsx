import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createCustomRole,
  deleteCustomRole,
  getPermissionCatalog,
  getSystemRoles,
  getSystemUsers,
  listCustomRoles,
  updateCustomRole,
  updateSystemUser,
  deleteSystemUserApi,
  verifyUserEmailByAdminApi
} from "../Services/systemAdmin.api.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import ConfirmDeleteModal from "../../../shared/components/ConfirmDeleteModal/index.jsx";
import PageTabs from "../../../shared/components/PageTabs/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import Card from "../../../shared/components/Card/index.jsx";
import Button from "../../../shared/components/Button/index.jsx";
import StatusChip from "../../../shared/components/StatusChip/index.jsx";

const safeString = (v) => (typeof v === "string" ? v : "");

const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
};

const normalizeRoleKeyInput = (v) => String(v || "")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "_")
  .replace(/[^a-z0-9_\-]/g, "");

function UsersRolesPage() {
  const [tab, setTab] = useState("users");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [roles, setRoles] = useState(null);
  const [customRoles, setCustomRoles] = useState([]);
  const [permissionModules, setPermissionModules] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createKey, setCreateKey] = useState("");
  const [createScope, setCreateScope] = useState("church");
  const [createAllAccess, setCreateAllAccess] = useState(false);
  const [createPermissions, setCreatePermissions] = useState({});

  const [viewOpen, setViewOpen] = useState(false);
  const [viewRole, setViewRole] = useState(null);

  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleIsActive, setEditRoleIsActive] = useState(true);
  const [editRoleAllAccess, setEditRoleAllAccess] = useState(false);
  const [editRolePermissions, setEditRolePermissions] = useState({});

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState(null);

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const [deleteUserModal, setDeleteUserModal] = useState(null);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);
  const [suspendUserLoading, setSuspendUserLoading] = useState(null);
  const [verifyEmailModal, setVerifyEmailModal] = useState(null);
  const [verifyEmailLoading, setVerifyEmailLoading] = useState(false);

  const allRoles = useMemo(() => {
    const list = roles?.allRoles;
    return Array.isArray(list) ? list : [];
  }, [roles?.allRoles]);

  const load = useCallback(
    async ({ nextPage } = {}) => {
      const actualPage = nextPage ?? page;
      setLoading(true);
      setError("");
      try {
        const [rolesRes, usersRes] = await Promise.all([
          getSystemRoles(),
          getSystemUsers({
            page: actualPage,
            limit,
            search: search || undefined,
            role: roleFilter || undefined
          })
        ]);

        setRoles(rolesRes?.data?.data || null);
        setRows(Array.isArray(usersRes?.data?.data) ? usersRes.data.data : []);
        setPagination(usersRes?.data?.pagination || null);
        setPage(actualPage);
      } catch (e) {
        setRoles(null);
        setCustomRoles([]);
        setRows([]);
        setPagination(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    [limit, page, roleFilter, search]
  );

  const loadRolesTab = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rolesRes, customRolesRes, catalogRes] = await Promise.all([
        getSystemRoles(),
        listCustomRoles({ includeInactive: true }),
        getPermissionCatalog()
      ]);

      setRoles(rolesRes?.data?.data || null);

      const list = customRolesRes?.data?.roles;
      setCustomRoles(Array.isArray(list) ? list : []);

      const modules = catalogRes?.data?.modules;
      setPermissionModules(modules && typeof modules === "object" ? modules : null);
    } catch (e) {
      setCustomRoles([]);
      setPermissionModules(null);
      setError(e?.response?.data?.message || e?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  const buildEmptyPermissionMatrix = useCallback(() => {
    const modules = permissionModules && typeof permissionModules === "object" ? permissionModules : {};
    const out = {};
    for (const moduleKey of Object.keys(modules)) {
      const actions = Array.isArray(modules[moduleKey]) ? modules[moduleKey] : [];
      out[moduleKey] = {};
      for (const action of actions) {
        out[moduleKey][action] = false;
      }
    }
    return out;
  }, [permissionModules]);

  const buildMatrixFromRole = useCallback((rolePermissions) => {
    const base = buildEmptyPermissionMatrix();
    const src = rolePermissions && typeof rolePermissions === "object" ? rolePermissions : {};

    if (src.__all__ === true) {
      for (const moduleKey of Object.keys(base)) {
        for (const action of Object.keys(base[moduleKey] || {})) {
          base[moduleKey][action] = true;
        }
      }
      return base;
    }

    for (const moduleKey of Object.keys(base)) {
      const allowed = src[moduleKey];
      if (Array.isArray(allowed)) {
        for (const action of Object.keys(base[moduleKey] || {})) {
          base[moduleKey][action] = allowed.includes(action);
        }
        continue;
      }

      if (allowed && typeof allowed === "object") {
        for (const action of Object.keys(base[moduleKey] || {})) {
          base[moduleKey][action] = Boolean(allowed[action]);
        }
      }
    }

    return base;
  }, [buildEmptyPermissionMatrix]);

  const setAllMatrixValues = useCallback((matrix, value) => {
    const out = matrix && typeof matrix === "object" ? { ...matrix } : {};
    for (const moduleKey of Object.keys(out)) {
      out[moduleKey] = { ...(out[moduleKey] || {}) };
      for (const action of Object.keys(out[moduleKey] || {})) {
        out[moduleKey][action] = Boolean(value);
      }
    }
    return out;
  }, []);

  const isAllMatrixSelected = useCallback((matrix) => {
    const m = matrix && typeof matrix === "object" ? matrix : {};
    let hasAny = false;
    for (const moduleKey of Object.keys(m)) {
      for (const action of Object.keys(m[moduleKey] || {})) {
        hasAny = true;
        if (!m?.[moduleKey]?.[action]) return false;
      }
    }
    return hasAny;
  }, []);

  const openCreate = () => {
    setCreateName("");
    setCreateKey("");
    setCreateScope("church");
    setCreatePermissions(buildEmptyPermissionMatrix());
    setCreateAllAccess(false);
    setCreateOpen(true);
  };

  const openViewRole = (r) => {
    setViewRole(r || null);
    setViewOpen(true);
  };

  const openEditRole = (r) => {
    setEditingRole(r || null);
    setEditRoleName(safeString(r?.name));
    setEditRoleIsActive(r?.isActive !== false);
    const matrix = buildMatrixFromRole(r?.permissions);
    setEditRolePermissions(matrix);
    setEditRoleAllAccess(isAllMatrixSelected(matrix));
    setEditRoleOpen(true);
  };

  const onSaveRoleEdit = async () => {
    if (!editingRole?._id) return;
    setLoading(true);
    setError("");
    try {
      const isAll = isAllMatrixSelected(editRolePermissions);
      const payload = {
        name: editRoleName,
        isActive: editRoleIsActive,
        permissions: isAll ? { __all__: true } : editRolePermissions
      };
      await updateCustomRole(editingRole._id, payload);
      setEditRoleOpen(false);
      setEditingRole(null);
      await loadRolesTab();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteRole = (r) => {
    setDeletingRole(r || null);
    setDeleteOpen(true);
  };

  const onConfirmDeleteRole = async () => {
    if (!deletingRole?._id) return;
    setLoading(true);
    setError("");
    try {
      await deleteCustomRole(deletingRole._id);
      setDeleteOpen(false);
      setDeletingRole(null);
      await loadRolesTab();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete role");
    } finally {
      setLoading(false);
    }
  };

  const onCreateRole = async () => {
    setLoading(true);
    setError("");
    try {
      const isAll = isAllMatrixSelected(createPermissions);
      const payload = {
        name: createName,
        key: createKey,
        scope: createScope,
        permissions: isAll ? { __all__: true } : createPermissions
      };
      await createCustomRole(payload);
      setCreateOpen(false);
      await loadRolesTab();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to create role");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ nextPage: 1 });
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== "users") return;
      load({ nextPage: 1 });
    }, 300);
    return () => clearTimeout(t);
  }, [search, roleFilter, tab, load]);

  useEffect(() => {
    if (tab !== "roles") return;
    loadRolesTab();
  }, [tab, loadRolesTab]);

  const openEdit = (u) => {
    setEditingUser(u || null);
    setEditRole(safeString(u?.role));
    setEditIsActive(u?.isActive !== false);
    setEditOpen(true);
  };

  const onSaveUser = async () => {
    if (!editingUser?._id) return;
    setLoading(true);
    setError("");
    try {
      await updateSystemUser(editingUser._id, {
        role: editRole,
        isActive: editIsActive
      });
      setEditOpen(false);
      setEditingUser(null);
      await load({ nextPage: page });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const onToggleSuspendUser = async (u) => {
    if (!u?._id) return;
    setSuspendUserLoading(u._id);
    setError("");
    try {
      await updateSystemUser(u._id, { isActive: !u.isActive });
      await load({ nextPage: page });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to update user");
    } finally {
      setSuspendUserLoading(null);
    }
  };

  const onVerifyUserEmail = async () => {
    if (!verifyEmailModal?._id) return;
    setVerifyEmailLoading(true);
    setError("");
    try {
      await verifyUserEmailByAdminApi(verifyEmailModal._id);
      setVerifyEmailModal(null);
      await load({ nextPage: page });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to verify email");
    } finally {
      setVerifyEmailLoading(false);
    }
  };

  const onDeleteUser = async () => {
    if (!deleteUserModal?._id) return;
    setDeleteUserLoading(true);
    setError("");
    try {
      await deleteSystemUserApi(deleteUserModal._id);
      setDeleteUserModal(null);
      await load({ nextPage: page });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete user");
    } finally {
      setDeleteUserLoading(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <div className="text-2xl font-semibold text-gray-900">Users & Roles</div>
        <div className="mt-1 text-sm text-gray-600">Manage system users and view role definitions.</div>
      </div>

      <PageTabs
        tabs={[
          { key: "users", label: "Users" },
          { key: "roles", label: "Roles" }
        ]}
        activeTab={tab}
        onChange={setTab}
        sticky={false}
      />

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}

      {tab === "users" ? (
        <Card>
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, email, phone..."
            selects={[{
              key: "role",
              value: roleFilter,
              onChange: setRoleFilter,
              placeholder: "All roles",
              options: allRoles.map((r) => ({ label: r, value: r }))
            }]}
          >
            <div className="text-xs text-gray-500">
              {pagination?.totalResult !== undefined ? `Total: ${pagination.totalResult}` : ""}
            </div>
          </FilterBar>

          <div className="flex flex-col gap-3 md:hidden">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All roles</option>
              {allRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500">
              {pagination?.totalResult !== undefined ? `Total: ${pagination.totalResult}` : ""}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                  <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Name</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Email</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Phone</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Role</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Church</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Email Status</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Created</th>
                  <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <>
                    {[0, 1, 2, 3].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                        <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                        <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                        <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                        <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
                        <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                        <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                        <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                        <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-12 rounded bg-gray-200" /></td>
                      </tr>
                    ))}
                  </>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState compact illustration="users" title="No users found." />
                    </td>
                  </tr>
                  ) : (
                  rows.map((u) => (
                    <tr key={u?._id} className="max-md:text-xs text-gray-700 text-sm">
                      <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={u?.fullName || ""}>
                        <span className="sm:hidden">{truncateMobileName(u?.fullName)}</span>
                        <span className="hidden sm:inline">{truncateDesktopName(u?.fullName)}</span>
                      </td>
                      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6" title={u?.email || ""}>
                        <span className="sm:hidden">{truncateMobileName(u?.email)}</span>
                        <span className="hidden sm:inline">{truncateDesktopName(u?.email)}</span>
                      </td>
                      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{u?.phoneNumber || "—"}</td>
                      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{u?.role || "—"}</td>
                      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6" title={u?.church?.name || ""}>
                        <span className="sm:hidden">{truncateMobileName(u?.church?.name)}</span>
                        <span className="hidden sm:inline">{truncateDesktopName(u?.church?.name)}</span>
                      </td>
                      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                        <StatusChip value={u?.isActive === false ? "Inactive" : "Active"} />
                      </td>
                      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          u?.isEmailVerified === false ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                        }`}>{u?.isEmailVerified === false ? "Unverified" : "Verified"}</span>
                      </td>
                      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtDateTime(u?.createdAt)}</td>
                      <td className="max-md:px-4 py-1.5 text-right whitespace-nowrap px-4 md:px-6">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button type="button" onClick={() => openEdit(u)}
                            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                            Edit
                          </button>
                          {u?.isEmailVerified === false ? (
                            <button type="button" onClick={() => setVerifyEmailModal(u)}
                              className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                              Verify Email
                            </button>
                          ) : null}
                          <button type="button"
                            onClick={() => onToggleSuspendUser(u)}
                            disabled={suspendUserLoading === u._id}
                            className={`rounded-md border px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${
                              u?.isActive === false
                                ? "border-green-200 bg-white text-green-700 hover:bg-green-50"
                                : "border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                            }`}>
                            {suspendUserLoading === u._id ? "…" : u?.isActive === false ? "Unsuspend" : "Suspend"}
                          </button>
                          <button type="button" onClick={() => setDeleteUserModal(u)}
                            className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => load({ nextPage: Math.max(1, page - 1) })}
              disabled={loading || !(pagination?.hasPrev ?? page > 1)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
            >
              Prev
            </button>
            <div className="text-xs text-gray-600">
              Page {page}
              {pagination?.totalPages ? ` / ${pagination.totalPages}` : ""}
            </div>
            <button
              type="button"
              onClick={() => load({ nextPage: page + 1 })}
              disabled={loading || !(pagination?.hasNext ?? false)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <Card.Header title="System roles" />
            <Card.Body>
              <div className="text-xs text-gray-500">Only superadmin and supportadmin can access the system admin portal.</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(roles?.systemRoles || []).map((r) => (
                  <span key={r} className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">
                    {r}
                  </span>
                ))}
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header title="Church roles" />
            <Card.Body>
              <div className="text-xs text-gray-500">Roles used inside a church dashboard.</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(roles?.churchRoles || []).map((r) => (
                  <span key={r} className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                    {r}
                  </span>
                ))}
              </div>
            </Card.Body>
          </Card>

          <Card className="lg:col-span-2">
            <Card.Header
              title="Custom roles"
              actions={
                <>
                  <Button variant="primary" size="sm" onClick={openCreate} disabled={loading}>
                    Create role
                  </Button>
                  <Button variant="secondary" size="sm" onClick={loadRolesTab} disabled={loading}>
                    Refresh
                  </Button>
                </>
              }
            />
            <Card.Body>
              <div className="text-xs text-gray-500">Roles stored in the database (dynamic permissions).</div>
              <div className="mt-4 overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                    <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Name</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Key</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Scope</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Created</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <>
                      {[0, 1, 2, 3].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="max-md:px-4 py-2 px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                          <td className="max-md:px-4 py-2 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                          <td className="max-md:px-4 py-2 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                          <td className="max-md:px-4 py-2 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                          <td className="max-md:px-4 py-2 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                          <td className="max-md:px-4 py-2 px-4 md:px-6"><div className="h-4 w-12 rounded bg-gray-200" /></td>
                        </tr>
                      ))}
                    </>
                  ) : customRoles.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState compact illustration="users" title="No custom roles found." />
                      </td>
                    </tr>
                  ) : (
                    customRoles.map((r) => (
                      <tr key={r?._id} className="max-md:text-xs text-gray-700 text-sm">
                        <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={r?.name || ""}>
                          <span className="sm:hidden">{truncateMobileName(r?.name)}</span>
                          <span className="hidden sm:inline">{truncateDesktopName(r?.name)}</span>
                        </td>
                        <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{r?.key || "—"}</td>
                        <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{r?.scope || "—"}</td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6"><StatusChip value={r?.isActive === false ? "inactive" : "active"} /></td>
                        <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtDateTime(r?.createdAt)}</td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openViewRole(r)}
                              className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditRole(r)}
                              disabled={loading}
                              className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteRole(r)}
                              disabled={loading}
                              className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
        </div>
      )}

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">Edit user</div>
                <div className="mt-1 text-sm text-gray-600">Update role and account status.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditOpen(false);
                  setEditingUser(null);
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="text-sm text-gray-700">
                <div className="font-semibold text-gray-900">{editingUser?.fullName || "—"}</div>
                <div className="text-xs text-gray-500">{editingUser?.email || "—"}</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600">Role</div>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {allRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />
                Active
              </label>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditOpen(false);
                    setEditingUser(null);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveUser}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">Create role</div>
                <div className="mt-1 text-sm text-gray-600">Create a DB-backed role with module-action permissions.</div>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-gray-600">Name</div>
                <input
                  value={createName}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCreateName(next);
                    if (!createKey) setCreateKey(normalizeRoleKeyInput(next));
                  }}
                  placeholder="e.g. Branch Manager"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600">Key</div>
                <input
                  value={createKey}
                  onChange={(e) => setCreateKey(normalizeRoleKeyInput(e.target.value))}
                  placeholder="e.g. branch_manager"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
                <div className="mt-1 text-xs text-gray-500">Used when assigning roles to users.</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600">Scope</div>
                <select
                  value={createScope}
                  onChange={(e) => setCreateScope(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="church">church</option>
                  <option value="system">system</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={createAllAccess}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCreateAllAccess(checked);
                      setCreatePermissions((prev) => setAllMatrixValues(prev, checked));
                    }}
                  />
                  Grant all permissions
                </label>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">Permissions</div>
              <div className="max-h-[50vh] overflow-y-auto p-4">
                {!permissionModules ? (
                  <div className="text-sm text-gray-600">Permission catalog not loaded.</div>
                ) : (
                  <div className="space-y-4">
                    {Object.keys(permissionModules).map((moduleKey) => {
                      const actions = Array.isArray(permissionModules[moduleKey]) ? permissionModules[moduleKey] : [];
                      return (
                        <div key={moduleKey} className="rounded-lg border border-gray-200 p-3">
                          <div className="text-sm font-semibold text-gray-900">{moduleKey}</div>
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {actions.map((action) => (
                              <label key={action} className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={Boolean(createPermissions?.[moduleKey]?.[action])}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setCreatePermissions((prev) => {
                                      const next = {
                                        ...(prev || {}),
                                        [moduleKey]: {
                                          ...((prev || {})[moduleKey] || {}),
                                          [action]: checked
                                        }
                                      };
                                      setCreateAllAccess(isAllMatrixSelected(next));
                                      return next;
                                    });
                                  }}
                                />
                                {action}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreateRole}
                disabled={loading || !createName.trim() || !createKey.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">Role details</div>
                <div className="mt-1 text-sm text-gray-600">View role definition and permissions.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewOpen(false);
                  setViewRole(null);
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-semibold text-gray-500">Name</div>
                <div className="text-sm font-semibold text-gray-900">{viewRole?.name || "—"}</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-semibold text-gray-500">Key</div>
                <div className="text-sm font-semibold text-gray-900">{viewRole?.key || "—"}</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-semibold text-gray-500">Scope</div>
                <div className="text-sm font-semibold text-gray-900">{viewRole?.scope || "—"}</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-semibold text-gray-500">Status</div>
                <div className="text-sm font-semibold text-gray-900">{viewRole?.isActive === false ? "inactive" : "active"}</div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">Permissions</div>
              <div className="max-h-[50vh] overflow-y-auto p-4">
                {viewRole?.permissions?.__all__ ? (
                  <div className="text-sm text-gray-700">All permissions granted.</div>
                ) : !permissionModules ? (
                  <div className="text-sm text-gray-600">Permission catalog not loaded.</div>
                ) : (
                  <div className="space-y-4">
                    {Object.keys(permissionModules).map((moduleKey) => {
                      const actions = Array.isArray(permissionModules[moduleKey]) ? permissionModules[moduleKey] : [];
                      const resolved = buildMatrixFromRole(viewRole?.permissions);
                      return (
                        <div key={moduleKey} className="rounded-lg border border-gray-200 p-3">
                          <div className="text-sm font-semibold text-gray-900">{moduleKey}</div>
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {actions.map((action) => (
                              <div key={action} className="text-sm text-gray-700">
                                <span className={resolved?.[moduleKey]?.[action] ? "font-semibold text-green-700" : "text-gray-500"}>
                                  {action}: {resolved?.[moduleKey]?.[action] ? "yes" : "no"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editRoleOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">Edit role</div>
                <div className="mt-1 text-sm text-gray-600">Update name, status and permissions.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditRoleOpen(false);
                  setEditingRole(null);
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-gray-600">Name</div>
                <input
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600">Key</div>
                <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                  {editingRole?.key || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600">Scope</div>
                <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                  {editingRole?.scope || "—"}
                </div>
              </div>
              <div className="flex items-end gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={editRoleIsActive} onChange={(e) => setEditRoleIsActive(e.target.checked)} />
                  Active
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={editRoleAllAccess}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEditRoleAllAccess(checked);
                      setEditRolePermissions((prev) => setAllMatrixValues(prev, checked));
                    }}
                  />
                  Grant all permissions
                </label>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">Permissions</div>
              <div className="max-h-[50vh] overflow-y-auto p-4">
                {!permissionModules ? (
                  <div className="text-sm text-gray-600">Permission catalog not loaded.</div>
                ) : (
                  <div className="space-y-4">
                    {Object.keys(permissionModules).map((moduleKey) => {
                      const actions = Array.isArray(permissionModules[moduleKey]) ? permissionModules[moduleKey] : [];
                      return (
                        <div key={moduleKey} className="rounded-lg border border-gray-200 p-3">
                          <div className="text-sm font-semibold text-gray-900">{moduleKey}</div>
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {actions.map((action) => (
                              <label key={action} className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={Boolean(editRolePermissions?.[moduleKey]?.[action])}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setEditRolePermissions((prev) => {
                                      const next = {
                                        ...(prev || {}),
                                        [moduleKey]: {
                                          ...((prev || {})[moduleKey] || {}),
                                          [action]: checked
                                        }
                                      };
                                      setEditRoleAllAccess(isAllMatrixSelected(next));
                                      return next;
                                    });
                                  }}
                                />
                                {action}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditRoleOpen(false);
                  setEditingRole(null);
                }}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveRoleEdit}
                disabled={loading || !editRoleName.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDeleteModal
        open={!!deleteOpen}
        title="Delete Role"
        message={`Are you sure you want to delete ${deletingRole?.name || "this role"}? This will deactivate the role.`}
        onCancel={() => {
          setDeleteOpen(false);
          setDeletingRole(null);
        }}
        onConfirm={onConfirmDeleteRole}
        loading={loading}
      />

      {verifyEmailModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900 text-base">Verify Email Address</div>
              <div className="mt-2 text-sm text-gray-600">
                This will immediately mark <span className="font-semibold text-gray-900">{verifyEmailModal.fullName || verifyEmailModal.email}</span>&apos;s email as verified, bypassing the email link. Only do this if the user cannot receive the verification email.
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setVerifyEmailModal(null)}
                disabled={verifyEmailLoading}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onVerifyUserEmail}
                disabled={verifyEmailLoading}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {verifyEmailLoading ? "Verifying…" : "Yes, Verify"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete User Modal */}
      <ConfirmDeleteModal
        open={!!deleteUserModal}
        title="Delete User"
        message={`Are you sure you want to permanently delete ${deleteUserModal?.fullName || deleteUserModal?.email || "this user"}? All associated data for this user will be removed.`}
        onCancel={() => setDeleteUserModal(null)}
        onConfirm={onDeleteUser}
        loading={deleteUserLoading}
      />
    </div>
  );
}

export default UsersRolesPage;
