import { useCallback, useEffect, useMemo, useState } from "react";

import { adminGetWebhookLogs } from "../Services/adminBilling.api.js";

const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
};

const statusPill = (status) => {
  const s = String(status || "").toLowerCase();
  const cls =
    s === "processed" ? "bg-green-100 text-green-700" :
    s === "failed" ? "bg-red-100 text-red-700" :
    s === "rejected" ? "bg-orange-100 text-orange-700" :
    s === "received" ? "bg-blue-100 text-blue-700" :
    "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {status || "—"}
    </span>
  );
};

function BillingWebhookLogsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    return (Array.isArray(rows) ? rows : []).filter((l) => {
      if (!q) return true;
      const e = String(l?.eventType || "").toLowerCase();
      const ref = String(l?.reference || "").toLowerCase();
      const st = String(l?.status || "").toLowerCase();
      const err = String(l?.errorMessage || "").toLowerCase();
      return e.includes(q) || ref.includes(q) || st.includes(q) || err.includes(q);
    });
  }, [rows, search]);

  const load = useCallback(
    async ({ nextPage } = {}) => {
      const actualPage = nextPage ?? page;
      setLoading(true);
      setError("");
      try {
        const res = await adminGetWebhookLogs({ page: actualPage, limit, status: status || undefined });
        setRows(Array.isArray(res?.data?.logs) ? res.data.logs : []);
        setPagination(res?.data?.pagination || null);
        setPage(actualPage);
      } catch (e) {
        setRows([]);
        setPagination(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load webhook logs");
      } finally {
        setLoading(false);
      }
    },
    [limit, page, status]
  );

  useEffect(() => { load({ nextPage: 1 }); }, [status, load]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div>
          <div className="text-lg font-semibold text-gray-900">Webhook Logs</div>
          <div className="mt-0.5 text-sm text-gray-500">Paystack webhook events — click a row to view payload.</div>
        </div>
        <div className="flex-1" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search event, reference, error..."
          className="w-full md:w-72 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="w-full md:w-44 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
          <option value="">All statuses</option>
          <option value="received">Received</option>
          <option value="processed">Processed</option>
          <option value="failed">Failed</option>
          <option value="rejected">Rejected</option>
        </select>
        <button type="button" onClick={() => load({ nextPage: 1 })} disabled={loading}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          Refresh
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-gray-400">
            <tr className="border-b">
              <th className="py-3 text-left font-semibold w-6"></th>
              <th className="py-3 text-left font-semibold">Event Type</th>
              <th className="py-3 text-left font-semibold">Reference</th>
              <th className="py-3 text-left font-semibold">Provider</th>
              <th className="py-3 text-left font-semibold">Status</th>
              <th className="py-3 text-left font-semibold">Error</th>
              <th className="py-3 text-left font-semibold">Received At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse border-b">
                    <td className="py-3 pr-2"><div className="h-4 w-4 rounded bg-gray-200" /></td>
                    <td className="py-3 pr-4"><div className="h-4 w-40 rounded bg-gray-200" /></td>
                    <td className="py-3 pr-4"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                    <td className="py-3 pr-4"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                    <td className="py-3 pr-4"><div className="h-5 w-20 rounded-full bg-gray-200" /></td>
                    <td className="py-3 pr-4"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="py-3"><div className="h-4 w-32 rounded bg-gray-200" /></td>
                  </tr>
                ))}
              </>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-gray-400">No logs found.</td>
              </tr>
            ) : (
              filtered.map((l) => {
                const isExpanded = expandedId === l?._id;
                let payloadStr = "";
                try {
                  payloadStr = l?.payload ? JSON.stringify(l.payload, null, 2) : "";
                } catch (_) { payloadStr = ""; }
                return (
                  <>
                    <tr key={l?._id}
                      className={`border-b cursor-pointer transition-colors ${isExpanded ? "bg-blue-50" : "hover:bg-gray-50"}`}
                      onClick={() => setExpandedId(isExpanded ? null : l?._id)}>
                      <td className="py-3 pr-2 text-gray-400 text-xs select-none">{isExpanded ? "▼" : "▶"}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-gray-900">{l?.eventType || "—"}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-gray-600">{l?.reference || "—"}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500 capitalize">{l?.provider || "paystack"}</td>
                      <td className="py-3 pr-4">{statusPill(l?.status)}</td>
                      <td className="py-3 pr-4 text-xs text-red-600 max-w-[200px] truncate">{l?.errorMessage || "—"}</td>
                      <td className="py-3 text-xs text-gray-500">{fmtDateTime(l?.createdAt)}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={l?._id + "_expanded"} className="bg-blue-50 border-b">
                        <td colSpan={7} className="px-4 pb-4 pt-1">
                          <div className="text-xs font-semibold text-gray-600 mb-1">Payload</div>
                          {payloadStr ? (
                            <pre className="max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 leading-relaxed">
                              {payloadStr}
                            </pre>
                          ) : (
                            <div className="text-xs text-gray-400">No payload data</div>
                          )}
                          {l?.errorMessage && (
                            <div className="mt-2">
                              <div className="text-xs font-semibold text-red-600 mb-1">Error</div>
                              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{l.errorMessage}</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="text-xs text-gray-400">
          {pagination?.totalItems ? `${pagination.totalItems} total` : ""}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => load({ nextPage: Math.max(1, page - 1) })}
            disabled={loading || !pagination?.prevPage}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50">
            Prev
          </button>
          <div className="text-xs text-gray-600">
            Page {page}{pagination?.totalPages ? ` / ${pagination.totalPages}` : ""}
          </div>
          <button type="button" onClick={() => load({ nextPage: page + 1 })}
            disabled={loading || !pagination?.nextPage}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default BillingWebhookLogsPage;
