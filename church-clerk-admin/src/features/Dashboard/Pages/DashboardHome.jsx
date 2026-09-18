import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

import { useAuth } from "../../Auth/useAuth.js";
import { getAdminDashboardStats, getSystemAuditLogs } from "../../SystemAdmin/Services/systemAdmin.api.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import KpiStatCard from "../../../shared/components/KpiStatCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import Card from "../../../shared/components/Card/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";

const fmt = (n) => Number(n || 0).toLocaleString();
const fmtGhs = (n) => `GHS ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function trendPct(current, prev) {
  if (!prev) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}

const STATUS_COLORS = {
  Active: "#3b82f6",
  Trial: "#8b5cf6",
  "Past Due": "#f59e0b",
  Suspended: "#ef4444",
  Cancelled: "#6b7280",
};

const PLAN_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-gray-200" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-64 rounded-xl bg-gray-200" />
        <div className="h-64 rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}

function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadAudit = useCallback(async (pg = 1) => {
    setAuditLoading(true);
    try {
      const res = await getSystemAuditLogs({ limit: 7, page: pg });
      setAuditLogs(Array.isArray(res?.data?.logs) ? res.data.logs : []);
      setAuditPagination(res?.data?.pagination || null);
      setAuditPage(pg);
    } catch { setAuditLogs([]); }
    finally { setAuditLoading(false); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes] = await Promise.allSettled([getAdminDashboardStats()]);
      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value?.data?.data || null);
        setLastUpdated(new Date());
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadAudit(1); }, [load, loadAudit]);

  const d = stats || {};
  const churches = d.churches || {};
  const subs = d.subscriptions || {};
  const rev = d.revenue || {};

  const statusDonut = [
    { name: "Active", value: subs.active || 0 },
    { name: "Trial", value: subs.trial || 0 },
    { name: "Past Due", value: subs.pastDue || 0 },
    { name: "Suspended", value: subs.suspended || 0 },
    { name: "Cancelled", value: subs.cancelled || 0 },
  ].filter((s) => s.value > 0);

  const quickLinks = [
    { label: "Churches", path: "/admin/churches", color: "bg-blue-50 text-blue-700 border-blue-100", icon: "🏛" },
    { label: "Billing", path: "/admin/billing/subscriptions", color: "bg-purple-50 text-purple-700 border-purple-100", icon: "💳" },
    { label: "Users", path: "/admin/users", color: "bg-green-50 text-green-700 border-green-100", icon: "👥" },
    { label: "Audit Log", path: "/admin/audit", color: "bg-amber-50 text-amber-700 border-amber-100", icon: "📋" },
    { label: "Announcements", path: "/admin/announcements", color: "bg-rose-50 text-rose-700 border-rose-100", icon: "📢" },
    { label: "Settings", path: "/admin/settings", color: "bg-slate-50 text-slate-700 border-slate-200", icon: "⚙️" },
  ];

  return (
    <div className="space-y-6 max-w-screen-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back, {user?.fullName || user?.email || "Admin"}
            {lastUpdated && (
              <span className="ml-2 text-gray-400">· Updated {lastUpdated.toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 shadow-sm"
        >
          <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading && !stats ? <Skeleton /> : (
        <>
          {/* KPI Cards */}
          <KpiGrid className="lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiStatCard
              label="Total Churches"
              value={fmt(churches.total)}
              subLabel={`${fmt(churches.hq)} HQ · ${fmt(churches.branches)} Branches`}
              change={trendPct(churches.thisMonth, churches.prevMonth)}
            />
            <KpiStatCard
              label="Active Subscriptions"
              value={fmt(subs.active)}
              subLabel={`${fmt(subs.trial)} on trial`}
            />
            <KpiStatCard
              label="Revenue (This Month)"
              value={fmtGhs(rev.thisMonth)}
              subLabel={`Prev: ${fmtGhs(rev.prevMonth)}`}
              change={trendPct(rev.thisMonth, rev.prevMonth)}
            />
            <KpiStatCard
              label="Total Members"
              value={fmt(d.members?.total)}
              subLabel="Across all churches"
            />
            <KpiStatCard
              label="New Churches (30d)"
              value={fmt(churches.thisMonth)}
              subLabel="Registered this month"
            />
            <KpiStatCard
              label="Total Users"
              value={fmt(d.users?.total)}
              subLabel="Admin + church users"
            />
          </KpiGrid>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue Bar Chart */}
            <Card className="lg:col-span-2 !gap-0">
              <Card.Header title="Revenue Trend" badge="Monthly collected payments (GHS)" badgeClass="bg-transparent !text-gray-500 !text-xs !font-normal !px-0" />
              {(d.revenueByMonth || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={d.revenueByMonth} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    />
                    <Tooltip
                      formatter={(v) => [fmtGhs(v), "Revenue"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState compact illustration="finance" title="No revenue data yet" description="Collected payments will appear here." />
              )}
            </Card>

            {/* Subscription Status Donut */}
            <Card className="!gap-0">
              <Card.Header title="Subscription Status" badge={`Total: ${fmt(subs.total)}`} badgeClass="bg-transparent !text-gray-500 !text-xs !font-normal !px-0" />
              {statusDonut.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusDonut}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusDonut.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, n) => [fmt(v), n]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState compact illustration="billing" title="No subscription data" description="Subscriptions will appear here." />
              )}
            </Card>
          </div>

          {/* Plan Distribution + Recent Churches */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Plan Distribution */}
            <Card className="!gap-0">
              <Card.Header title="Plan Distribution" badge="Subscriptions by plan" badgeClass="bg-transparent !text-gray-500 !text-xs !font-normal !px-0" />
              {(d.planDistribution || []).length > 0 ? (
                <div className="space-y-3">
                  {(d.planDistribution || []).map((p, i) => {
                    const total = (d.planDistribution || []).reduce((s, x) => s + x.count, 0) || 1;
                    const pct = Math.round((p.count / total) * 100);
                    return (
                      <div key={p.plan}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700 capitalize">{p.plan || "Unknown"}</span>
                          <span className="text-xs text-gray-500">{fmt(p.count)} ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState compact illustration="billing" title="No plan data" description="Plan distribution will appear here." />
              )}
            </Card>

            {/* Recent Churches */}
            <Card className="lg:col-span-2 !gap-0">
              <Card.Header
                title="Recent Registrations"
                badge="Latest 5 churches"
                badgeClass="bg-transparent !text-gray-500 !text-xs !font-normal !px-0"
                actions={
                  <button
                    type="button"
                    onClick={() => navigate("/admin/churches")}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    View all →
                  </button>
                }
              />
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-100">
                    <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                      <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Name</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Type</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Country</th>
                      <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Joined</th>
                      <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(d.recentChurches || []).length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <EmptyState compact illustration="generic" title="No churches yet" description="New registrations will appear here." />
                        </td>
                      </tr>
                    ) : (d.recentChurches || []).map((c) => (
                      <tr key={c?._id} className="max-md:text-xs text-gray-700 text-sm">
                        <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 font-medium whitespace-nowrap px-4 md:px-6" title={c?.name || ""}>
                          <span className="sm:hidden">{truncateMobileName(c?.name)}</span>
                          <span className="hidden sm:inline">{truncateDesktopName(c?.name)}</span>
                        </td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${c?.type === "Headquarters" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                            {c?.type || "—"}
                          </span>
                        </td>
                        <td className="max-md:px-4 py-1.5 text-gray-500 whitespace-nowrap px-4 md:px-6" title={c?.country || ""}>
                          <span className="sm:hidden">{truncateMobileName(c?.country)}</span>
                          <span className="hidden sm:inline">{truncateDesktopName(c?.country)}</span>
                        </td>
                        <td className="max-md:px-4 py-1.5 text-gray-400 whitespace-nowrap px-4 md:px-6">{c?.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
                        <td className="max-md:px-4 py-1.5 text-right whitespace-nowrap px-4 md:px-6">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/churches/${c._id}`)}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Recent Audit Activity */}
          <Card className="!gap-0">
            <Card.Header
              title="Recent Activity"
              badge={auditPagination?.total ? `${auditPagination.total.toLocaleString()} total events` : null}
              badgeClass="bg-transparent !text-gray-400 !text-xs !font-normal !px-0"
              actions={
                <button type="button" onClick={() => navigate("/admin/audit")}
                  className="text-xs font-semibold text-blue-600 hover:underline">View all →</button>
              }
            />

            {auditLoading ? (
              <div className="space-y-3 animate-pulse">
                {[0,1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-48 rounded bg-gray-200" />
                      <div className="h-2.5 w-24 rounded bg-gray-200" />
                    </div>
                    <div className="h-4 w-8 rounded-full bg-gray-200" />
                  </div>
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <EmptyState compact illustration="auditLogs" title="No recent activity" description="Audit events will appear here." />
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {auditLogs.map((log) => {
                    const statusOk = String(log?.status || "").toLowerCase() === "success";
                    const time = log?.createdAt
                      ? `${new Date(log.createdAt).toLocaleDateString()} ${new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : "";
                    return (
                      <div key={log?._id} className="flex items-start gap-3 py-2.5">
                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${statusOk ? "bg-green-400" : "bg-red-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-xs font-semibold text-gray-800">{log?.userName || log?.user?.fullName || "System"}</span>
                            <span className="text-[10px] rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-600">{log?.module || ""}</span>
                            <span className="text-[10px] rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700">{log?.action || ""}</span>
                            {log?.church?.name && <span className="text-[10px] text-gray-400">· {log.church.name}</span>}
                          </div>
                          <div className="mt-0.5 text-[10px] text-gray-400">{time}</div>
                        </div>
                        <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          statusOk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        }`}>{statusOk ? "OK" : "Fail"}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    Page {auditPage}{auditPagination?.totalPages ? ` / ${auditPagination.totalPages}` : ""}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => loadAudit(auditPage - 1)}
                      disabled={auditLoading || !auditPagination?.prevPage}
                      className="rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-50">
                      Prev
                    </button>
                    <button type="button" onClick={() => loadAudit(auditPage + 1)}
                      disabled={auditLoading || !auditPagination?.nextPage}
                      className="rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-50">
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="!gap-0">
            <Card.Header title="Quick Actions" />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {quickLinks.map((ql) => (
                <button
                  key={ql.path}
                  type="button"
                  onClick={() => navigate(ql.path)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-semibold hover:opacity-80 transition-opacity ${ql.color}`}
                >
                  <span className="text-xl">{ql.icon}</span>
                  {ql.label}
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default DashboardHome;
