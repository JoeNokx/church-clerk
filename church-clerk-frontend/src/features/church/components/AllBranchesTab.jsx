import React, { useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import debounce from "../../../shared/utils/debounce.js";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import Select from "../../../shared/components/Select/index.jsx";
import StatusChip from "../../../shared/components/StatusChip/index.jsx";
import AddBranchesModal from "./AddBranchesModal.jsx";
import { getMyBranches } from "../services/church.api.js";

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

function AllBranchesTab({ onViewBranch }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branches, setBranches] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [kpis, setKpis] = useState({ totalBranches: 0, totalMembers: 0, activeBranches: 0, newMembersThisMonth: 0, change: {}, diff: {} });
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
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
        const res = await getMyBranches({ page, limit, search, status });
        const payload = res?.data?.data ?? res?.data;
        const rows = Array.isArray(payload?.branches) ? payload.branches : Array.isArray(payload) ? payload : [];
        const nextKpis = payload?.kpis || null;
        if (cancelled) return;
        setBranches(rows);
        setPagination(payload?.pagination || null);
        if (nextKpis) {
          setKpis({
            totalBranches: Number(nextKpis?.totalBranches || 0),
            totalMembers: Number(nextKpis?.totalMembers || 0),
            activeBranches: Number(nextKpis?.activeBranches || 0),
            newMembersThisMonth: Number(nextKpis?.newMembersThisMonth || 0),
            change: nextKpis?.change || {},
            diff: nextKpis?.diff || {},
          });
        }
      } catch (e) {
        if (cancelled) return;
        setBranches([]);
        setPagination(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load branches");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [page, search, status, reloadKey]);

  const filtering = Boolean(String(searchValue || "").trim() || (status && status !== "all"));

  const clearFilters = () => {
    setSearchValue("");
    setSearch("");
    setStatus("all");
    setPage(1);
  };

  const onStatusChange = (v) => {
    setStatus(v);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <KpiGrid className="gap-3 md:grid-cols-4">
        <KpiCard
          title="Total Branches"
          value={Number(kpis.totalBranches || 0).toLocaleString()}
          change={kpis?.change?.totalBranches}
          diff={kpis?.diff?.totalBranches}
          compareLabel="last month"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M3 7l9-4 9 4M5 21V7M19 21V7M9 21v-6h6v6" />
            </svg>
          }
          iconBg="bg-blue-100"
          iconColor="text-blue-700"
        />
        <KpiCard
          title="Active Branches"
          value={Number(kpis.activeBranches || 0).toLocaleString()}
          change={kpis?.change?.activeBranches}
          diff={kpis?.diff?.activeBranches}
          compareLabel="last month"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          }
          iconBg="bg-green-100"
          iconColor="text-green-700"
        />
        <KpiCard
          title="Total Members"
          value={Number(kpis.totalMembers || 0).toLocaleString()}
          change={kpis?.change?.totalMembers}
          diff={kpis?.diff?.totalMembers}
          compareLabel="last month"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="7" r="4" />
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
          iconBg="bg-purple-100"
          iconColor="text-purple-700"
        />
        <KpiCard
          title="New Members This Month"
          value={Number(kpis.newMembersThisMonth || 0).toLocaleString()}
          change={kpis?.change?.newMembersThisMonth}
          diff={kpis?.diff?.newMembersThisMonth}
          compareLabel="last month"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <path d="M20 8v6M23 11h-6" />
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
            <div className="font-semibold text-gray-900 text-sm">All Branches</div>
            <div className="text-gray-500 text-xs">Every branch with its key stats</div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-3">
            <FilterBar
              searchValue={searchValue}
              onSearchChange={(v) => {
                setSearchValue(v);
                debouncedSearch(v);
              }}
              searchPlaceholder="Search name, location or pastor..."
              searchWidth="md:w-[280px]"
              selects={[
                { key: "status", value: status || "all", onChange: onStatusChange, options: STATUS_OPTIONS },
              ]}
            />

            {/* Mobile filters */}
            <div className="flex flex-col gap-2 md:hidden">
              <input
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  debouncedSearch(e.target.value);
                }}
                placeholder="Search name, location or pastor..."
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm"
              />
              <Select value={status || "all"} onChange={(e) => onStatusChange(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </div>

            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex h-11 md:h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 text-sm"
            >
              <span className="leading-none text-lg">+</span>
              Add Branches
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-4 md:p-6">
            <Skeleton height={14} count={6} />
          </div>
        ) : !branches.length ? (
          <EmptyState
            illustration={filtering ? "search" : "ministries"}
            title={filtering ? "No branches found" : "No branches yet"}
            description={filtering
              ? "We couldn't find any branches matching your filters."
              : "Branches of your church will appear here once they're added."}
            actionLabel={filtering ? "Clear Filters" : null}
            onAction={filtering ? clearFilters : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left font-semibold text-gray-500 text-xs">
                  <th className="sticky left-0 z-20 bg-slate-100 px-4 py-2 whitespace-nowrap md:px-6">Branch</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Location</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Pastor</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Members</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Status</th>
                  <th className="px-4 py-2 text-right whitespace-nowrap md:px-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {branches.map((b, idx) => (
                  <tr key={b?._id ?? `b-${idx}`} className="text-gray-700 text-sm">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 text-gray-900 whitespace-nowrap md:px-6">
                      <div className="font-medium">{b?.name || "—"}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap md:px-6">{`${b?.city || ""}${b?.region ? `, ${b.region}` : ""}`.trim() || "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap md:px-6">{b?.pastor || "—"}</td>
                    <td className="px-4 py-2 font-semibold text-blue-700 whitespace-nowrap md:px-6">{Number(b?.memberCount || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap md:px-6">
                      <StatusChip value={b?.isActive === false ? "inactive" : "active"} />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap md:px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onViewBranch?.(b)}
                          className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                        >
                          View Church
                        </button>
                      </div>
                    </td>
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

      <AddBranchesModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}

export default AllBranchesTab;
