import React, { useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import debounce from "../../../shared/utils/debounce.js";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import Select from "../../../shared/components/Select/index.jsx";
import StatusChip from "../../../shared/components/StatusChip/index.jsx";
import Pagination from "../../../shared/components/Pagination/index.jsx";
import { getBranchMembers } from "../services/church.api.js";

const MEMBER_STATUSES = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Dormant", value: "dormant" },
  { label: "Visitor", value: "visitor" },
  { label: "Transferred", value: "transferred" },
  { label: "Temporarily Away", value: "temporarily_away" },
  { label: "Left Church", value: "left_church" },
  { label: "Deceased", value: "deceased" },
  { label: "Former", value: "former" },
];

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function HqBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700 text-[10px]">
      HQ
    </span>
  );
}

function BranchMembershipTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchValue, setSearchValue] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");


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
        const res = await getBranchMembers({
          page,
          limit,
          search,
          status: status === "all" ? "" : status,
        });
        const payload = res?.data?.data ?? res?.data;
        if (!cancelled) setData(payload || null);
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(e?.response?.data?.message || e?.message || "Failed to load branch members");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [page, limit, search, status]);

  const kpis = data?.kpis || {};
  const members = data?.members || [];
  const pagination = data?.pagination || null;
  const filtering = Boolean(String(searchValue || "").trim() || status !== "all");

  const clearFilters = () => {
    setSearchValue("");
    setSearch("");
    setStatus("all");
    setPage(1);
  };

  const onFilterChange = (setter) => (v) => {
    setter(v);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <KpiGrid className="gap-3 md:grid-cols-4">
        <KpiCard
          title="Total Members"
          value={Number(kpis.totalMembers || 0).toLocaleString()}
          subtitle="Headquarters + all branches"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="7" r="4" />
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
          iconBg="bg-blue-100"
          iconColor="text-blue-700"
        />
        <KpiCard
          title="New Members"
          value={Number(kpis.newMembersThisMonth || 0).toLocaleString()}
          subtitle="Joined this month"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <path d="M20 8v6M23 11h-6" />
            </svg>
          }
          iconBg="bg-green-100"
          iconColor="text-green-700"
        />
        <KpiCard
          title="Active Members"
          value={Number(kpis.activeMembers || 0).toLocaleString()}
          subtitle="Status: active"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          }
          iconBg="bg-purple-100"
          iconColor="text-purple-700"
        />
        <KpiCard
          title="Inactive Members"
          value={Number(kpis.inactiveMembers || 0).toLocaleString()}
          subtitle="All other statuses"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          }
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
        />
      </KpiGrid>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Member Records</div>
            <div className="text-gray-500 text-xs">Members across headquarters and all branches</div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-3">
            <FilterBar
              searchValue={searchValue}
              onSearchChange={(v) => {
                setSearchValue(v);
                debouncedSearch(v);
              }}
              searchPlaceholder="Search name, phone or ID..."
              searchWidth="md:w-[260px]"
              selects={[
                { key: "status", value: status, onChange: onFilterChange(setStatus), options: MEMBER_STATUSES },
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
                placeholder="Search name, phone or ID..."
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm"
              />
              <Select value={status} onChange={(e) => onFilterChange(setStatus)(e.target.value)}>
                {MEMBER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-4 md:p-6">
            <Skeleton height={14} count={6} />
          </div>
        ) : !members.length ? (
          <EmptyState
            illustration={filtering ? "search" : "members"}
            title={filtering ? "No members found" : "No members yet"}
            description={filtering
              ? "We couldn't find any members matching your filters."
              : "Members across your headquarters and branches will appear here."}
            actionLabel={filtering ? "Clear Filters" : null}
            onAction={filtering ? clearFilters : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left font-semibold text-gray-500 text-xs">
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Member Name</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Branch</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Phone</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Membership Status</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {members.map((m) => (
                  <tr key={m._id} className="text-gray-700 text-sm">
                    <td className="px-4 py-2 text-gray-900 whitespace-nowrap md:px-6">
                      <div className="font-medium">{m.name || "—"}</div>
                      {m.memberId ? <div className="text-gray-400 text-xs">{m.memberId}</div> : null}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap md:px-6">
                      {m.branch?.name || "—"}
                      {m.branch?.isHeadquarters ? <HqBadge /> : null}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap md:px-6">{m.phone || "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap md:px-6">
                      <StatusChip value={m.status} />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap md:px-6">{fmtDate(m.dateJoined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          pagination={pagination}
          rowsCount={members.length}
          limit={limit}
          onLimitChange={(n) => { setLimit(n); setPage(1); }}
          onPageChange={setPage}
          itemName="members"
          filtered={filtering}
        />
      </div>
    </div>
  );
}

export default BranchMembershipTab;
