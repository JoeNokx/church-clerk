import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createCustomRole,
  deleteCustomRole,
  getPermissionCatalog,
  getSystemRoles,
  getSystemUsers,
  listCustomRoles,
  updateCustomRole,
  updateSystemUser
} from "../Services/systemAdmin.api.js";

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

  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <div className="text-2xl font-semibold text-gray-900">Users & Roles</div>
        <div className="mt-1 text-sm text-gray-600">Manage system users and view role definitions.</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("users")}
          className={`h-10 rounded-lg px-4 text-sm font-semibold ${
            tab === "users" ? "bg-blue-700 text-white" : "border border-gray-200 bg-white text-gray-700"
          }`}
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => setTab("roles")}
          className={`h-10 rounded-lg px-4 text-sm font-semibold ${
            tab === "roles" ? "bg-blue-700 text-white" : "border border-gray-200 bg-white text-gray-700"
          }`}
        >
          Roles
        </button>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}

      {tab === "users" ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone..."
              className="w-full md:w-80 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full md:w-56 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All roles</option>
              {allRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <div className="flex-1" />
            <div className="text-xs text-gray-500">
              {pagination?.totalResult !== undefined ? `Total: ${pagination.totalResult}` : ""}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-gray-400">
                <tr className="border-b">
                  <th className="py-3 text-left font-semibold">Name</th>
                  <th className="py-3 text-left font-semibold">Email</th>
                  <th className="py-3 text-left font-semibold">Phone</th>
                  <th className="py-3 text-left font-semibold">Role</th>
                  <th className="py-3 text-left font-semibold">Church</th>
                  <th className="py-3 text-left font-semibold">Status</th>
                  <th className="py-3 text-left font-semibold">Created</th>
                  <th className="py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => (
                    <tr key={u?._id} className="border-b last:border-b-0">
                      <td className="py-3 text-gray-900">{u?.fullName || "—"}</td>
                      <td className="py-3 text-gray-700">{u?.email || "—"}</td>
                      <td className="py-3 text-gray-700">{u?.phoneNumber || "—"}</td>
                      <td className="py-3 text-gray-700">{u?.role || "—"}</td>
                      <td className="py-3 text-gray-700">{u?.church?.name || "—"}</td>
                      <td className="py-3 text-gray-700">{u?.isActive === false ? "inactive" : "active"}</td>
                      <td className="py-3 text-gray-700">{fmtDateTime(u?.createdAt)}</td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
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
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">System roles</div>
            <div className="mt-1 text-xs text-gray-500">Only superadmin and supportadmin can access the system admin portal.</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(roles?.systemRoles || []).map((r) => (
                <span key={r} className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Church roles</div>
            <div className="mt-1 text-xs text-gray-500">Roles used inside a church dashboard.</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(roles?.churchRoles || []).map((r) => (
                <span key={r} className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">Custom roles</div>
                <div className="mt-1 text-xs text-gray-500">Roles stored in the database (dynamic permissions).</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openCreate}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Create role
                </button>
                <button
                  type="button"
                  onClick={loadRolesTab}
                  disabled={loading}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-gray-400">
                  <tr className="border-b">
                    <th className="py-3 text-left font-semibold">Name</th>
                    <th className="py-3 text-left font-semibold">Key</th>
                    <th className="py-3 text-left font-semibold">Scope</th>
                    <th className="py-3 text-left font-semibold">Status</th>
                    <th className="py-3 text-left font-semibold">Created</th>
                    <th className="py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : customRoles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500">
                        No custom roles found.
                      </td>
                    </tr>
                  ) : (
                    customRoles.map((r) => (
                      <tr key={r?._id} className="border-b last:border-b-0">
                        <td className="py-3 text-gray-900">{r?.name || "—"}</td>
                        <td className="py-3 text-gray-700">{r?.key || "—"}</td>
                        <td className="py-3 text-gray-700">{r?.scope || "—"}</td>
                        <td className="py-3 text-gray-700">{r?.isActive === false ? "inactive" : "active"}</td>
                        <td className="py-3 text-gray-700">{fmtDateTime(r?.createdAt)}</td>
                        <td className="py-3 text-right">
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
          </div>
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

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">Delete role</div>
                <div className="mt-1 text-sm text-gray-600">This will deactivate the role.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeletingRole(null);
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
              Are you sure you want to delete <span className="font-semibold">{deletingRole?.name || "this role"}</span>?
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeletingRole(null);
                }}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDeleteRole}
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default UsersRolesPage;
