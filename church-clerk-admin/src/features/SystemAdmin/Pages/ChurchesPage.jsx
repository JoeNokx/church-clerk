import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getSystemChurches } from "../Services/systemAdmin.api.js";

function ChurchesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const load = useCallback(
    async ({ nextPage } = {}) => {
      const actualPage = nextPage ?? page;
      setLoading(true);
      setError("");
      try {
        const res = await getSystemChurches({
          page: actualPage,
          limit,
          search: search || undefined,
          type: type || undefined
        });

        const data = Array.isArray(res?.data?.data) ? res.data.data : [];
        setRows(data);
        setPagination(res?.data?.pagination || null);
        setPage(actualPage);
      } catch (e) {
        setRows([]);
        setPagination(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load churches");
      } finally {
        setLoading(false);
      }
    },
    [limit, page, search, type]
  );

  useEffect(() => {
    load({ nextPage: 1 });
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      load({ nextPage: 1 });
    }, 300);
    return () => clearTimeout(t);
  }, [search, type, load]);

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Churches</div>
          <div className="mt-1 text-sm text-gray-600">Manage and monitor all churches in the system.</div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, city..."
            className="w-full md:w-80 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full md:w-56 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All types</option>
            <option value="Independent">Independent</option>
            <option value="Headquarters">Headquarters</option>
            <option value="Branch">Branch</option>
          </select>

          <div className="flex-1" />

          <div className="text-xs text-gray-500">
            {pagination?.totalResult !== undefined ? `Total: ${pagination.totalResult}` : ""}
          </div>
        </div>

        {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-gray-400">
              <tr className="border-b">
                <th className="py-3 text-left font-semibold">Name</th>
                <th className="py-3 text-left font-semibold">Type</th>
                <th className="py-3 text-left font-semibold">Pastor</th>
                <th className="py-3 text-left font-semibold">Email</th>
                <th className="py-3 text-left font-semibold">Phone</th>
                <th className="py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    Loading churches...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    No churches found.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c._id} className="border-b last:border-b-0">
                    <td className="py-3 text-gray-900">{c.name || "—"}</td>
                    <td className="py-3 text-gray-700">{c.type || "—"}</td>
                    <td className="py-3 text-gray-700">{c.pastor || "—"}</td>
                    <td className="py-3 text-gray-700">{c.email || "—"}</td>
                    <td className="py-3 text-gray-700">{c.phoneNumber || "—"}</td>
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
    </div>
  );
}

export default ChurchesPage;
