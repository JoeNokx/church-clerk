import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../Auth/useAuth.js";
import { getSystemChurches } from "../../SystemAdmin/Services/systemAdmin.api.js";

function DashboardHome() {
  const { user } = useAuth();

  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    const q = String(search || "").trim();
    if (!q) {
      setRows([]);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await getSystemChurches({ page: 1, limit: 10, search: q });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e) {
      setRows([]);
      setError(e?.response?.data?.message || e?.message || "Failed to search churches");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-600">Welcome {user?.fullName || user?.email || ""}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div>
          <div className="text-lg font-semibold text-gray-900">Quick Church Search</div>
          <div className="mt-1 text-sm text-gray-600">Search by name, email, phone, city, or region.</div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row md:items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search churches..."
            className="w-full md:w-96 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <div className="flex-1" />
          <div className="text-xs text-gray-500">{search.trim() ? `${rows.length} result(s)` : ""}</div>
        </div>

        {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

        {search.trim() ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-gray-400">
                <tr className="border-b">
                  <th className="py-3 text-left font-semibold">Name</th>
                  <th className="py-3 text-left font-semibold">Type</th>
                  <th className="py-3 text-left font-semibold">Email</th>
                  <th className="py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      Searching...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      No matches.
                    </td>
                  </tr>
                ) : (
                  rows.map((c) => (
                    <tr key={c?._id} className="border-b last:border-b-0">
                      <td className="py-3 text-gray-900">{c?.name || "—"}</td>
                      <td className="py-3 text-gray-700">{c?.type || "—"}</td>
                      <td className="py-3 text-gray-700">{c?.email || "—"}</td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (!c?._id) return;
                            navigate(`/admin/churches/${c._id}`);
                          }}
                          className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DashboardHome;
