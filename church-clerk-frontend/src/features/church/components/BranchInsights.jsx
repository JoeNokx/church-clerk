import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import { formatMoney, formatCompactMoney } from "../../../shared/utils/formatMoney.js";

const TS = { borderRadius: 12, borderColor: "#e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.07)", fontSize: 12 };
const LS = { fontWeight: 600, color: "#111827" };
const PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#f97316", "#64748b", "#84cc16", "#14b8a6"];
const ACTIVE_SUB_STATUSES = ["free trial", "trialing", "active", "past_due"];

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function daysSince(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return Math.floor((Date.now() - dt.getTime()) / (24 * 60 * 60 * 1000));
}

function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 md:p-5 flex flex-col ${className}`}>
      <div className="font-semibold text-gray-900 text-sm">{title}</div>
      {subtitle ? <div className="mt-0.5 text-gray-400 text-xs">{subtitle}</div> : null}
      <div className="mt-3 flex-1 min-h-0">{children}</div>
    </div>
  );
}

function SubBadge({ status }) {
  const s = String(status || "none").toLowerCase();
  const map = {
    active: "bg-green-100 text-green-700",
    "free trial": "bg-blue-100 text-blue-700",
    trialing: "bg-blue-100 text-blue-700",
    past_due: "bg-amber-100 text-amber-700",
    suspended: "bg-red-100 text-red-700",
    cancelled: "bg-gray-200 text-gray-600",
    none: "bg-gray-100 text-gray-500",
  };
  const label = s === "none" ? "No subscription" : s === "past_due" ? "Past due" : s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-xs ${map[s] || "bg-gray-100 text-gray-600"}`}>
      {label}
    </span>
  );
}

function StatusDonut({ data }) {
  const rows = (data || []).filter((d) => d.value > 0);
  const total = rows.reduce((s, d) => s + d.value, 0);
  if (!total) {
    return <EmptyState compact illustration="chart" title="No member data yet" description="Member status breakdown will appear once branches add members." />;
  }
  return (
    <>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={40} outerRadius={78} paddingAngle={3} labelLine={false}>
              {rows.map((entry, i) => (
                <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TS} formatter={(v, n) => [`${Number(v).toLocaleString()} members`, n]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5">
        {rows.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 min-w-0">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            <span className="text-xs text-gray-500 truncate capitalize">{d.name}</span>
            <span className="text-xs font-semibold text-gray-900 ml-auto shrink-0">{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function MembersByBranchChart({ branches }) {
  const rows = useMemo(
    () =>
      [...(branches || [])]
        .sort((a, b) => (b?.members?.total || 0) - (a?.members?.total || 0))
        .slice(0, 8)
        .map((b) => ({ name: b.name, members: b.members?.total || 0 })),
    [branches]
  );
  if (!rows.length || !rows.some((r) => r.members > 0)) {
    return <EmptyState compact illustration="chart" title="No members yet" description="Member counts per branch will appear here." />;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 34)}>
      <BarChart layout="vertical" data={rows} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TS} labelStyle={LS} cursor={{ fill: "#f9fafb" }} formatter={(v) => [`${Number(v).toLocaleString()} members`, "Members"]} />
        <Bar dataKey="members" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AttendanceTrendChart({ monthly }) {
  const rows = useMemo(() => {
    const m = monthly || {};
    return (m.months || []).map((month, i) => ({
      month,
      attendance: Number(m.attendance?.[i] || 0),
      services: Number(m.services?.[i] || 0),
    }));
  }, [monthly]);
  if (!rows.some((r) => r.attendance > 0)) {
    return <EmptyState compact illustration="attendance" title="No attendance data yet" description="Combined branch attendance trends will appear here once services are recorded." />;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={rows} margin={{ top: 6, right: 12, left: -14, bottom: -8 }}>
        <defs>
          <linearGradient id="brAttGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.42} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={TS}
          labelStyle={LS}
          cursor={{ stroke: "#6366f1", strokeWidth: 1, strokeDasharray: "4 2" }}
          formatter={(v, n) => (n === "Attendance" ? [Number(v).toLocaleString(), n] : [v, n])}
        />
        <Area type="monotone" dataKey="attendance" name="Attendance" stroke="#6366f1" strokeWidth={1.4} fill="url(#brAttGrad)" dot={false} activeDot={{ r: 5, fill: "#6366f1" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function FinanceByBranchChart({ branches, currency }) {
  const rows = useMemo(
    () =>
      [...(branches || [])]
        .sort((a, b) => (b?.finance?.incomeThisMonth || 0) + (b?.finance?.expenseThisMonth || 0) - ((a?.finance?.incomeThisMonth || 0) + (a?.finance?.expenseThisMonth || 0)))
        .slice(0, 8)
        .map((b) => ({
          name: b.name,
          income: b.finance?.incomeThisMonth || 0,
          expenses: b.finance?.expenseThisMonth || 0,
        })),
    [branches]
  );
  if (!rows.some((r) => r.income > 0 || r.expenses > 0)) {
    return <EmptyState compact illustration="chart" title="No finance data yet" description="Branch income and expenses for this month will appear here." />;
  }
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={rows} margin={{ top: 4, right: 8, left: -4, bottom: 0 }} barCategoryGap="18%" barGap={3}>
        <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={0} tickFormatter={(v) => String(v || "").slice(0, 8)} />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactMoney(v, "")} />
        <Tooltip contentStyle={TS} labelStyle={LS} cursor={{ fill: "#f9fafb" }} formatter={(v, n) => [formatMoney(v, currency), n]} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function NewMembersChart({ monthly }) {
  const rows = useMemo(() => {
    const m = monthly || {};
    return (m.months || []).map((month, i) => ({ month, count: Number(m.newMembers?.[i] || 0) }));
  }, [monthly]);
  if (!rows.some((r) => r.count > 0)) {
    return <EmptyState compact illustration="members" title="No new members" description="New member joiners over the last 6 months will appear here." />;
  }
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={rows} margin={{ top: 4, right: 8, left: -22, bottom: -6 }}>
        <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TS} labelStyle={LS} cursor={{ fill: "#f9fafb" }} formatter={(v) => [`${Number(v).toLocaleString()}`, "New members"]} />
        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function branchFlags(b) {
  const flags = [];
  const members = Number(b?.members?.total || 0) || Number(b?.memberCount || 0);
  if (!members) flags.push({ label: "No members recorded", tone: "red" });
  if (!Number(b?.attendance?.servicesLast30d || 0)) {
    const d = daysSince(b?.attendance?.lastServiceDate);
    flags.push({
      label: d == null ? "No attendance ever recorded" : `No attendance in ${d} days`,
      tone: "amber",
    });
  }
  const sub = String(b?.subscription?.status || "none").toLowerCase();
  if (!ACTIVE_SUB_STATUSES.includes(sub)) {
    flags.push({ label: sub === "none" ? "No subscription" : `Subscription ${sub.replace(/_/g, " ")}`, tone: "red" });
  }
  return flags;
}

const TONE = {
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
};

function AttentionList({ branches, onViewBranch }) {
  const flagged = useMemo(
    () =>
      (branches || [])
        .map((b) => ({ branch: b, flags: branchFlags(b) }))
        .filter((x) => x.flags.length)
        .sort((a, b) => b.flags.length - a.flags.length),
    [branches]
  );

  if (!flagged.length) {
    return (
      <div className="flex h-full min-h-[120px] flex-col items-center justify-center text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <div className="mt-2 font-semibold text-gray-800 text-sm">All branches look healthy</div>
        <div className="mt-0.5 text-gray-400 text-xs">No missing members, attendance or subscription issues.</div>
      </div>
    );
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {flagged.map(({ branch, flags }) => (
        <div key={branch._id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-gray-800 text-xs">{branch.name}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {flags.map((f, i) => (
                <span key={i} className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[11px] ${TONE[f.tone]}`}>
                  {f.label}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onViewBranch?.(branch)}
            className="shrink-0 rounded-md border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
          >
            View
          </button>
        </div>
      ))}
    </div>
  );
}

function UpcomingEvents({ events }) {
  const list = events || [];
  if (!list.length) {
    return <EmptyState compact illustration="events" title="No upcoming events" description="Upcoming branch events will appear here." />;
  }
  return (
    <div className="space-y-2">
      {list.map((e) => (
        <div key={e._id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2">
          <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <span className="font-bold text-sm leading-none">{new Date(e.dateFrom).getDate()}</span>
            <span className="text-[10px] font-semibold uppercase leading-tight">{new Date(e.dateFrom).toLocaleString("en", { month: "short" })}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-gray-800 text-xs">{e.title}</div>
            <div className="truncate text-gray-400 text-[11px]">{e.branchName}{e.venue ? ` · ${e.venue}` : ""}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BranchOverviewTab({ data, currency, onViewBranch }) {
  const branches = data?.branches || [];
  const totals = data?.totals || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "New members this month", value: Number(totals.newMembersThisMonth || 0).toLocaleString() },
          { label: "Attendance (last 30 days)", value: Number(totals.attendanceLast30d || 0).toLocaleString() },
          { label: "Net this month", value: formatMoney(totals.netThisMonth || 0, currency) },
          { label: "Upcoming events", value: Number(totals.upcomingEvents || 0).toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-gray-500 text-xs">{s.label}</div>
            <div className="mt-1 font-bold text-gray-900 text-lg">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Attendance trend" subtitle="Combined attendance across all branches · last 6 months" className="lg:col-span-2 min-h-[280px]">
          <AttendanceTrendChart monthly={data?.charts?.monthly} />
        </Card>
        <Card title="Needs attention" subtitle="Branches with missing data or inactive subscriptions">
          <AttentionList branches={branches} onViewBranch={onViewBranch} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Members by branch" subtitle="Top branches by recorded members" className="lg:col-span-2">
          <MembersByBranchChart branches={branches} />
        </Card>
        <Card title="Upcoming events" subtitle="Next events across all branches">
          <UpcomingEvents events={data?.upcomingEvents} />
        </Card>
      </div>
    </div>
  );
}

export function BranchMembershipTab({ data, onViewBranch }) {
  const branches = data?.branches || [];
  const totalMembers = Number(data?.totals?.members || 0);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 p-4">
          <div className="font-semibold text-gray-900 text-sm">Membership by branch</div>
          <div className="mt-0.5 text-gray-400 text-xs">Recorded members, active status and new joiners this month</div>
        </div>
        {!branches.length ? (
          <EmptyState illustration="ministries" title="No branches yet" description="Branches of your church will appear here once they're added." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left font-semibold text-gray-500 text-xs">
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Branch</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Members</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Active</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">New (month)</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Visitors</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Share</th>
                  <th className="px-4 py-2 text-right whitespace-nowrap md:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...branches]
                  .sort((a, b) => (b?.members?.total || 0) - (a?.members?.total || 0))
                  .map((b) => {
                    const share = totalMembers ? Math.round(((b?.members?.total || 0) / totalMembers) * 100) : 0;
                    return (
                      <tr key={b._id} className="text-gray-700 text-sm">
                        <td className="px-4 py-2 text-gray-900 whitespace-nowrap md:px-6">
                          <div className="font-medium">{b.name}</div>
                          <div className="text-gray-400 text-xs">{[b.city, b.region].filter(Boolean).join(", ")}</div>
                        </td>
                        <td className="px-4 py-2 font-semibold text-blue-700 whitespace-nowrap md:px-6">{Number(b?.members?.total || 0).toLocaleString()}</td>
                        <td className="px-4 py-2 whitespace-nowrap md:px-6">{Number(b?.members?.active || 0).toLocaleString()}</td>
                        <td className="px-4 py-2 whitespace-nowrap md:px-6">
                          {Number(b?.members?.newThisMonth || 0) > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700 text-xs">
                              +{Number(b.members.newThisMonth).toLocaleString()}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap md:px-6">{Number(b?.members?.visitors || 0).toLocaleString()}</td>
                        <td className="px-4 py-2 whitespace-nowrap md:px-6">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, share)}%` }} />
                            </div>
                            <span className="text-gray-500 text-xs">{share}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap md:px-6">
                          <div className="flex justify-end">
                            <button type="button" onClick={() => onViewBranch?.(b)} className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs">
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="space-y-4">
        <Card title="Member status" subtitle="All branch members by status">
          <StatusDonut data={data?.charts?.memberStatus} />
        </Card>
        <Card title="New members" subtitle="Joined across all branches · last 6 months">
          <NewMembersChart monthly={data?.charts?.monthly} />
        </Card>
      </div>
    </div>
  );
}

export function BranchAttendanceTab({ data, onViewBranch }) {
  const branches = data?.branches || [];
  return (
    <div className="space-y-4">
      <Card title="Combined attendance trend" subtitle="Total recorded attendance across all branches · last 6 months">
        <AttendanceTrendChart monthly={data?.charts?.monthly} />
      </Card>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 p-4">
          <div className="font-semibold text-gray-900 text-sm">Attendance by branch</div>
          <div className="mt-0.5 text-gray-400 text-xs">Latest recorded service and activity over the last 30 days</div>
        </div>
        {!branches.length ? (
          <EmptyState illustration="attendance" title="No branches yet" description="Branches of your church will appear here once they're added." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left font-semibold text-gray-500 text-xs">
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Branch</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Last service</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Attendance</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Services (30d)</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Avg / service (30d)</th>
                  <th className="px-4 py-2 text-right whitespace-nowrap md:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...branches]
                  .sort((a, b) => new Date(b?.attendance?.lastServiceDate || 0) - new Date(a?.attendance?.lastServiceDate || 0))
                  .map((b) => {
                    const stale = !Number(b?.attendance?.servicesLast30d || 0);
                    return (
                      <tr key={b._id} className="text-gray-700 text-sm">
                        <td className="px-4 py-2 text-gray-900 whitespace-nowrap md:px-6">
                          <div className="font-medium">{b.name}</div>
                          <div className="text-gray-400 text-xs">{[b.city, b.region].filter(Boolean).join(", ")}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap md:px-6">
                          {b?.attendance?.lastServiceDate ? (
                            <>
                              <div>{fmtDate(b.attendance.lastServiceDate)}</div>
                              <div className="text-gray-400 text-xs">{b.attendance.lastServiceType || "Service"}</div>
                            </>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-2 font-semibold text-blue-700 whitespace-nowrap md:px-6">
                          {b?.attendance?.lastServiceDate ? Number(b.attendance.lastServiceTotal || 0).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap md:px-6">
                          {stale ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 text-xs">None</span>
                          ) : (
                            Number(b.attendance.servicesLast30d).toLocaleString()
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap md:px-6">{Number(b?.attendance?.avgLast30d || 0).toLocaleString()}</td>
                        <td className="px-4 py-2 whitespace-nowrap md:px-6">
                          <div className="flex justify-end">
                            <button type="button" onClick={() => onViewBranch?.(b)} className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs">
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function BranchFinancesTab({ data, currency, onViewBranch }) {
  const branches = data?.branches || [];
  const categories = (data?.charts?.incomeByCategory || []).filter((d) => d.value > 0);
  const catTotal = categories.reduce((s, d) => s + d.value, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Income vs expenses" subtitle={`This month · ${currency}`} className="lg:col-span-2">
          <FinanceByBranchChart branches={branches} currency={currency} />
        </Card>
        <Card title="Income by category" subtitle={`This month · ${currency}`}>
          {catTotal ? (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} dataKey="value" nameKey="name" innerRadius={40} outerRadius={78} paddingAngle={3} labelLine={false}>
                      {categories.map((entry, i) => (
                        <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TS} formatter={(v, n) => [formatMoney(v, currency), n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {categories.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                    <span className="text-xs text-gray-500 truncate">{d.name}</span>
                    <span className="text-xs font-semibold text-gray-900 ml-auto shrink-0">{formatMoney(d.value, currency)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState compact illustration="chart" title="No income recorded" description="Income categories for this month will appear here." />
          )}
        </Card>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 p-4">
          <div className="font-semibold text-gray-900 text-sm">Finances by branch</div>
          <div className="mt-0.5 text-gray-400 text-xs">Income and expenses recorded this month, in each branch's currency</div>
        </div>
        {!branches.length ? (
          <EmptyState illustration="ministries" title="No branches yet" description="Branches of your church will appear here once they're added." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left font-semibold text-gray-500 text-xs">
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Branch</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Income</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Expenses</th>
                  <th className="px-4 py-2 whitespace-nowrap md:px-6">Net</th>
                  <th className="px-4 py-2 text-right whitespace-nowrap md:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...branches]
                  .sort((a, b) => (b?.finance?.incomeThisMonth || 0) - (a?.finance?.incomeThisMonth || 0))
                  .map((b) => {
                    const net = Number(b?.finance?.netThisMonth || 0);
                    const cur = b?.currency || currency;
                    return (
                      <tr key={b._id} className="text-gray-700 text-sm">
                        <td className="px-4 py-2 text-gray-900 whitespace-nowrap md:px-6">
                          <div className="font-medium">{b.name}</div>
                          <div className="text-gray-400 text-xs">{[b.city, b.region].filter(Boolean).join(", ")}</div>
                        </td>
                        <td className="px-4 py-2 text-green-700 whitespace-nowrap md:px-6">{formatMoney(b?.finance?.incomeThisMonth || 0, cur)}</td>
                        <td className="px-4 py-2 text-rose-600 whitespace-nowrap md:px-6">{formatMoney(b?.finance?.expenseThisMonth || 0, cur)}</td>
                        <td className={`px-4 py-2 font-semibold whitespace-nowrap md:px-6 ${net < 0 ? "text-rose-600" : "text-gray-900"}`}>
                          {formatMoney(net, cur)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap md:px-6">
                          <div className="flex justify-end">
                            <button type="button" onClick={() => onViewBranch?.(b)} className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs">
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
