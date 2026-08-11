import { useCallback, useContext, useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line, Legend,
} from "recharts";
import PermissionContext from "../../../permissions/permission.store.js";
import { getOutreachKPI, getOutreachAnalytics, getFollowUpsStats, getOutreachEvents } from "../../services/outreach.api.js";
import { useDashboardNavigator } from "../../../../shared/hooks/useDashboardNavigator.js";

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_STYLES = {
  planned: "bg-blue-100 text-blue-700",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function KpiTile({ label, value, sub, accent }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 md:p-5 overflow-hidden relative ${accent ? "border-l-4 " + accent : "border-gray-200"}`}>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
      <div className="mt-1.5 font-bold text-gray-900 tabular-nums text-2xl md:text-3xl">{value ?? "—"}</div>
      {sub ? <div className="mt-1 text-xs text-gray-400">{sub}</div> : null}
    </div>
  );
}

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
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          label="Total Events"
          value={kpi?.totalEvents ?? 0}
          sub={`${kpi?.eventsThisMonth ?? 0} this month`}
          accent="border-l-blue-500"
        />
        <KpiTile
          label="People Reached"
          value={kpi?.totalProspects ?? 0}
          sub={`${kpi?.prospectsThisMonth ?? 0} this month`}
          accent="border-l-purple-500"
        />
        <KpiTile
          label="Decisions / Salvations"
          value={kpi?.totalDecisions ?? 0}
          sub={`${analytics?.totalConverted ?? 0} converted to members`}
          accent="border-l-green-500"
        />
        <KpiTile
          label="Overdue Follow-Ups"
          value={fuStats?.overdue ?? 0}
          sub={`${fuStats?.dueToday ?? 0} due today`}
          accent={fuStats?.overdue > 0 ? "border-l-red-500" : "border-l-gray-300"}
        />
      </div>

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
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No data yet</div>
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
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No pipeline data yet</div>
          )}
        </SectionCard>
      </div>

      {/* Second Row: Overdue + Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overdue Follow-Ups */}
        <SectionCard title={`Overdue Follow-Ups (${fuStats?.overdue ?? 0})`}>
          {(fuStats?.overdueList || []).length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400">No overdue follow-ups</div>
          ) : (
            <div className="space-y-2">
              {(fuStats?.overdueList || []).slice(0, 5).map((fu) => (
                <div key={fu._id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-xs truncate">
                      {fu.prospect?.firstName} {fu.prospect?.lastName}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Scheduled {fmtDate(fu.scheduledDate)} · {fu.type}
                    </div>
                  </div>
                  <span className="rounded-full bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5">Overdue</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Upcoming Events */}
        <SectionCard title="Upcoming Outreaches">
          {upcoming.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400">No upcoming events</div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((ev) => (
                <div
                  key={ev._id}
                  onClick={() => toPage("outreach-event-details", { id: ev._id })}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-xs font-bold">
                    {new Date(ev.date).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-xs truncate">{ev.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{ev.location || ev.area || "—"}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_STYLES[ev.status] || "bg-gray-100 text-gray-600"}`}>{ev.status}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{analytics?.followUpRate ?? 0}%</div>
          <div className="text-xs text-gray-500 mt-1">Follow-Up Completion Rate</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">{analytics?.totalConverted ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Converted to Members</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{analytics?.totalVisitors ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Marked as Visitors</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{fuStats?.completedThisMonth ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Follow-Ups Done This Month</div>
        </div>
      </div>
    </div>
  );
}
