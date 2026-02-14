import { useCallback, useEffect, useMemo, useState } from "react";

import { adminGetWebhookLogs } from "../Services/adminBilling.api.js";

const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
};

function BillingWebhookLogsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    const ev = String(eventType || "").trim().toLowerCase();
    return (Array.isArray(rows) ? rows : []).filter((l) => {
      if (ev && String(l?.eventType || "").toLowerCase() !== ev) return false;
      if (!q) return true;
      const e = String(l?.eventType || "").toLowerCase();
      const ref = String(l?.reference || "").toLowerCase();
      const st = String(l?.status || "").toLowerCase();
      const err = String(l?.errorMessage || "").toLowerCase();
      return e.includes(q) || ref.includes(q) || st.includes(q) || err.includes(q);
    });
  }, [eventType, rows, search]);

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

  useEffect(() => {
    load({ nextPage: 1 });
  }, [status, load]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div>
          <div className="text-lg font-semibold text-gray-900">Webhook Logs</div>
          <div className="mt-1 text-sm text-gray-600">Paystack webhook events for debugging.</div>
        </div>
        <div className="flex-1" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search event, reference, error..."
          className="w-full md:w-72 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
        <input
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          placeholder="Event type (optional)"
          className="w-full md:w-56 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full md:w-56 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All statuses</option>
          <option value="received">received</option>
          <option value="processed">processed</option>
          <option value="failed">failed</option>
          <option value="rejected">rejected</option>
        </select>
      </div>

      {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-gray-400">
            <tr className="border-b">
              <th className="py-3 text-left font-semibold">Event</th>
              <th className="py-3 text-left font-semibold">Reference</th>
              <th className="py-3 text-left font-semibold">Status</th>
              <th className="py-3 text-left font-semibold">Error</th>
              <th className="py-3 text-left font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  No logs found.
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l?._id} className="border-b last:border-b-0">
                  <td className="py-3 text-gray-900">{l?.eventType || "—"}</td>
                  <td className="py-3 text-gray-700">{l?.reference || "—"}</td>
                  <td className="py-3 text-gray-700">{l?.status || "—"}</td>
                  <td className="py-3 text-gray-700">{l?.errorMessage || "—"}</td>
                  <td className="py-3 text-gray-700">{fmtDateTime(l?.createdAt)}</td>
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
  );
}

export default BillingWebhookLogsPage;
