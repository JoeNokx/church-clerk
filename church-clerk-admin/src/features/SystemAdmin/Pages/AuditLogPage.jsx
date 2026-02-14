import { useCallback, useEffect, useState } from "react";

import { getSystemAuditLogs } from "../Services/systemAdmin.api.js";

const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
};

function AuditLogPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const load = useCallback(
    async ({ nextPage } = {}) => {
      const actualPage = nextPage ?? page;
      setLoading(true);
      setError("");
      try {
        const res = await getSystemAuditLogs({
          page: actualPage,
          limit,
          search: search || undefined,
          module: module || undefined,
          action: action || undefined,
          status: status || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined
        });

        setRows(Array.isArray(res?.data?.logs) ? res.data.logs : []);
        setPagination(res?.data?.pagination || null);
        setPage(actualPage);
      } catch (e) {
        setRows([]);
        setPagination(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    },
    [action, dateFrom, dateTo, limit, module, page, search, status]
  );

  useEffect(() => {
    load({ nextPage: 1 });
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      load({ nextPage: 1 });
    }, 300);
    return () => clearTimeout(t);
  }, [search, module, action, status, dateFrom, dateTo, load]);

  return (
    <div className="max-w-6xl">
      <div>
        <div className="text-2xl font-semibold text-gray-900">Audit Log</div>
        <div className="mt-1 text-sm text-gray-600">Monitor system activity and access history.</div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, module, action, path, IP..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <input
            value={module}
            onChange={(e) => setModule(e.target.value)}
            placeholder="Module (e.g. billing)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Action (e.g. update)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All statuses</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-gray-400">
              <tr className="border-b">
                <th className="py-3 text-left font-semibold">Time</th>
                <th className="py-3 text-left font-semibold">User</th>
                <th className="py-3 text-left font-semibold">Role</th>
                <th className="py-3 text-left font-semibold">Church</th>
                <th className="py-3 text-left font-semibold">Module</th>
                <th className="py-3 text-left font-semibold">Action</th>
                <th className="py-3 text-left font-semibold">Path</th>
                <th className="py-3 text-left font-semibold">Status</th>
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
                    No logs found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r?._id} className="border-b last:border-b-0">
                    <td className="py-3 text-gray-700">{fmtDateTime(r?.createdAt)}</td>
                    <td className="py-3 text-gray-900">{r?.user?.fullName || r?.userName || "—"}</td>
                    <td className="py-3 text-gray-700">{r?.user?.role || r?.userRole || "—"}</td>
                    <td className="py-3 text-gray-700">{r?.church?.name || "—"}</td>
                    <td className="py-3 text-gray-700">{r?.module || "—"}</td>
                    <td className="py-3 text-gray-700">{r?.action || "—"}</td>
                    <td className="py-3 text-gray-700">{r?.path || "—"}</td>
                    <td className="py-3 text-gray-700">{r?.status || "—"}</td>
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
            disabled={loading || !(pagination?.prevPage ?? false)}
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
            disabled={loading || !(pagination?.nextPage ?? false)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuditLogPage;
