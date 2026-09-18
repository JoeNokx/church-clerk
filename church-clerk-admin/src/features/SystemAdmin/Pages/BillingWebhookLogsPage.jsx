import { useCallback, useEffect, useMemo, useState } from "react";

import { adminGetWebhookLogs } from "../Services/adminBilling.api.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";

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
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div>
            <div className="text-lg font-semibold text-gray-900">Webhook Logs</div>
            <div className="mt-0.5 text-sm text-gray-500">Paystack webhook events — click a row to view payload.</div>
          </div>
          <div className="flex-1" />
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search event, reference, error..."
            searchWidth="md:w-72"
            selects={[
              {
                key: "status",
                value: status,
                onChange: setStatus,
                placeholder: "All statuses",
                options: [
                  { label: "Received", value: "received" },
                  { label: "Processed", value: "processed" },
                  { label: "Failed", value: "failed" },
                  { label: "Rejected", value: "rejected" },
                ],
              },
            ]}
          >
            <button type="button" onClick={() => load({ nextPage: 1 })} disabled={loading}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Refresh
            </button>
          </FilterBar>
        </div>

        <div className="mt-3 flex flex-col gap-3 md:hidden">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event, reference, error..."
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-100">
            <option value="">All statuses</option>
            <option value="received">Received</option>
            <option value="processed">Processed</option>
            <option value="failed">Failed</option>
            <option value="rejected">Rejected</option>
          </select>
          <button type="button" onClick={() => load({ nextPage: 1 })} disabled={loading}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
              <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 w-6 whitespace-nowrap px-4 md:px-6"></th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Event Type</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Reference</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Provider</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Error</th>
              <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Received At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-4 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-40 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-5 w-20 rounded-full bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-32 rounded bg-gray-200" /></td>
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
                      className={`group cursor-pointer transition-colors max-md:text-xs text-gray-700 text-sm ${isExpanded ? "bg-blue-50" : "hover:bg-gray-50"}`}
                      onClick={() => setExpandedId(isExpanded ? null : l?._id)}>
                      <td className={`sticky left-0 z-10 max-md:px-4 py-1.5 text-gray-400 text-xs select-none whitespace-nowrap px-4 md:px-6 ${isExpanded ? "bg-blue-50" : "bg-white group-hover:bg-gray-50"}`}>{isExpanded ? "▼" : "▶"}</td>
                      <td className="max-md:px-4 py-1.5 font-mono text-gray-900 whitespace-nowrap px-4 md:px-6">{l?.eventType || "—"}</td>
                      <td className="max-md:px-4 py-1.5 font-mono text-gray-600 whitespace-nowrap px-4 md:px-6">{l?.reference || "—"}</td>
                      <td className="max-md:px-4 py-1.5 text-gray-500 capitalize whitespace-nowrap px-4 md:px-6">{l?.provider || "paystack"}</td>
                      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{statusPill(l?.status)}</td>
                      <td className="max-md:px-4 py-1.5 text-red-600 max-w-[200px] truncate px-4 md:px-6">{l?.errorMessage || "—"}</td>
                      <td className="max-md:px-4 py-1.5 text-gray-500 whitespace-nowrap px-4 md:px-6">{fmtDateTime(l?.createdAt)}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={l?._id + "_expanded"} className="bg-blue-50">
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
