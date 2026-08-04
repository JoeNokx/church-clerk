import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  BarChart, Bar
} from "recharts";

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

  const hasGender = Array.isArray(genderData) && genderData.some((d) => d.value > 0);
  const hasAge = Array.isArray(ageGroupData) && ageGroupData.some((d) => d.value > 0);

  const attData = attView === "sundays" ? (last10SundaysGraph || []) : (attendanceGraph || []);
  const attXKey = attView === "sundays" ? "label" : "month";

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
        <circle cx={x} cy={y} r={13} fill="white" opacity={0.9} />
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
                {attView === "sundays" ? "Last 10 Sunday services · hover for details" : `Monthly totals · ${year}`}
              </div>
            </div>
            <div className="flex items-center rounded-lg bg-gray-100 p-0.5 shrink-0">
              <button type="button" onClick={() => setAttView("sundays")} className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${attView === "sundays" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>Sundays</button>
              <button type="button" onClick={() => setAttView("month")} className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${attView === "month" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>{year}</button>
            </div>
          </div>
          <div className="mt-2 flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attData} margin={{ top: 6, right: 12, left: -14, bottom: -8 }}>
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
          </div>
        </div>

        {/* Age Group donut */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm flex flex-col">
          <div className="font-semibold text-gray-800 text-sm">Age Groups</div>
          <div className="mt-0.5 text-gray-400 text-xs">All members by age</div>
          {hasAge ? (
            <>
              <div className="mt-2 h-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ value: 1 }]} dataKey="value" cx="50%" cy="50%" innerRadius={24} outerRadius={80} fill="#e2e8f0" stroke="none" isAnimationActive={false} startAngle={0} endAngle={360} />
                    <Pie data={ageGroupData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={28} outerRadius={76} paddingAngle={4} labelLine={false} label={AgeLabelRenderer}>
                      {(ageGroupData || []).map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TS} formatter={(v, n) => [`${v} members`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5">
                {(ageGroupData || []).map((g) => (
                  <div key={g.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                    <span className="flex-1 text-xs text-gray-500">{g.name}</span>
                    <span className="text-xs font-semibold text-gray-900">{g.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
              <div className="text-gray-300 text-3xl mb-1">◑</div>
              <div className="text-gray-400 text-xs">No age group data yet</div>
            </div>
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
          <div className="mt-3 flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={membersVsVisitorsGraph || []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%" barGap={4}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => String(v || "").slice(0, 3)} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TS} labelStyle={LS} cursor={{ fill: "#f9fafb" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="newMembers" name="New Members" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="visitors" name="Visitors" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender semi-donut — bigger, same structure as age group card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm flex flex-col">
          <div className="font-semibold text-gray-800 text-sm">Gender Distribution</div>
          <div className="mt-0.5 text-gray-400 text-xs">All members</div>
          {hasGender ? (
            <>
              <div className="mt-2 h-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={genderData} dataKey="value" nameKey="name" startAngle={180} endAngle={0} innerRadius={16} outerRadius={82} paddingAngle={2} cx="50%" cy="90%">
                      {(genderData || []).map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TS} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5">
                {(genderData || []).map((g) => (
                  <div key={g.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                    <span className="flex-1 text-xs text-gray-500">{g.name}</span>
                    <span className="text-xs font-semibold text-gray-900">{g.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
              <div className="text-gray-300 text-3xl mb-1">◔</div>
              <div className="text-gray-400 text-xs">No gender data yet</div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default DashboardCharts;
