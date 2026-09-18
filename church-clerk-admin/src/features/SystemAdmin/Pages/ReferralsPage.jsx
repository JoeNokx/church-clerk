import { useCallback, useEffect, useMemo, useState } from "react";

import { getSystemReferralHistory, getSystemReferralSummary } from "../Services/systemAdmin.api.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import KpiStatCard from "../../../shared/components/KpiStatCard/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import StatusChip from "../../../shared/components/StatusChip/index.jsx";
import Button from "../../../shared/components/Button/index.jsx";

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

  const statusSelects = [
    {
      key: "status",
      value: status,
      onChange: (v) => setStatus(v),
      options: [
        { label: "pending", value: "pending" },
        { label: "rewarded", value: "rewarded" }
      ],
      placeholder: "All statuses"
    }
  ];

  const mobileFilters = [
    {
      key: "status",
      label: "Status",
      value: status,
      defaultValue: "",
      options: [
        { label: "All statuses", value: "" },
        { label: "pending", value: "pending" },
        { label: "rewarded", value: "rewarded" }
      ]
    }
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <div className="text-2xl font-semibold text-gray-900">Referrals</div>
        <div className="mt-1 text-sm text-gray-600">Track referral codes and referral history across the platform.</div>
      </div>

      <KpiGrid className="gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <KpiStatCard
            key={c.label}
            label={c.label}
            value={Number(c.value || 0).toLocaleString()}
          />
        ))}
      </KpiGrid>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4 md:p-6 lg:p-8">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Referral History</div>
            <div className="text-gray-500 text-xs">All referral records across the platform</div>
          </div>

          <div className="flex flex-col gap-3">
            <FilterBar
              searchValue={search}
              onSearchChange={(v) => setSearch(v)}
              searchPlaceholder="Search referred email..."
              searchWidth="md:w-[320px]"
              selects={statusSelects}
            >
              <div className="text-xs text-gray-500">
                {pagination?.total !== undefined ? `Total: ${pagination.total}` : ""}
              </div>
            </FilterBar>
            <MobileFilterBar
              searchValue={search}
              onSearchChange={(v) => setSearch(v)}
              searchPlaceholder="Search referred email..."
              filters={mobileFilters}
              onApply={(pending) => setStatus(pending?.status || "")}
              resultCount={pagination?.total ?? null}
            />
          </div>
        </div>

        {error ? <div className="px-4 md:px-6 lg:px-8 pt-4 text-sm text-red-600">{error}</div> : null}

        {loading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-16 rounded bg-gray-200" /></th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-16 rounded bg-gray-200" /></th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-16 rounded bg-gray-200" /></th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-12 rounded bg-gray-200" /></th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-16 rounded bg-gray-200" /></th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6"><div className="h-3 w-16 rounded bg-gray-200" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[0, 1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-12 rounded bg-gray-200" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            compact
            illustration="referrals"
            title="No referrals found"
            description="There are no referral records matching your filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                  <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Referred church</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Referred email</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Referrer church</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Referred at</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Subscribed at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((r) => (
                  <tr key={r?._id} className="max-md:text-xs text-gray-700 text-sm">
                    <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={r?.referredChurch?.name || ""}>
                      <span className="sm:hidden">{truncateMobileName(r?.referredChurch?.name)}</span>
                      <span className="hidden sm:inline">{truncateDesktopName(r?.referredChurch?.name)}</span>
                    </td>
                    <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6" title={r?.referredChurchEmail || r?.referredChurch?.email || ""}>
                      <span className="sm:hidden">{truncateMobileName(r?.referredChurchEmail || r?.referredChurch?.email)}</span>
                      <span className="hidden sm:inline">{truncateDesktopName(r?.referredChurchEmail || r?.referredChurch?.email)}</span>
                    </td>
                    <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6" title={r?.referrerChurch?.name || ""}>
                      <span className="sm:hidden">{truncateMobileName(r?.referrerChurch?.name)}</span>
                      <span className="hidden sm:inline">{truncateDesktopName(r?.referrerChurch?.name)}</span>
                    </td>
                    <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                      {r?.rewardStatus ? <StatusChip value={r.rewardStatus} /> : "—"}
                    </td>
                    <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtDateTime(r?.referredAt)}</td>
                    <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtDateTime(r?.subscribedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 p-4 md:p-6 lg:p-8 pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load({ nextPage: Math.max(1, page - 1) })}
            disabled={loading || !(pagination?.prevPage ?? false)}
          >
            Prev
          </Button>
          <div className="text-xs text-gray-600">
            Page {page}
            {pagination?.totalPages ? ` / ${pagination.totalPages}` : ""}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load({ nextPage: page + 1 })}
            disabled={loading || !(pagination?.nextPage ?? false)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ReferralsPage;
