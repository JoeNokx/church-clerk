import { useCallback, useEffect, useMemo, useState } from "react";

import { getSystemRoles, getSystemUsers, updateSystemUser } from "../Services/systemAdmin.api.js";

const safeString = (v) => (typeof v === "string" ? v : "");

const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
};

function UsersRolesPage() {
  const [tab, setTab] = useState("users");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [roles, setRoles] = useState(null);

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
        setRows([]);
        setPagination(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    [limit, page, roleFilter, search]
  );

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
    </div>
  );
}

export default UsersRolesPage;
