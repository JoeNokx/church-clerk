import React, { useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import debounce from "../../../shared/utils/debounce.js";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import { getBranchAttendance } from "../services/church.api.js";

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function HqBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700 text-[10px]">
      HQ
    </span>
  );
}

function BranchAttendanceTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const [search, setSearch] = useState("");
  const limit = 10;

  const debouncedSearch = useMemo(
    () =>
      debounce((next) => {
        setSearch(next);
        setPage(1);
      }, 400),
    []
  );

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getBranchAttendance({
          page,
          limit,
          search,
        });
        const payload = res?.data?.data ?? res?.data;
        if (!cancelled) setData(payload || null);
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(e?.response?.data?.message || e?.message || "Failed to load branch attendance");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [page, search]);

  const kpis = data?.kpis || {};
  const rows = data?.rows || [];
  const pagination = data?.pagination || null;
  const filtering = Boolean(String(searchValue || "").trim());

  const clearFilters = () => {
    setSearchValue("");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <KpiGrid className="gap-3 md:grid-cols-4">
        <KpiCard
          title="This Sunday"
          value={Number(kpis.thisSunday || 0).toLocaleString()}
          subtitle={`Total attendance · ${fmtDate(data?.period?.sundayDate)}`}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
          iconBg="bg-blue-100"
          iconColor="text-blue-700"
        />
        <KpiCard
          title="Visitors This Month"
          value={Number(kpis.visitorsThisMonth || 0).toLocaleString()}
          subtitle="New visitors · HQ + branches"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <path d="M20 8v6M23 11h-6" />
            </svg>
          }
          iconBg="bg-purple-100"
          iconColor="text-purple-700"
        />
        <KpiCard
          title="Converted Visitors This Month"
          value={Number(kpis.convertedVisitorsThisMonth || 0).toLocaleString()}
          subtitle="Visitors who became members"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
          }
          iconBg="bg-green-100"
          iconColor="text-green-700"
        />
        <KpiCard
          title="Outreach This Month"
          value={Number(kpis.outreachThisMonth || 0).toLocaleString()}
          subtitle="People reached via outreach"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 11-5.8-1.6" />
            </svg>
          }
          iconBg="bg-amber-100"
          iconColor="text-amber-700"
        />
      </KpiGrid>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Branch Attendance</div>
            <div className="text-gray-500 text-xs">Sunday attendance, visitors, and outreach across headquarters and all branches</div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-3">
            <FilterBar
              searchValue={searchValue}
              onSearchChange={(v) => {
                setSearchValue(v);
                debouncedSearch(v);
              }}
              searchPlaceholder="Search branch..."
              searchWidth="md:w-[280px]"
            />

            {/* Mobile filters */}
            <div className="flex flex-col gap-2 md:hidden">
              <input
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  debouncedSearch(e.target.value);
                }}
                placeholder="Search branch..."
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-4 md:p-6">
            <Skeleton height={14} count={6} />
          </div>
        ) : !rows.length ? (
          <EmptyState
            illustration={filtering ? "search" : "attendance"}
            title={filtering ? "No branches found" : "No churches yet"}
            description={filtering
              ? "We couldn't find any churches matching your filters."
              : "Attendance, visitor, and outreach data across your headquarters and branches will appear here."}
            actionLabel={filtering ? "Clear Filters" : null}
            onAction={filtering ? clearFilters : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left font-semibold text-gray-500 text-xs">
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Branch</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">This Sunday</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Visitors This Month</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Converted Visitors This Month</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Outreach This Month</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Follow Up This Month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((r) => (
                  <tr key={r._id} className="text-gray-700 text-sm">
                    <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap md:px-6">
                      {r.name || "—"}
                      {r.isHeadquarters ? <HqBadge /> : null}
                    </td>
                    <td className="px-4 py-2 font-semibold text-blue-700 whitespace-nowrap md:px-6">{Number(r.thisSunday || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap md:px-6">{Number(r.visitorsThisMonth || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 font-semibold text-green-700 whitespace-nowrap md:px-6">{Number(r.convertedVisitorsThisMonth || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap md:px-6">{Number(r.outreachThisMonth || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap md:px-6">{Number(r.followUpsThisMonth || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => pagination?.prevPage && setPage(pagination.prevPage)}
            disabled={!pagination?.prevPage}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
          >
            Prev
          </button>
          <div className="text-gray-600 text-sm">Page {pagination?.currentPage || 1}</div>
          <button
            type="button"
            onClick={() => pagination?.nextPage && setPage(pagination.nextPage)}
            disabled={!pagination?.nextPage}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default BranchAttendanceTab;
