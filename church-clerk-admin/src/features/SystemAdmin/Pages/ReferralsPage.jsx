import { useCallback, useEffect, useMemo, useState } from "react";

import { getSystemReferralHistory, getSystemReferralSummary } from "../Services/systemAdmin.api.js";

const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
};

function ReferralsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const load = useCallback(
    async ({ nextPage } = {}) => {
      const actualPage = nextPage ?? page;
      setLoading(true);
      setError("");
      try {
        const [sumRes, histRes] = await Promise.all([
          getSystemReferralSummary(),
          getSystemReferralHistory({
            page: actualPage,
            limit,
            status: status || undefined,
            search: search || undefined
          })
        ]);

        setSummary(sumRes?.data?.data || null);
        setRows(Array.isArray(histRes?.data?.data) ? histRes.data.data : []);
        setPagination(histRes?.data?.pagination || null);
        setPage(actualPage);
      } catch (e) {
        setSummary(null);
        setRows([]);
        setPagination(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load referrals");
      } finally {
        setLoading(false);
      }
    },
    [limit, page, search, status]
  );

  useEffect(() => {
    load({ nextPage: 1 });
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      load({ nextPage: 1 });
    }, 300);
    return () => clearTimeout(t);
  }, [search, status, load]);

  const cards = useMemo(() => {
    const s = summary || {};
    const safe = (v) => (v === undefined || v === null ? 0 : Number(v) || 0);
    return [
      { label: "Total referrals", value: safe(s.totalReferrals) },
      { label: "Pending", value: safe(s.pendingReferrals) },
      { label: "Rewarded", value: safe(s.rewardedReferrals) },
      { label: "Referral codes", value: safe(s.totalCodes) }
    ];
  }, [summary]);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <div className="text-2xl font-semibold text-gray-900">Referrals</div>
        <div className="mt-1 text-sm text-gray-600">Track referral codes and referral history across the platform.</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase">{c.label}</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">{Number(c.value || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search referred email..."
            className="w-full md:w-80 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full md:w-56 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All statuses</option>
            <option value="pending">pending</option>
            <option value="rewarded">rewarded</option>
          </select>

          <div className="flex-1" />

          <div className="text-xs text-gray-500">
            {pagination?.total !== undefined ? `Total: ${pagination.total}` : ""}
          </div>
        </div>

        {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-gray-400">
              <tr className="border-b">
                <th className="py-3 text-left font-semibold">Referred church</th>
                <th className="py-3 text-left font-semibold">Referred email</th>
                <th className="py-3 text-left font-semibold">Referrer church</th>
                <th className="py-3 text-left font-semibold">Status</th>
                <th className="py-3 text-left font-semibold">Referred at</th>
                <th className="py-3 text-left font-semibold">Subscribed at</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    No referrals found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r?._id} className="border-b last:border-b-0">
                    <td className="py-3 text-gray-900">{r?.referredChurch?.name || "—"}</td>
                    <td className="py-3 text-gray-700">{r?.referredChurchEmail || r?.referredChurch?.email || "—"}</td>
                    <td className="py-3 text-gray-700">{r?.referrerChurch?.name || "—"}</td>
                    <td className="py-3 text-gray-700">{r?.rewardStatus || "—"}</td>
                    <td className="py-3 text-gray-700">{fmtDateTime(r?.referredAt)}</td>
                    <td className="py-3 text-gray-700">{fmtDateTime(r?.subscribedAt)}</td>
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

export default ReferralsPage;
