import { useCallback, useEffect, useState } from "react";

import { getSystemAuditLogs } from "../Services/systemAdmin.api.js";

const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
};

const val = (v) => (v === undefined || v === null || v === "") ? "—" : String(v);

function DetailRow({ label, value, mono, wide }) {
  return (
    <div className={`flex gap-3 py-2 border-b border-gray-100 last:border-0 ${wide ? "flex-col" : ""}`}>
      <div className="text-xs font-semibold text-gray-500 w-32 shrink-0">{label}</div>
      <div className={`text-xs text-gray-900 break-all ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function AuditDetailModal({ log, onClose }) {
  if (!log) return null;
  const statusOk = String(log?.status || "").toLowerCase() === "success";
  const role = log?.user?.role || log?.userRole || "—";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="text-base font-bold text-gray-900">Audit Log Details</div>
            <div className="text-xs text-gray-500 mt-0.5">All captured fields for this activity.</div>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Close
          </button>
        </div>
        <div className="px-6 py-4 space-y-0">
          <DetailRow label="Timestamp" value={fmtDateTime(log?.createdAt)} />
          <DetailRow label="Status" value={
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusOk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {log?.status || "—"}
            </span>
          } />
          <DetailRow label="User" value={val(log?.user?.fullName || log?.userName)} />
          <DetailRow label="Role" value={
            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{val(role)}</span>
          } />
          <DetailRow label="Church" value={val(log?.church?.name)} />
          <DetailRow label="Module" value={val(log?.module)} />
          <DetailRow label="Action" value={val(log?.action)} />
          <DetailRow label="Activity" value={val(log?.module && log?.action ? `${log.module} ${log.action}` : log?.activity)} />
          <DetailRow label="Description" value={val(log?.description || log?.message)} wide />
          <DetailRow label="HTTP Method" value={val(log?.httpMethod || log?.method)} mono />
          <DetailRow label="Path" value={val(log?.path)} mono wide />
          <DetailRow label="Resource" value={val(log?.resource)} />
          <DetailRow label="Response Code" value={val(log?.responseCode || log?.statusCode)} mono />
          <DetailRow label="Device Type" value={val(log?.deviceType)} />
          <DetailRow label="Model" value={val(log?.model)} />
          <DetailRow label="Browser" value={val(log?.browser)} />
          <DetailRow label="OS" value={val(log?.os)} />
          <DetailRow label="User Agent" value={val(log?.userAgent)} wide />
          <DetailRow label="IP Address" value={val(log?.ipAddress)} mono />
        </div>
      </div>
    </div>
  );
}

function AuditLogPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

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
          page: actualPage, limit,
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

  useEffect(() => { load({ nextPage: 1 }); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => { load({ nextPage: 1 }); }, 300);
    return () => clearTimeout(t);
  }, [search, module, action, status, dateFrom, dateTo, load]);

  return (
    <>
    <div className="max-w-screen-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-bold text-gray-900">Audit Log</div>
          <div className="mt-1 text-sm text-gray-500">
            Monitor all system activity — who did what, when, from where.
            {pagination?.total ? <span className="ml-2 text-gray-400">{pagination.total.toLocaleString()} total events</span> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, module, action, IP, path..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <input value={module} onChange={(e) => setModule(e.target.value)}
            placeholder="Module (e.g. Billing, Members)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <input value={action} onChange={(e) => setAction(e.target.value)}
            placeholder="Action (e.g. Create, Update)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
            <option value="">All statuses</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-gray-400">
              <tr className="border-b">
                <th className="py-3 pr-4 text-left font-semibold">Time</th>
                <th className="py-3 pr-4 text-left font-semibold">User</th>
                <th className="py-3 pr-4 text-left font-semibold">Role</th>
                <th className="py-3 pr-4 text-left font-semibold">Church</th>
                <th className="py-3 pr-4 text-left font-semibold">Module</th>
                <th className="py-3 pr-4 text-left font-semibold">Action</th>
                <th className="py-3 pr-4 text-left font-semibold">Method</th>
                <th className="py-3 pr-4 text-left font-semibold">IP</th>
                <th className="py-3 pr-4 text-left font-semibold">Status</th>
                <th className="py-3 text-right font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {[0,1,2,3,4].map((i) => (
                    <tr key={i} className="animate-pulse border-b">
                      {[...Array(10)].map((_, j) => (
                        <td key={j} className="py-3 pr-4"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-sm text-gray-400">No activity logs found.</td>
                </tr>
              ) : (
                rows.map((r) => {
                  const statusOk = String(r?.status || "").toLowerCase() === "success";
                  const role = r?.user?.role || r?.userRole || "—";
                  return (
                    <tr key={r?._id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4 text-xs text-gray-600 whitespace-nowrap">{fmtDateTime(r?.createdAt)}</td>
                      <td className="py-3 pr-4 text-xs font-medium text-gray-900">{r?.user?.fullName || r?.userName || "—"}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{role}</span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-600 max-w-[120px] truncate">{r?.church?.name || "—"}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-700">{r?.module || "—"}</span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-700">{r?.action || "—"}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold ${
                          String(r?.httpMethod || r?.method || "").toUpperCase() === "GET" ? "bg-green-50 text-green-700" :
                          String(r?.httpMethod || r?.method || "").toUpperCase() === "DELETE" ? "bg-red-50 text-red-700" :
                          "bg-orange-50 text-orange-700"
                        }`}>{r?.httpMethod || r?.method || "—"}</span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-gray-500">{r?.ipAddress || "—"}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusOk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {r?.status || "—"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button type="button" onClick={() => setSelectedLog(r)}
                          className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700">
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-gray-400">
            {pagination?.total ? `${pagination.total.toLocaleString()} total` : ""}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => load({ nextPage: Math.max(1, page - 1) })}
              disabled={loading || !pagination?.prevPage}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50">
              Prev
            </button>
            <div className="text-xs text-gray-600">Page {page}{pagination?.totalPages ? ` / ${pagination.totalPages}` : ""}</div>
            <button type="button" onClick={() => load({ nextPage: page + 1 })}
              disabled={loading || !pagination?.nextPage}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  );
}

export default AuditLogPage;
