import { useCallback, useContext, useEffect, useState } from "react";

import MemberCareContext from "../memberCare.store.js";
import { getFollowUpsStats } from "../../outreach/services/outreach.api.js";
import { getPastoralAppointments } from "../services/memberCare.api.js";
import { SubjectTag, StatusBadge } from "./FollowUpsTab.jsx";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import { kpiTrendText } from "../../../shared/utils/kpiTrendText.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import Chip from "./Chip.jsx";
import { formatDate, labelFor, memberName, CASE_STATUSES, APPOINTMENT_TYPES } from "../constants.js";

function fmtDate(v) {
  if (!v) return "Not Specified";
  return new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// A follow-up's subject is a prospect, a visitor, or a member.
function subjectName(fu) {
  return (
    `${fu?.prospect?.firstName || ""} ${fu?.prospect?.lastName || ""}`.trim() ||
    fu?.visitor?.fullName ||
    `${fu?.member?.firstName || ""} ${fu?.member?.lastName || ""}`.trim() ||
    "Not Specified"
  );
}

export default function OverviewTab({ goTab }) {
  const store = useContext(MemberCareContext);
  const [kpi, setKpi] = useState(null);
  const [fuStats, setFuStats] = useState(null);
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!store?.activeChurchId) return;
    setLoading(true);
    try {
      const [kpiRes, fuRes, apptRes] = await Promise.allSettled([
        store?.getKPI?.(),
        getFollowUpsStats(),
        getPastoralAppointments({ upcoming: true, page: 1, limit: 5 }),
      ]);
      if (kpiRes.status === "fulfilled") {
        const payload = kpiRes.value?.data?.data ?? kpiRes.value?.data;
        setKpi(payload?.data ?? payload ?? null);
      }
      if (fuRes.status === "fulfilled") setFuStats(fuRes.value?.data?.data || null);
      if (apptRes.status === "fulfilled") {
        const payload = apptRes.value?.data?.data ?? apptRes.value?.data;
        setAppts(Array.isArray(payload?.appointments) ? payload.appointments : []);
      }
    } finally {
      setLoading(false);
    }
  }, [store?.activeChurchId, store?.getKPI]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  const overdueList = fuStats?.overdueList || [];
  const openCases = (Array.isArray(store?.cases) ? store.cases : [])
    .filter((c) => ["open", "in-progress"].includes(c?.status))
    .slice(0, 5);

  const ViewAll = ({ tab }) => (
    <button
      type="button"
      onClick={() => goTab?.(tab)}
      className="cck-allow-icons inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 text-[11px]"
    >
      View All
      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2"><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );

  return (
    <div className="mt-6 space-y-5">
      <KpiGrid className="gap-3 lg:grid-cols-3">
        <KpiCard
          title="Open Cases"
          value={kpi?.openCases ?? 0}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 21s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="In Progress"
          value={kpi?.inProgress ?? 0}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          title="Closed Cases"
          value={kpi?.closedCases ?? 0}
          iconBg="bg-gray-100"
          iconColor="text-gray-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M9 12l2 2 4-4M12 21a9 9 0 100-18 9 9 0 000 18Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="Visits (This Month)"
          value={kpi?.visitsThisMonth ?? 0}
          change={kpi?.change?.visitsThisMonth}
          diff={kpi?.diff?.visitsThisMonth}
          diffText={kpiTrendText(kpi?.diff?.visitsThisMonth, kpi?.change?.visitsThisMonth)}
          compareLabel="last month"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1V10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="Follow-Ups Due Today"
          value={fuStats?.dueToday ?? 0}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 3v4M16 3v4M3 11h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          title="Overdue Follow-Ups"
          value={fuStats?.overdue ?? 0}
          upIsGood={false}
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 9v4M12 17h.01M10.3 3.9 2.6 17a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="Upcoming (7 Days)"
          value={fuStats?.upcoming ?? 0}
          iconBg="bg-sky-50"
          iconColor="text-sky-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 8v4l3 2M21 12a9 9 0 11-9-9 9 9 0 019 9Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="Appointments Today"
          value={kpi?.appointmentsToday ?? 0}
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 3v4M16 3v4M3 11h18M12 14v4M10 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          title="Upcoming Appointments"
          value={kpi?.upcomingAppointments ?? 0}
          iconBg="bg-teal-50"
          iconColor="text-teal-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M8 7h8M8 11h8M8 15h5M5 3h14a1 1 0 011 1v16a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overdue Follow-Ups */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div>
              <div className="font-semibold text-gray-900 text-sm">Overdue Follow-Ups ({fuStats?.overdue ?? 0})</div>
              <div className="text-gray-500 text-xs">Follow-ups past their scheduled date</div>
            </div>
            <ViewAll tab="followup" />
          </div>
          <div className="pb-2">
            {overdueList.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-100">
                    <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Person</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Type</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Scheduled</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {overdueList.slice(0, 5).map((fu, idx) => {
                      const name = subjectName(fu);
                      return (
                        <tr key={fu?._id || `fu-${idx}`} className="max-md:text-xs text-gray-700 text-sm cursor-pointer" onClick={() => goTab?.("followup")}>
                          <td className="max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={name}>
                            <span className="font-semibold text-xs text-gray-900 sm:hidden">{truncateMobileName(name)}</span>
                            <span className="font-semibold text-xs text-gray-900 hidden sm:inline">{truncateDesktopName(name)}</span>
                          </td>
                          <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6"><SubjectTag fu={fu} /></td>
                          <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtDate(fu?.scheduledDate)}</td>
                          <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6"><StatusBadge status={fu?.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState compact illustration="followUps" title="No overdue follow-ups" description="You're all caught up." />
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div>
              <div className="font-semibold text-gray-900 text-sm">Upcoming Appointments ({kpi?.upcomingAppointments ?? 0})</div>
              <div className="text-gray-500 text-xs">Counseling sessions and pastoral appointments</div>
            </div>
            <ViewAll tab="pastoral" />
          </div>
          <div className="pb-2">
            {appts.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-100">
                    <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Person</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Type</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {appts.slice(0, 5).map((a, idx) => {
                      const name = a?.member ? memberName(a.member) : a?.attendeeName || "Not Specified";
                      return (
                        <tr key={a?._id || `appt-${idx}`} className="max-md:text-xs text-gray-700 text-sm cursor-pointer" onClick={() => goTab?.("pastoral")}>
                          <td className="max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={name}>
                            <span className="font-semibold text-xs text-gray-900 sm:hidden">{truncateMobileName(name)}</span>
                            <span className="font-semibold text-xs text-gray-900 hidden sm:inline">{truncateDesktopName(name)}</span>
                          </td>
                          <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{labelFor(APPOINTMENT_TYPES, a?.type)}</td>
                          <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtDate(a?.appointmentDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState compact illustration="memberCare" title="No upcoming appointments" description="Schedule counseling sessions and pastoral appointments." />
            )}
          </div>
        </div>

        {/* Open Care Cases — full width under the two columns above */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div>
              <div className="font-semibold text-gray-900 text-sm">Open Care Cases ({kpi?.openCases ?? 0})</div>
              <div className="text-gray-500 text-xs">Members currently needing pastoral care</div>
            </div>
            <ViewAll tab="cases" />
          </div>
          <div className="pb-2">
            {openCases.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-100">
                    <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Member</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Case</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Next Follow-Up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {openCases.map((row, idx) => {
                      const name = memberName(row?.member);
                      return (
                        <tr key={row?._id || `case-${idx}`} className="max-md:text-xs text-gray-700 text-sm cursor-pointer" onClick={() => goTab?.("cases")}>
                          <td className="max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={name}>
                            <span className="font-semibold text-xs text-gray-900 sm:hidden">{truncateMobileName(name)}</span>
                            <span className="font-semibold text-xs text-gray-900 hidden sm:inline">{truncateDesktopName(name)}</span>
                          </td>
                          <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{row?.title || "—"}</td>
                          <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6"><Chip value={row?.status} label={labelFor(CASE_STATUSES, row?.status)} /></td>
                          <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{formatDate(row?.nextFollowUpDate) || <span className="text-gray-300 text-xs">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState compact illustration="memberCare" title="No open care cases" description="Open a care case to start tracking pastoral care for members." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
