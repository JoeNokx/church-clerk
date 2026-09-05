import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line, Legend,
} from "recharts";
import { getOutreachKPI, getOutreachAnalytics, getFollowUpsStats, getOutreachEvents } from "../../services/outreach.api.js";
import { useDashboardNavigator } from "../../../../shared/hooks/useDashboardNavigator.js";
import EmptyState from "../../../../shared/components/EmptyState/index.jsx";
import KpiCard from "../../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../../shared/components/KpiGrid/index.jsx";

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function formatLongDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatRange(from, to) {
  const f = from ? new Date(from) : null;
  const t = to ? new Date(to) : null;
  if (f && Number.isNaN(f.getTime())) return "—";
  if (t && Number.isNaN(t.getTime())) return "—";
  if (f && t) {
    const sameDay = f.toDateString() === t.toDateString();
    if (sameDay) return formatLongDate(f);
    return `${formatLongDate(f)} - ${formatLongDate(t)}`;
  }
  if (f) return formatLongDate(f);
  if (t) return formatLongDate(t);
  return "—";
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function CalendarAvatar({ dateStr }) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const day = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  return (
    <div className="shrink-0 flex flex-col items-center rounded-lg overflow-hidden border border-indigo-100" style={{ width: 38, minWidth: 38 }}>
      <div className="cck-calendar-month w-full bg-indigo-100 text-indigo-600 text-center font-bold py-0.5" style={{ fontSize: 8, letterSpacing: "0.05em" }}>{month}</div>
      <div className="cck-calendar-day text-gray-900 font-bold text-xs md:text-sm leading-none py-1 text-center w-full bg-white">{day}</div>
    </div>
  );
}

const STATUS_STYLES = {
  planned: "bg-blue-100 text-blue-700",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function SectionCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
      <div className="font-semibold text-gray-800 text-sm mb-4">{title}</div>
      {children}
    </div>
  );
}

export default function OverviewTab() {
  const { toPage } = useDashboardNavigator();
  const [kpi, setKpi] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [fuStats, setFuStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiRes, analRes, fuRes, evRes] = await Promise.allSettled([
        getOutreachKPI(),
        getOutreachAnalytics(),
        getFollowUpsStats(),
        getOutreachEvents({ status: "planned", limit: 5, sort: "date" }),
      ]);
      if (kpiRes.status === "fulfilled") setKpi(kpiRes.value?.data?.data || null);
      if (analRes.status === "fulfilled") setAnalytics(analRes.value?.data?.data || null);
      if (fuRes.status === "fulfilled") setFuStats(fuRes.value?.data?.data || null);
      if (evRes.status === "fulfilled") setUpcoming(evRes.value?.data?.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const monthlyChart = analytics?.monthlyChart || [];
  const pipelineChart = analytics?.pipelineChart || [];

  const STAGE_LABELS = {
    reached: "Reached", contacted: "Contacted", interested: "Interested",
    "visited-church": "Visited Church", connected: "Connected",
    "new-believer": "New Believer", member: "Member",
  };

  if (loading) {
    return (
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      {/* KPI Cards — all 8 in one consistent grid */}
      <KpiGrid className="gap-3 lg:grid-cols-4">
        <KpiCard
          title="Total Outreaches"
          value={kpi?.totalEvents ?? 0}
          change={kpi?.change?.totalEvents}
          diff={kpi?.diff?.totalEvents}
          compareLabel="last month"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          }
          iconBg="bg-blue-100"
          iconColor="text-blue-700"
        />
        <KpiCard
          title="People Reached"
          value={kpi?.totalProspects ?? 0}
          change={kpi?.change?.totalProspects}
          diff={kpi?.diff?.totalProspects}
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
          title="Decisions / Salvations"
          value={kpi?.totalDecisions ?? 0}
          change={kpi?.change?.totalDecisions}
          diff={kpi?.diff?.totalDecisions}
          compareLabel="last month"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
            </svg>
          }
          iconBg="bg-green-100"
          iconColor="text-green-700"
        />
        <KpiCard
          title="Overdue Follow-Ups"
          value={fuStats?.overdue ?? 0}
          change={fuStats?.change?.overdue}
          diff={fuStats?.diff?.overdue}
          compareLabel="last month"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          }
          iconBg={fuStats?.overdue > 0 ? "bg-red-100" : "bg-gray-100"}
          iconColor={fuStats?.overdue > 0 ? "text-red-600" : "text-gray-600"}
        />
        <KpiCard
          title="Follow-Up Completion Rate"
          value={`${analytics?.followUpRate ?? 0}%`}
          change={analytics?.change?.followUpRate}
          diff={analytics?.diff?.followUpRate}
          compareLabel="last year"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          }
          iconBg="bg-emerald-100"
          iconColor="text-emerald-700"
        />
        <KpiCard
          title="Converted to Members"
          value={analytics?.totalConverted ?? 0}
          change={analytics?.change?.totalConverted}
          diff={analytics?.diff?.totalConverted}
          compareLabel="last year"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M22 11h-6" />
            </svg>
          }
          iconBg="bg-teal-100"
          iconColor="text-teal-700"
        />
        <KpiCard
          title="Marked as Visitors"
          value={analytics?.totalVisitors ?? 0}
          change={analytics?.change?.totalVisitors}
          diff={analytics?.diff?.totalVisitors}
          compareLabel="last year"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <path d="M9 22V12h6v10" />
            </svg>
          }
          iconBg="bg-blue-100"
          iconColor="text-blue-700"
        />
        <KpiCard
          title="Follow-Ups Done This Month"
          value={fuStats?.completedThisMonth ?? 0}
          change={fuStats?.change?.completedThisMonth}
          diff={fuStats?.diff?.completedThisMonth}
          compareLabel="last month"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          }
          iconBg="bg-amber-100"
          iconColor="text-amber-700"
        />
      </KpiGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly People Reached */}
        <SectionCard title="People Reached This Year">
          {monthlyChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="peopleReached" name="People Reached" fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="decisions" name="Decisions" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState compact illustration="chart" title="No data yet" description="Outreach activity will appear here once events are recorded." />
          )}
        </SectionCard>

        {/* Pipeline Funnel */}
        <SectionCard title="People Journey Pipeline">
          {pipelineChart.some(s => s.count > 0) ? (
            <div className="space-y-2">
              {pipelineChart.map((s, i) => {
                const maxCount = Math.max(...pipelineChart.map(x => x.count), 1);
                const pct = Math.round((s.count / maxCount) * 100);
                const colors = ["bg-purple-500","bg-indigo-500","bg-blue-500","bg-cyan-500","bg-teal-500","bg-green-500","bg-emerald-600"];
                return (
                  <div key={s.stage} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-gray-500 text-right shrink-0">{STAGE_LABELS[s.stage] || s.stage}</div>
                    <div className="flex-1 h-6 rounded-lg bg-gray-100 overflow-hidden">
                      <div className={`h-full ${colors[i % colors.length]} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-8 text-xs font-semibold text-gray-700 text-right shrink-0">{s.count}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState compact illustration="pipeline" title="No pipeline data yet" description="People will move through your outreach pipeline as they're reached." />
          )}
        </SectionCard>
      </div>

      {/* Second Row: Overdue + Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overdue Follow-Ups — table like Recent Members */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div>
              <div className="font-semibold text-gray-900 text-sm">Overdue Follow-Ups ({fuStats?.overdue ?? 0})</div>
              <div className="text-gray-500 text-xs">Follow-ups past their scheduled date</div>
            </div>
            <button
              type="button"
              onClick={() => toPage("outreach", { defaultTab: "followups" })}
              className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 text-[11px]"
            >
              View All
              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2"><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>

          <div className="pb-2">
            {(fuStats?.overdueList || []).length ? (
              <table className="w-full text-xs border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-2 pl-3 font-semibold text-gray-400 uppercase tracking-wide text-[10px] whitespace-nowrap" style={{ width: "40%" }}>Name</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-400 uppercase tracking-wide text-[10px] whitespace-nowrap" style={{ width: "18%" }}>Type</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-400 uppercase tracking-wide text-[10px] whitespace-nowrap" style={{ width: "20%" }}>Scheduled</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-400 uppercase tracking-wide text-[10px] whitespace-nowrap" style={{ width: "12%" }}>Status</th>
                    <th className="py-2 pl-2 pr-3" style={{ width: "10%" }} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(fuStats?.overdueList || []).slice(0, 5).map((fu, idx) => {
                    const fullName = `${fu?.prospect?.firstName || ""} ${fu?.prospect?.lastName || ""}`.trim() || "—";
                    return (
                    <tr
                      key={`${fu?._id || "fu"}-${idx}`}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-2.5 pr-2 pl-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-semibold text-[10px] shrink-0">
                            {(fu?.prospect?.firstName || "?").slice(0, 1).toUpperCase()}
                          </div>
                          <span className="font-semibold text-xs text-gray-900 truncate">
                            {fullName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-gray-500 capitalize truncate">{fu?.type || "—"}</td>
                      <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">{fmtDate(fu?.scheduledDate)}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className="rounded-full bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5">Overdue</span>
                      </td>
                      <td className="py-2.5 pl-2 pr-3 text-right">
                        <button
                          onClick={() => toPage("prospect-details", { id: fu?.prospect?._id, from: "overview" })}
                          className="h-7 px-2 rounded-lg border border-gray-200 text-[10px] font-semibold text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState compact illustration="followUps" title="No overdue follow-ups" description="You're all caught up." />
            )}
          </div>
        </div>

        {/* Upcoming Outreaches — list like Upcoming Programs */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div>
              <div className="font-semibold text-gray-900 text-sm">Upcoming Outreaches</div>
              <div className="text-gray-500 text-xs">Next scheduled outreaches</div>
            </div>
            <button
              type="button"
              onClick={() => toPage("outreach", { defaultTab: "outreaches" })}
              className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 text-[11px]"
            >
              View All
              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2"><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="px-3 pb-3">
            <div className="mt-2">
              {upcoming.length ? (
                <div className="divide-y divide-gray-200">
                  {upcoming.map((ev, idx) => {
                    const evDate = ev?.date || ev?.dateFrom || ev?.startDate;
                    const daysLeft = getDaysUntil(evDate);
                    const daysLabel = daysLeft === null ? "" : daysLeft === 0 ? "Today" : daysLeft === 1 ? "1 day" : `${daysLeft} days`;
                    return (
                      <button
                        key={`${ev?._id || "ev"}-${idx}`}
                        type="button"
                        onClick={() => toPage("outreach-event-details", { id: ev._id, from: "overview" })}
                        className="cck-allow-icons w-full text-left px-2 py-2 hover:bg-gray-50 transition-colors rounded-lg"
                      >
                        <div className="flex items-center" style={{ gap: "8px" }}>
                          <CalendarAvatar dateStr={evDate} />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 truncate text-xs">
                              {ev?.title || ev?.name || "—"}
                            </div>
                            <div className="text-gray-500 text-xs">{formatRange(evDate, ev?.dateTo || ev?.endDate)}</div>
                            <div className="text-gray-400 text-xs truncate">{ev?.location || ev?.area || ""}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {daysLabel ? <div className="text-xs text-gray-600 font-medium whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5">{daysLabel}</div> : null}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_STYLES[ev?.status] || "bg-gray-100 text-gray-600"}`}>{ev?.status}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <EmptyState compact illustration="events" title="No upcoming events" description="Scheduled outreach events will appear here." />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
