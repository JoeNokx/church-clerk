import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { getOutreachAnalytics, getOutreachKPI, getFollowUpsStats } from "../../services/outreach.api.js";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#14b8a6", "#8b5cf6"];

function StatCard({ label, value, sub, accent = "blue" }) {
  const map = { blue: "border-l-blue-500 text-blue-700", green: "border-l-green-500 text-green-700", purple: "border-l-purple-500 text-purple-700", amber: "border-l-amber-500 text-amber-700", red: "border-l-red-500 text-red-700" };
  const cls = map[accent] || map.blue;
  return (
    <div className={`rounded-xl border bg-white p-4 border-l-4 ${cls.split(" ")[0]}`}>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
      <div className={`mt-1 font-bold tabular-nums text-2xl ${cls.split(" ")[1]}`}>{value ?? "—"}</div>
      {sub ? <div className="mt-0.5 text-xs text-gray-400">{sub}</div> : null}
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

const STAGE_LABELS = {
  reached: "Reached", contacted: "Contacted", interested: "Interested",
  "visited-church": "Visited Church", connected: "Connected",
  "new-believer": "New Believer", member: "Member",
};

export default function ReportsTab() {
  const [kpi, setKpi] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [fuStats, setFuStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const load = useCallback(async (y = year) => {
    setLoading(true);
    try {
      const [kpiRes, analRes, fuRes] = await Promise.allSettled([
        getOutreachKPI(),
        getOutreachAnalytics({ year: y }),
        getFollowUpsStats(),
      ]);
      if (kpiRes.status === "fulfilled") setKpi(kpiRes.value?.data?.data || null);
      if (analRes.status === "fulfilled") setAnalytics(analRes.value?.data?.data || null);
      if (fuRes.status === "fulfilled") setFuStats(fuRes.value?.data?.data || null);
    } finally { setLoading(false); }
  }, [year]);

  useEffect(() => { load(); }, []);

  const monthlyChart = analytics?.monthlyChart || [];
  const pipelineChart = (analytics?.pipelineChart || []).filter((s) => s.count > 0);
  const typeChart = (analytics?.typeDistribution || []).slice(0, 8);

  const CURRENT_YEAR = new Date().getFullYear();
  const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

  if (loading) {
    return (
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0,1].map(i => <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      {/* Year selector */}
      <div className="flex items-center gap-3">
        <div className="text-sm font-semibold text-gray-600">Year:</div>
        <div className="flex gap-2">
          {YEARS.map((y) => (
            <button key={y} onClick={() => { setYear(y); load(y); }} className={`h-8 px-4 rounded-lg text-sm font-semibold transition-colors ${year === y ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{y}</button>
          ))}
        </div>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Events" value={kpi?.totalEvents ?? 0} sub={`${kpi?.eventsThisMonth ?? 0} this month`} accent="blue" />
        <StatCard label="People Reached" value={kpi?.totalProspects ?? 0} sub={`${kpi?.prospectsThisMonth ?? 0} this month`} accent="purple" />
        <StatCard label="Decisions / Salvations" value={kpi?.totalDecisions ?? 0} sub={`${analytics?.totalConverted ?? 0} became members`} accent="green" />
        <StatCard label="Follow-Up Rate" value={`${analytics?.followUpRate ?? 0}%`} sub={`${analytics?.fuCompleted ?? 0} of ${analytics?.fuTotal ?? 0} completed`} accent="amber" />
      </div>

      {/* Conversion Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Converted to Members" value={analytics?.totalConverted ?? 0} accent="green" />
        <StatCard label="Marked as Visitors" value={analytics?.totalVisitors ?? 0} accent="blue" />
        <StatCard label="Overdue Follow-Ups" value={fuStats?.overdue ?? 0} accent={fuStats?.overdue > 0 ? "red" : "blue"} />
        <StatCard label="Completed Follow-Ups" value={analytics?.fuCompleted ?? 0} sub={`in ${year}`} accent="purple" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trends */}
        <SectionCard title={`Monthly Trends — ${year}`}>
          {monthlyChart.some((m) => m.peopleReached > 0 || m.events > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyChart} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="peopleReached" name="People Reached" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="decisions" name="Decisions" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="events" name="Events" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">No data for {year}</div>
          )}
        </SectionCard>

        {/* People Reached by Month (bar) */}
        <SectionCard title="Monthly People Reached">
          {monthlyChart.some((m) => m.peopleReached > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyChart} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="peopleReached" name="People Reached" fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="decisions" name="Decisions" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">No data for {year}</div>
          )}
        </SectionCard>
      </div>

      {/* Second charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Outreach Type Distribution */}
        <SectionCard title="Events by Outreach Type">
          {typeChart.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={typeChart} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {typeChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 min-w-0">
                {typeChart.map((t, i) => (
                  <div key={t._id} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600 truncate capitalize">{(t._id || "other").replace(/-/g, " ")}</span>
                    <span className="ml-auto font-semibold text-gray-800 shrink-0">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400">No events recorded</div>
          )}
        </SectionCard>

        {/* Journey Pipeline */}
        <SectionCard title="Journey Pipeline Distribution">
          {pipelineChart.length > 0 ? (
            <div className="space-y-2.5">
              {pipelineChart.map((s, i) => {
                const maxCount = Math.max(...pipelineChart.map((x) => x.count), 1);
                const pct = Math.round((s.count / maxCount) * 100);
                const pctOfTotal = analytics?.monthlyChart
                  ? Math.round((s.count / (kpi?.totalProspects || 1)) * 100)
                  : 0;
                return (
                  <div key={s.stage} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-gray-500 text-right shrink-0">{STAGE_LABELS[s.stage] || s.stage}</div>
                    <div className="flex-1 h-5 rounded-lg bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-lg transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                    <div className="w-12 text-xs font-semibold text-gray-700 text-right shrink-0">{s.count} <span className="text-gray-400 font-normal">({pctOfTotal}%)</span></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400">No pipeline data yet</div>
          )}
        </SectionCard>
      </div>

      {/* Top locations */}
      {(analytics?.locationAgg || []).length > 0 ? (
        <SectionCard title="Top Outreach Locations">
          <div className="space-y-2">
            {(analytics?.locationAgg || []).map((loc, i) => (
              <div key={loc._id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                <div className="flex-1 font-semibold text-gray-800 text-sm">{loc._id || "Unknown"}</div>
                <div className="text-xs text-gray-500">{loc.count} event{loc.count !== 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
