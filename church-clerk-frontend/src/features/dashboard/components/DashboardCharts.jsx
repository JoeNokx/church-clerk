import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  BarChart, Bar
} from "recharts";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";

const TS = { borderRadius: 12, borderColor: "#e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" };
const LS = { fontWeight: 600, color: "#111827" };

function SundayTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.07)", padding: "10px 14px", minWidth: 160 }}>
      <div style={{ fontWeight: 700, color: "#111827", marginBottom: 6, fontSize: 12 }}>{d?.label}</div>
      {(d?.records || []).map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 11, color: "#6b7280", marginTop: 3 }}>
          <span>{r.serviceType || "Service"}</span>
          <span style={{ fontWeight: 600, color: "#374151" }}>{r.totalNumber}</span>
        </div>
      ))}
      {(d?.records || []).length > 1 && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", fontSize: 11 }}>
          <span style={{ color: "#9ca3af" }}>Total</span>
          <span style={{ fontWeight: 700, color: "#6366f1" }}>{d?.totalAttendance}</span>
        </div>
      )}
    </div>
  );
}

function DashboardCharts({ last10SundaysGraph, attendanceGraph, genderData, ageGroupData, membersVsVisitorsGraph, year }) {
  const [attView, setAttView] = useState("sundays");
  const [genderHovered, setGenderHovered] = useState(null);
  const [sundayPage, setSundayPage] = useState(0);
  const [monthPage, setMonthPage] = useState(0);
  const [mvvPage, setMvvPage] = useState(0);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const h = () => setIsMobile(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const hasGender = Array.isArray(genderData) && genderData.some((d) => d.value > 0);
  const hasAge = Array.isArray(ageGroupData) && ageGroupData.some((d) => d.value > 0);

  const allSundayData = last10SundaysGraph || [];
  const allMonthData = attendanceGraph || [];
  const attData = attView === "sundays" ? allSundayData : allMonthData;
  const attXKey = attView === "sundays" ? "label" : "month";

  const SUNDAY_SIZE = 5;
  const MONTH_SIZE = 6;
  const totalSundayPages = Math.max(1, Math.ceil(allSundayData.length / SUNDAY_SIZE));
  const totalMonthPages = Math.max(1, Math.ceil(allMonthData.length / MONTH_SIZE));

  // sundays: page 0 = oldest 5, last page = most recent 5
  const sundayPageData = allSundayData.slice(sundayPage * SUNDAY_SIZE, (sundayPage + 1) * SUNDAY_SIZE);
  // months: page 0 = Jan-Jun, page 1 = Jul-Dec
  const monthPageData = allMonthData.slice(monthPage * MONTH_SIZE, (monthPage + 1) * MONTH_SIZE);

  const canGoLeft = attView === "sundays" ? sundayPage > 0 : monthPage > 0;
  const canGoRight = attView === "sundays" ? (sundayPage + 1) < totalSundayPages : (monthPage + 1) < totalMonthPages;

  const handleGoLeft = () => {
    if (attView === "sundays") setSundayPage(p => Math.max(0, p - 1));
    else setMonthPage(p => Math.max(0, p - 1));
  };
  const handleGoRight = () => {
    if (attView === "sundays") setSundayPage(p => Math.min(totalSundayPages - 1, p + 1));
    else setMonthPage(p => Math.min(totalMonthPages - 1, p + 1));
  };

  // start sundays at most-recent page when data loads
  useEffect(() => {
    if (allSundayData.length > 0) setSundayPage(Math.max(0, totalSundayPages - 1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSundayData.length]);

  // mobile chart data (paginated); desktop shows full set
  const chartData = isMobile
    ? (attView === "sundays" ? sundayPageData : monthPageData)
    : attData;

  // New Members vs Visitors pagination (mobile only, 6 per page)
  const allMvvData = membersVsVisitorsGraph || [];
  const totalMvvPages = Math.max(1, Math.ceil(allMvvData.length / MONTH_SIZE));
  const mvvPageData = allMvvData.slice(mvvPage * MONTH_SIZE, (mvvPage + 1) * MONTH_SIZE);

  const hasAttData = Array.isArray(attData) && attData.some((d) => Number(d?.totalAttendance) > 0);
  const hasMvvData = Array.isArray(allMvvData) && allMvvData.some((d) => Number(d?.newMembers) > 0 || Number(d?.visitors) > 0);

  function AgeLabelRenderer(props) {
    const { cx, cy, midAngle, outerRadius, percent, name } = props;
    if (!percent) return null;
    const RADIAN = Math.PI / 180;
    const r = outerRadius;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    const entry = (ageGroupData || []).find((d) => d.name === name);
    const color = entry?.color || "#6b7280";
    const pct = Math.round(percent * 100);
    if (!pct) return null;
    return (
      <g>
        <circle cx={x} cy={y} r={13} fill="white" opacity={0.95} style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.13))" }} />
        <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill={color}>{pct}%</text>
      </g>
    );
  }

  return (
    <div className="space-y-4">

      {/* Row 1 — Attendance chart + Age Group donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">

        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm flex flex-col min-h-[320px]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-gray-800 text-sm">Sundays Attendance Trends</div>
              <div className="mt-0.5 text-gray-400 text-xs">
                {attView === "sundays" ? "Last 10 Sunday services." : `Monthly totals · ${year}`}
              </div>
            </div>
            <div className="flex items-center rounded-lg bg-gray-100 p-0.5 shrink-0">
              <button type="button" onClick={() => setAttView("sundays")} className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${attView === "sundays" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>Sundays</button>
              <button type="button" onClick={() => setAttView("month")} className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${attView === "month" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>{year}</button>
            </div>
          </div>
          <div className="mt-2 flex-1 min-h-0 relative">
            {hasAttData ? (
            <>
            {/* Mobile: left chevron — vertically centred */}
            <button
              type="button"
              onClick={handleGoLeft}
              disabled={!canGoLeft}
              aria-label="Previous"
              className="md:hidden absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-7 w-7 inline-flex items-center justify-center rounded-full bg-white/90 shadow border border-gray-200 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
            </button>
            {/* Mobile: right chevron — vertically centred */}
            <button
              type="button"
              onClick={handleGoRight}
              disabled={!canGoRight}
              aria-label="Next"
              className="md:hidden absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-7 w-7 inline-flex items-center justify-center rounded-full bg-white/90 shadow border border-gray-200 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
            </button>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 12, left: -14, bottom: -8 }}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey={attXKey} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={attView === "month" ? (v) => String(v || "").slice(0, 3) : undefined} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} domain={[0, (mx) => Math.max(10, Math.ceil((Number(mx) || 0) * 1.25))]} axisLine={false} tickLine={false} />
                {attView === "sundays" ? (
                  <Tooltip content={<SundayTooltip />} cursor={{ stroke: "#6366f1", strokeWidth: 1, strokeDasharray: "4 2" }} />
                ) : (
                  <Tooltip contentStyle={TS} labelStyle={LS} cursor={{ stroke: "#6366f1", strokeWidth: 1, strokeDasharray: "4 2" }} />
                )}
                <Area type="monotone" dataKey="totalAttendance" name="Attendance" stroke="#6366f1" strokeWidth={1.4} fill="url(#attGrad)" dot={false} activeDot={{ r: 5, fill: "#6366f1" }} />
              </AreaChart>
            </ResponsiveContainer>
            </>
            ) : (
              <EmptyState compact illustration="attendance" title="No attendance data yet" description="Sunday attendance trends will appear here once services are recorded." />
            )}
          </div>
        </div>

        {/* Age Group donut */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm flex flex-col">
          <div className="font-semibold text-gray-800 text-sm">Age Groups</div>
          <div className="mt-0.5 text-gray-400 text-xs">All active and inactive members by age</div>
          {hasAge ? (
            <>
              <div className="mt-2 h-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ value: 1 }]} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={88} fill="#e2e8f0" stroke="none" isAnimationActive={false} startAngle={0} endAngle={360} />
                    <Pie data={ageGroupData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={84} paddingAngle={4} labelLine={false} label={AgeLabelRenderer}>
                      {(ageGroupData || []).map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TS} formatter={(v, n) => [`${v} members`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5">
                {(ageGroupData || []).map((g) => (
                  <div key={g.name} className="flex items-center gap-1 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                    <span className="text-xs text-gray-500 truncate">{g.name}</span>
                    <span className="text-xs font-semibold text-gray-900 ml-1 shrink-0">{g.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState compact illustration="chart" title="No age group data yet" description="Age group breakdown will appear once you have members." />
          )}
        </div>
      </div>

      {/* Row 2 — Bar chart + Gender donut (equal heights via matching donut card structure) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm flex flex-col min-h-[320px]">
          <div>
            <div className="font-semibold text-gray-800 text-sm">New Members vs Visitors</div>
            <div className="mt-0.5 text-gray-400 text-xs">Monthly comparison · {year}</div>
          </div>
          <div className="mt-3 flex-1 min-h-0 relative">
            {hasMvvData ? (
            <>
            {/* Mobile: left chevron */}
            <button
              type="button"
              onClick={() => setMvvPage(p => Math.max(0, p - 1))}
              disabled={mvvPage === 0}
              aria-label="Previous"
              className="md:hidden absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-7 w-7 inline-flex items-center justify-center rounded-full bg-white/90 shadow border border-gray-200 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
            </button>
            {/* Mobile: right chevron */}
            <button
              type="button"
              onClick={() => setMvvPage(p => Math.min(totalMvvPages - 1, p + 1))}
              disabled={(mvvPage + 1) >= totalMvvPages}
              aria-label="Next"
              className="md:hidden absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-7 w-7 inline-flex items-center justify-center rounded-full bg-white/90 shadow border border-gray-200 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
            </button>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={isMobile ? mvvPageData : (membersVsVisitorsGraph || [])} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="18%" barGap={3}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => String(v || "").slice(0, 3)} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TS} labelStyle={LS} cursor={{ fill: "#f9fafb" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="newMembers" name="New Members" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={44} />
                <Bar dataKey="visitors" name="Visitors" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
            </>
            ) : (
              <EmptyState compact illustration="chart" title="No data yet" description="New members and visitors will appear here as they're added." />
            )}
          </div>
        </div>

        {/* Gender Distribution — horizontal compact bars */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm flex flex-col">
          <div className="font-semibold text-gray-800 text-sm">Gender Distribution</div>
          <div className="mt-0.5 text-gray-400 text-xs">All active and inactive members</div>
          {hasGender ? (
            <div className="mt-4 flex flex-col justify-center flex-1 gap-4">
              {(() => {
                const total = (genderData || []).reduce((s, d) => s + (d.value || 0), 0);
                return (genderData || []).map((g) => {
                  const pct = total > 0 ? Math.round((g.value / total) * 100) : 0;
                  return (
                    <div key={g.name}>
                      <div
                        className="relative w-full bg-gray-100 rounded-xl overflow-hidden"
                        style={{ height: 64 }}
                        onMouseEnter={() => setGenderHovered(g.name)}
                        onMouseLeave={() => setGenderHovered(null)}
                      >
                        <div style={{ width: `${pct}%`, backgroundColor: g.color, height: "100%", borderRadius: 12, transition: "width 0.6s ease" }} />
                        {genderHovered === g.name && (
                          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "white", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.07)", padding: "8px 12px", zIndex: 10, whiteSpace: "nowrap", pointerEvents: "none" }}>
                            <div style={{ fontWeight: 700, color: "#111827", marginBottom: 3, fontSize: 12 }}>{g.name}</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{g.value} members ({pct}%)</div>
                          </div>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                          <span className="text-xs font-semibold text-gray-700">{g.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">{g.value} ({pct}%)</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <EmptyState compact illustration="chart" title="No gender data yet" description="Gender breakdown will appear once you have members." />
          )}
        </div>
      </div>

    </div>
  );
}

export default DashboardCharts;
