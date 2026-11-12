import { useContext, useMemo, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import Pagination from "../../../shared/components/Pagination/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";
import MemberFollowUpForm from "./MemberFollowUpForm.jsx";
import MissedServicesModal from "./MissedServicesModal.jsx";

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function MemberStatusChip({ value }) {
  const v = String(value || "").toLowerCase();
  const styles =
    v === "active"
      ? "border-green-200 bg-green-50 text-green-700"
      : v === "dormant"
        ? "border-gray-300 bg-gray-100 text-gray-600"
        : "border-amber-200 bg-amber-50 text-amber-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold capitalize ${styles} text-xs`}>
      {v ? v.replace(/_/g, " ") : "-"}
    </span>
  );
}

function StreakBadge({ streak, dormantThreshold, metric }) {
  if (metric === "count") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold text-xs bg-amber-50 text-amber-700 border border-amber-200">
        {streak} {Number(streak) === 1 ? "time" : "times"}
      </span>
    );
  }
  const critical = Number(streak) >= Number(dormantThreshold || 10);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold text-xs ${critical ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
      {streak} {Number(streak) === 1 ? "service" : "services"}
      {critical ? " · dormant" : ""}
    </span>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const CURRENT_YEAR = String(new Date().getFullYear());

const SELECT = "h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-2.5 pr-7 text-gray-700 text-xs outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer";
const CHEV = (
  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-gray-400"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </span>
);

function AbsenteesTab({
  rows,
  loading,
  error,
  pagination,
  limit,
  search,
  onSearchChange,
  serviceType,
  onServiceTypeChange,
  serviceTypeOptions = [],
  year,
  onYearChange,
  month,
  onMonthChange,
  threshold,
  onThresholdChange,
  dormantThreshold = 10,
  metric = "streak",
  onPage,
  onLimitChange,
}) {
  const { can } = useContext(PermissionContext) || {};
  const { toPage } = useDashboardNavigator();
  const guarded = useGuardedAction();

  const [fuRow, setFuRow] = useState(null);
  const [missedRow, setMissedRow] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const canViewMember = useMemo(() => (typeof can === "function" ? can("members", "read") : false), [can]);
  const canCreateFollowUp = useMemo(() => (typeof can === "function" ? can("outreach", "create") : false), [can]);

  const viewMember = (m) => {
    if (!m?._id) return;
    toPage("member-details", { id: m._id }, { state: { from: "attendance" } });
  };

  const handleFollowUpSaved = () => {
    setSuccessMsg("Follow-up scheduled — find it under Outreach → Follow-Ups.");
    setTimeout(() => setSuccessMsg(""), 5000);
  };

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white">
      {/* Header + filters */}
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <div className="font-semibold text-gray-900 text-sm">Absentees</div>
          <div className="text-gray-500 text-xs">
            {metric === "count"
              ? "Members marked absent at least once in the selected month."
              : <>Members marked absent for {Number(threshold) || 3}+ consecutive services. At {Number(dormantThreshold) || 10}+ marked absences a member is auto-marked dormant; 3 consecutive attendances makes them active again. Status can still be changed manually.</>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search by name or phone..."
            className="h-9 flex-1 min-w-[160px] rounded-lg border border-gray-200 bg-white px-2.5 text-gray-700 text-xs outline-none focus:ring-2 focus:ring-blue-100"
          />
          <div className="relative shrink-0">
            <select
              value={serviceType}
              onChange={(e) => onServiceTypeChange?.(e.target.value)}
              className={SELECT}
            >
              <option value="">All services</option>
              {serviceTypeOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {CHEV}
          </div>
          <div className="flex h-9 items-center shrink-0 rounded-lg border border-gray-200 bg-white overflow-hidden text-xs focus-within:ring-2 focus-within:ring-blue-100">
            <div className="relative">
              <select
                value={month}
                onChange={(e) => onMonthChange?.(e.target.value)}
                className="h-9 appearance-none bg-transparent pl-2.5 pr-6 text-gray-700 outline-none cursor-pointer"
              >
                <option value="">All months</option>
                {MONTHS.map((l, i) => (
                  <option key={i + 1} value={i + 1}>{l}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center">
                <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-gray-400"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </div>
            <span className="h-4 w-px bg-gray-200 shrink-0" />
            <input
              value={year}
              onChange={(e) => onYearChange?.(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              type="text"
              inputMode="numeric"
              placeholder="e.g. 2026"
              className="h-9 w-14 bg-transparent px-2 text-gray-700 outline-none"
            />
          </div>
          <div className="relative shrink-0">
            <select
              value={threshold}
              onChange={(e) => onThresholdChange?.(Number(e.target.value) || 3)}
              disabled={metric === "count"}
              className={`${SELECT} disabled:opacity-50 disabled:cursor-not-allowed`}
              title={metric === "count" ? "Not used when a month is selected — the list shows everyone absent at least once" : ""}
            >
              {[3, 5, 7, 10].map((n) => (
                <option key={n} value={n}>{n}+ missed</option>
              ))}
            </select>
            {CHEV}
          </div>
        </div>
      </div>

      {successMsg ? (
        <div className="mx-4 md:mx-6 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800 text-sm">
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => toPage("outreach", { defaultTab: "followups" })}
            className="font-semibold text-green-800 underline underline-offset-2 hover:text-green-900"
          >
            Open Follow-Ups
          </button>
        </div>
      ) : null}

      {/* Body */}
      {error ? (
        <div className="p-4 md:p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
        </div>
      ) : loading ? (
        <div className="overflow-x-auto animate-pulse">
          <table className="min-w-full">
            <thead className="bg-slate-100">
              <tr className="text-left font-semibold text-gray-500 text-xs">
                {["w-24", "w-20", "w-16", "w-16", "w-24", "w-20", "w-10"].map((w, i) => (
                  <th key={i} className={`${i === 0 ? "sticky left-0 z-20 bg-slate-100" : ""} max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6`}>
                    <div className={`h-3 rounded bg-gray-200 ${w}`} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[0, 1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  {["w-24", "w-20", "w-16", "w-16", "w-24", "w-20", "w-10"].map((w, j) => (
                    <td key={j} className={`${j === 0 ? "sticky left-0 z-10 bg-white" : ""} max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6`}>
                      <div className={`h-4 rounded bg-gray-200 ${w}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !rows.length ? (
        <EmptyState
          compact
          illustration="attendance"
          title="No absentees"
          description={`No members have been marked absent for ${Number(threshold) || 3}+ consecutive services.`}
        />
      ) : (
        <>
          <div className="relative overflow-x-auto pb-24">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                  <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Member</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Phone</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Location</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">{metric === "count" ? "Times Absent" : "Absent Streak"}</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Last Attended</th>
                  <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((row, index) => {
                  const m = row?.member || {};
                  const name = `${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "-";
                  const location = [m?.streetAddress, m?.city].filter(Boolean).join(", ") || "-";
                  return (
                    <tr key={String(m?._id ?? `row-${index}`)} className="max-md:text-xs text-gray-700 text-sm">
                      <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={name}>
                        <span className="sm:hidden">{truncateMobileName(name)}</span>
                        <span className="hidden sm:inline">{truncateDesktopName(name)}</span>
                      </td>
                      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{m?.phoneNumber || "-"}</td>
                      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6" title={location}>{location}</td>
                      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                        <MemberStatusChip value={m?.status} />
                        {m?.attendanceStatusOverride ? (
                          <span className="ml-1.5 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 text-[10px]" title="Status manually set — auto status changes are paused for this member">
                            manual
                          </span>
                        ) : null}
                      </td>
                      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                        <StreakBadge streak={row?.absentStreak} dormantThreshold={dormantThreshold} metric={metric} />
                      </td>
                      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{formatDate(row?.lastAttended)}</td>
                      <td className="max-md:px-4 py-1.5 text-right whitespace-nowrap px-4 md:px-6">
                        <TableKebabMenu forceKebab items={[
                          { label: "View Services", onClick: () => setMissedRow(row) },
                          canViewMember && { label: "View Member", onClick: () => viewMember(m) },
                          { label: "Schedule Follow-Up", onClick: () => guarded(() => setFuRow(row), "outreach", "create") },
                        ].filter(Boolean)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200">
            <Pagination
              pagination={pagination}
              rowsCount={rows.length}
              limit={limit}
              onLimitChange={onLimitChange}
              onPageChange={onPage}
              itemName="absentees"
              filtered={Boolean(String(search || "").trim() || serviceType || month || (year && year !== CURRENT_YEAR) || (metric !== "count" && Number(threshold) !== 3))}
            />
          </div>
        </>
      )}

      {fuRow ? (
        <MemberFollowUpForm
          member={fuRow?.member}
          defaultNotes={`Marked absent for ${Number(fuRow?.absentStreak) || 0} consecutive services — absentee check-in.`}
          onClose={() => setFuRow(null)}
          onSaved={handleFollowUpSaved}
        />
      ) : null}

      {missedRow ? (
        <MissedServicesModal
          member={missedRow?.member}
          serviceType={serviceType}
          year={year}
          month={month}
          onClose={() => setMissedRow(null)}
        />
      ) : null}
    </div>
  );
}

export default AbsenteesTab;
