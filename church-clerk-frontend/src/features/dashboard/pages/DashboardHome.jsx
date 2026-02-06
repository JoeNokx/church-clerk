import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";
import SpecialFundPage from "../../specialFund/pages/SpecialFundPage.jsx";
import ReferralProgramPage from "../../referral/pages/ReferralProgramPage.jsx";
import OfferingPage from "../../offering/pages/OfferingPage.jsx";
import TithePage from "../../tithe/pages/TithePage.jsx";
import AttendancePage from "../../attendance/pages/AttendancePage.jsx";
import MembersPage from "../../member/pages/MembersPage.jsx";
import MemberFormPage from "../../member/pages/MemberFormPage.jsx";
import MemberDetailsPage from "../../member/pages/MemberDetailsPage.jsx";
import ChurchProjectsPage from "../../churchProject/pages/ChurchProjectsPage.jsx";
import ChurchProjectDetailsPage from "../../churchProject/pages/ChurchProjectDetailsPage.jsx";
import ProgramsEventsPage from "../../event/pages/ProgramsEventsPage.jsx";
import EventDetailsPage from "../../event/pages/EventDetailsPage.jsx";
import MinistriesPage from "../../ministries/pages/MinistriesPage.jsx";
import MinistryDetailsPage from "../../ministries/pages/MinistryDetailsPage.jsx";
import { getDashboardAnalytics, getDashboardKPI, getDashboardWidgets, getDashboardWidgetsWithParams } from "../services/dashboard.api.js";
import { getUpcomingEvents } from "../../event/services/event.api.js";
import { getMembers } from "../../member/services/member.api.js";
import { getMyReferralCode, getMyReferralHistory } from "../../referral/services/referral.api.js";

function formatPercent(value) {
  const v = Number(value || 0);
  const rounded = Math.round(v * 10) / 10;
  const absRounded = Math.abs(rounded);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  return `${sign}${absRounded}%`;
}

function formatShortDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatLongDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatYmdLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatRelativeTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) return "—";

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffDays < 365) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
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

function formatTimeRange(from, to, legacy) {
  const f = String(from || "").trim();
  const t = String(to || "").trim();
  if (f && t) return `${f} - ${t}`;
  if (f) return f;
  if (t) return t;
  return legacy ? String(legacy) : "—";
}

function KpiCard({ title, value, change, subtitle, compareLabel, icon, onClick }) {
  const delta = Number(change || 0);
  const isUp = delta >= 0;
  const deltaText = formatPercent(delta);
  const deltaClass = isUp ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50";
  const arrow = isUp ? (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path fillRule="evenodd" d="M10 3a1 1 0 01.894.553l4 8a1 1 0 01-.894 1.447H6a1 1 0 01-.894-1.447l4-8A1 1 0 0110 3Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path fillRule="evenodd" d="M10 17a1 1 0 01-.894-.553l-4-8A1 1 0 015 7h10a1 1 0 01.894 1.447l-4 8A1 1 0 0110 17Z" clipRule="evenodd" />
    </svg>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-200 hover:bg-blue-50/30 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-gray-50 ring-1 ring-gray-200 flex items-center justify-center text-gray-700">
              {icon}
            </span>
            <div className="text-xs font-semibold text-gray-500">{title}</div>
          </div>

          <div className="mt-2 text-2xl font-semibold text-gray-900">{value ?? "—"}</div>
          {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}

          <div className="mt-3 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${deltaClass}`}>
              {arrow}
              <span>{deltaText}</span>
            </span>
            <span className="text-xs text-gray-500">{compareLabel || ""}</span>
          </div>
        </div>

        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-gray-300">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.24 4.24a.75.75 0 010 1.06l-4.24 4.24a.75.75 0 01-1.06.02z" clipRule="evenodd" />
        </svg>
      </div>
    </button>
  );
}

function DashboardOverview({ onNavigate }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kpis, setKpis] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [widgets, setWidgets] = useState(null);
  const [referral, setReferral] = useState(null);

  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [upcomingEventsLoading, setUpcomingEventsLoading] = useState(false);
  const [upcomingEventsError, setUpcomingEventsError] = useState("");

  const [newMembersThisMonthCount, setNewMembersThisMonthCount] = useState(null);

  const [birthdaysModalOpen, setBirthdaysModalOpen] = useState(false);
  const [birthdaysModalLoading, setBirthdaysModalLoading] = useState(false);
  const [birthdaysModalError, setBirthdaysModalError] = useState("");
  const [allBirthdays, setAllBirthdays] = useState([]);
  const [birthdaysSearch, setBirthdaysSearch] = useState("");
  const [birthdaysPage, setBirthdaysPage] = useState(1);

  const year = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError("");
      setLoading(true);

      setUpcomingEventsLoading(true);
      setUpcomingEventsError("");
      setNewMembersThisMonthCount(null);

      const fetchNewMembersThisMonth = async () => {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);

        const dateFrom = formatYmdLocal(from);
        const dateTo = formatYmdLocal(now);

        const limit = 1000;
        let page = 1;
        let total = 0;

        // We rely on backend paging shape (totalPages/currentPage/nextPage/prevPage).
        // This avoids fetching all members, only the current month.
        while (true) {
          const res = await getMembers({ page, limit, dateFrom, dateTo });
          const payload = res?.data?.data ?? res?.data;
          const rows = Array.isArray(payload?.members) ? payload.members : [];
          total += rows.length;

          const pagination = payload?.pagination || {};
          const nextPage = pagination?.nextPage;
          const totalPages = Number(pagination?.totalPages || 0);

          if (nextPage) {
            page = nextPage;
            continue;
          }

          if (totalPages && page < totalPages) {
            page += 1;
            continue;
          }

          break;
        }

        return total;
      };

      try {
        const [
          kpiResult,
          analyticsResult,
          widgetsResult,
          referralCodeResult,
          referralHistoryResult,
          upcomingEventsResult,
          newMembersThisMonthResult
        ] = await Promise.allSettled([
          getDashboardKPI(),
          getDashboardAnalytics({ year }),
          getDashboardWidgets(),
          getMyReferralCode(),
          getMyReferralHistory(),
          getUpcomingEvents({ page: 1, limit: 6 }),
          fetchNewMembersThisMonth()
        ]);

        if (cancelled) return;

        if (kpiResult.status !== "fulfilled") throw kpiResult.reason;
        if (analyticsResult.status !== "fulfilled") throw analyticsResult.reason;
        if (widgetsResult.status !== "fulfilled") throw widgetsResult.reason;

        const kpiRes = kpiResult.value;
        const analyticsRes = analyticsResult.value;
        const widgetsRes = widgetsResult.value;

        setKpis(kpiRes?.data?.kpis || null);
        setAnalytics(analyticsRes?.data?.analyticsDashboard || null);
        setWidgets(widgetsRes?.data?.dashboardWidget || null);

        if (!cancelled) {
          if (newMembersThisMonthResult.status === "fulfilled") {
            setNewMembersThisMonthCount(Number(newMembersThisMonthResult.value || 0));
          } else {
            setNewMembersThisMonthCount(null);
          }
        }

        if (!cancelled) {
          if (upcomingEventsResult.status === "fulfilled") {
            const res = upcomingEventsResult.value;
            const payload = res?.data?.data ?? res?.data;
            const data = payload?.data ?? payload;
            const events = Array.isArray(data?.events) ? data.events : [];
            setUpcomingEvents(events.slice(0, 6));
          } else {
            setUpcomingEvents([]);
            setUpcomingEventsError(
              upcomingEventsResult?.reason?.response?.data?.message ||
                upcomingEventsResult?.reason?.message ||
                "Failed to load upcoming events"
            );
          }
        }

        const code = referralCodeResult.status === "fulfilled" ? referralCodeResult.value?.data || {} : {};
        const history = referralHistoryResult.status === "fulfilled" ? referralHistoryResult.value?.data || {} : {};
        const referrals = Array.isArray(history.referrals) ? history.referrals : [];
        setReferral({
          totalReferrals: referrals.length,
          totalFreeMonthsEarned: Number(code.totalFreeMonthsEarned || 0),
          totalFreeMonthsUsed: Number(code.totalFreeMonthsUsed || 0),
          freeMonthsRemaining: Number(code.freeMonthsRemaining || 0)
        });
      } catch (e) {
        if (cancelled) return;
        setError(e?.response?.data?.message || e?.message || "Failed to load dashboard");
      } finally {
        if (cancelled) return;
        setLoading(false);
        setUpcomingEventsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const attendanceGraph = useMemo(() => {
    const rows = analytics?.attendanceGraph;
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({
      month: r?.month || "",
      totalAttendance: Number(r?.totalAttendance || 0)
    }));
  }, [analytics]);

  const genderData = useMemo(() => {
    const gd = analytics?.genderDistribution || {};
    const male = Number(gd?.male || 0);
    const female = Number(gd?.female || 0);
    return [
      { name: "Male", value: male, color: "#1d4ed8" },
      { name: "Female", value: female, color: "#f97316" }
    ];
  }, [analytics]);

  const upcomingBirthdays = useMemo(() => {
    const rows = widgets?.upcomingBirthdays;
    if (!Array.isArray(rows)) return [];
    return rows.slice(0, 6);
  }, [widgets]);

  const recentMembers = useMemo(() => {
    const rows = widgets?.recentMembers;
    if (!Array.isArray(rows)) return [];
    return rows.slice(0, 6);
  }, [widgets]);

  const openBirthdaysModal = async () => {
    setBirthdaysModalOpen(true);
    setBirthdaysSearch("");
    setBirthdaysPage(1);
    setBirthdaysModalError("");

    try {
      setBirthdaysModalLoading(true);
      const res = await getDashboardWidgetsWithParams({ birthdaysLimit: 0 });
      const payload = res?.data?.dashboardWidget || {};
      const rows = Array.isArray(payload?.upcomingBirthdays) ? payload.upcomingBirthdays : [];
      setAllBirthdays(rows);
    } catch (e) {
      setBirthdaysModalError(e?.response?.data?.message || e?.message || "Failed to load birthdays");
      setAllBirthdays([]);
    } finally {
      setBirthdaysModalLoading(false);
    }
  };

  const closeBirthdaysModal = () => {
    setBirthdaysModalOpen(false);
  };

  const goToMemberDetails = (id) => {
    if (!id) return;
    closeBirthdaysModal();
    navigate(`/dashboard?page=member-details&id=${id}`, { state: { from: "dashboard" } });
  };

  const goToEventDetails = (id) => {
    if (!id) return;
    navigate(`/dashboard?page=event-details&id=${id}`, { state: { from: "dashboard" } });
  };

  const filteredBirthdays = useMemo(() => {
    const q = String(birthdaysSearch || "").trim().toLowerCase();
    const rows = Array.isArray(allBirthdays) ? allBirthdays : [];
    if (!q) return rows;
    return rows.filter((m) => {
      const name = `${m?.firstName || ""} ${m?.lastName || ""}`.trim().toLowerCase();
      return name.includes(q);
    });
  }, [allBirthdays, birthdaysSearch]);

  const birthdaysPageSize = 10;
  const birthdaysTotalPages = Math.max(1, Math.ceil(filteredBirthdays.length / birthdaysPageSize));
  const birthdaysSafePage = Math.min(Math.max(1, birthdaysPage), birthdaysTotalPages);
  const birthdaysSlice = useMemo(() => {
    const start = (birthdaysSafePage - 1) * birthdaysPageSize;
    return filteredBirthdays.slice(start, start + birthdaysPageSize);
  }, [filteredBirthdays, birthdaysSafePage]);

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="text-2xl font-semibold text-gray-900">Dashboard Overview</div>
        <div className="mt-2 text-sm text-gray-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Dashboard Overview</div>
          <div className="mt-1 text-sm text-gray-600">Track key metrics, attendance trends, and member insights.</div>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Members"
          value={kpis?.totalMembers ?? 0}
          change={kpis?.change?.totalMembers}
          compareLabel="vs last month"
          onClick={() => onNavigate("members")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 20c0-3 2-5 5-5h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M21 20c0-3-2-5-5-5h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M8 20c0-3 1.8-5 4-5s4 2 4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          title="Current Members"
          value={kpis?.currentMembers ?? 0}
          change={kpis?.change?.currentMembers}
          compareLabel="vs last month"
          onClick={() => onNavigate("members")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M17 11l1.5 1.5L21 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="This Sunday Attendance"
          value={kpis?.lastSundayAttendance ?? 0}
          change={kpis?.change?.lastSundayAttendance}
          subtitle={kpis?.lastSundayInfo || ""}
          compareLabel="vs last Sunday"
          onClick={() => onNavigate("attendance")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M7 3v3M17 3v3M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          title="New Members This Month"
          value={typeof newMembersThisMonthCount === "number" ? newMembersThisMonthCount : kpis?.newMembersThisMonth ?? 0}
          change={kpis?.change?.newMembersThisMonth}
          compareLabel="vs last month"
          onClick={() => onNavigate("members")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 20c0-4 4-6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M20 11v6M17 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">Attendance Trends</div>
              <div className="mt-1 text-sm text-gray-600">Sundays attendance totals by month ({year})</div>
            </div>
          </div>

          <div className="mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceGraph} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0} tickFormatter={(v) => String(v || "").slice(0, 3)} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  domain={[0, (dataMax) => Math.max(10, Math.ceil((Number(dataMax || 0) || 0) * 1.25))]}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }}
                  labelStyle={{ fontWeight: 600, color: "#111827" }}
                />
                <Line type="monotone" dataKey="totalAttendance" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-sm font-semibold text-gray-900">Gender Distribution</div>
          <div className="mt-1 text-sm text-gray-600">Active members breakdown</div>

          <div className="mt-2 h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2}>
                  {genderData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 p-2.5">
              <div className="text-xs font-semibold text-gray-500">Male</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{analytics?.genderDistribution?.male ?? 0}</div>
              <div className="mt-1 text-xs text-gray-500">{analytics?.genderDistribution?.malePercentage ?? 0}%</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-2.5">
              <div className="text-xs font-semibold text-gray-500">Female</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{analytics?.genderDistribution?.female ?? 0}</div>
              <div className="mt-1 text-xs text-gray-500">{analytics?.genderDistribution?.femalePercentage ?? 0}%</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">Upcoming Birthdays</div>
              <div className="mt-1 text-sm text-gray-600">Next 30 days</div>
            </div>
            <button
              type="button"
              onClick={openBirthdaysModal}
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="px-5 pb-5">
            <div className="mt-4 divide-y divide-gray-200">
              {upcomingBirthdays.length ? (
                upcomingBirthdays.map((m, idx) => (
                  <button
                    key={`${m?._id || "b"}-${idx}`}
                    type="button"
                    onClick={() => goToMemberDetails(m?._id)}
                    className="w-full text-left flex items-center justify-between gap-3 py-1.5 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "—"}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{formatShortDate(m?.nextBirthday)}</div>
                    </div>
                    <div className="text-xs font-semibold text-gray-700">{Number(m?.daysAway || 0)} day{Number(m?.daysAway || 0) === 1 ? "" : "s"}</div>
                  </button>
                ))
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">No upcoming birthdays.</div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">Recent Members</div>
              <div className="mt-1 text-sm text-gray-600">Latest registrations</div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("members")}
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="px-5 pb-5">
            <div className="mt-4 divide-y divide-gray-200">
              {recentMembers.length ? (
                recentMembers.map((m, idx) => (
                  <button
                    key={`${m?._id || "m"}-${idx}`}
                    type="button"
                    onClick={() => goToMemberDetails(m?._id)}
                    className="w-full text-left flex items-start justify-between gap-3 py-1.5 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "—"}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{formatRelativeTime(m?.createdAt || m?.dateJoined)}</div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        String(m?.status || "").toLowerCase() === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {String(m?.status || "—")}
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">No recent members.</div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">Upcoming Events</div>
              <div className="mt-1 text-sm text-gray-600">Programs &amp; Events module</div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("programs-events")}
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="px-5 pb-5">
            {upcomingEventsLoading && !upcomingEvents.length ? (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">Loading…</div>
            ) : upcomingEventsError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{upcomingEventsError}</div>
            ) : upcomingEvents.length ? (
              <div className="mt-4 divide-y divide-gray-200">
                {upcomingEvents.map((ev, idx) => (
                  <button
                    key={`${ev?._id || "ev"}-${idx}`}
                    type="button"
                    onClick={() => goToEventDetails(ev?._id)}
                    className="w-full text-left py-2 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{ev?.title || "—"}</div>
                        <div className="mt-0.5 text-xs text-gray-500 truncate">
                          {formatRange(ev?.dateFrom, ev?.dateTo)}
                          {" "}•{" "}
                          {formatTimeRange(ev?.timeFrom, ev?.timeTo, ev?.time)}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs font-semibold text-gray-700 truncate max-w-[40%]">{ev?.venue || "—"}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">No upcoming events.</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/30 p-5">
        <div className="flex items-center justify-end gap-4 flex-wrap md:flex-nowrap">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-white ring-1 ring-blue-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-blue-700">
                <path d="M12 3l8 4v10l-8 4-8-4V7l8-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-blue-900">Referral Program</div>
              <div className="mt-1 text-sm text-blue-900/80">Free 1 month per referral</div>
              <div className="mt-2 text-sm text-blue-900/80">
                Share church clerk management system with other churches and earn a reward of going free month without paying, and help grow the kingdom of God and establish a good church management system across churches
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-blue-100 bg-white/70 px-2 py-1.5 sm:w-40">
                  <div className="text-xs font-semibold text-blue-900/70">Total Referrals</div>
                  <div className="mt-1 text-base font-semibold text-blue-900">{referral?.totalReferrals ?? 0}</div>
                </div>
                <div className="rounded-lg border border-blue-100 bg-white/70 px-2 py-1.5 sm:w-40">
                  <div className="text-xs font-semibold text-blue-900/70">Total Free Months</div>
                  <div className="mt-1 text-base font-semibold text-blue-900">{referral?.totalFreeMonthsEarned ?? 0}</div>
                </div>
                <div className="rounded-lg border border-blue-100 bg-white/70 px-2 py-1.5 sm:w-44">
                  <div className="text-xs font-semibold text-blue-900/70">Free Months Remaining</div>
                  <div className="mt-1 text-base font-semibold text-blue-900">{referral?.freeMonthsRemaining ?? 0}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate("referrals")}
              className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              View Referrals
            </button>
          </div>
        </div>
      </div>

      {birthdaysModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Upcoming Birthdays</div>
                <div className="mt-1 text-xs text-gray-500">Next 30 days</div>
              </div>
              <button
                type="button"
                onClick={closeBirthdaysModal}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <input
                  value={birthdaysSearch}
                  onChange={(e) => {
                    setBirthdaysSearch(e.target.value);
                    setBirthdaysPage(1);
                  }}
                  placeholder="Search by name..."
                  className="w-full sm:max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                />

                <div className="text-sm text-gray-600">Page {birthdaysSafePage} of {birthdaysTotalPages}</div>
              </div>

              {birthdaysModalLoading ? (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">Loading…</div>
              ) : birthdaysModalError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{birthdaysModalError}</div>
              ) : (
                <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200">
                  <div className="divide-y divide-gray-200">
                    {birthdaysSlice.length ? (
                      birthdaysSlice.map((m, idx) => (
                        <button
                          key={`${m?._id || "bm"}-${idx}`}
                          type="button"
                          onClick={() => goToMemberDetails(m?._id)}
                          className="w-full text-left px-4 py-1.5 hover:bg-gray-50 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "—"}</div>
                            <div className="mt-0.5 text-xs text-gray-500">{formatShortDate(m?.nextBirthday)}</div>
                          </div>
                          <div className="text-xs font-semibold text-gray-700">{Number(m?.daysAway || 0)} day{Number(m?.daysAway || 0) === 1 ? "" : "s"}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-600">No birthdays found.</div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBirthdaysPage((p) => Math.max(1, p - 1))}
                  disabled={birthdaysSafePage <= 1}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setBirthdaysPage((p) => Math.min(birthdaysTotalPages, p + 1))}
                  disabled={birthdaysSafePage >= birthdaysTotalPages}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardHome() {
  const location = useLocation();
  const navigate = useNavigate();

  const rawPage = new URLSearchParams(location.search).get("page") || "dashboard";
  const page = rawPage === "offering" ? "offerings" : rawPage;

  useEffect(() => {
    if (page === "billing") {
      navigate("/dashboard/billing", { replace: true });
    }
  }, [navigate, page]);

  if (page === "special-funds") {
    return <SpecialFundPage />;
  }

  if (page === "offerings") {
    return <OfferingPage />;
  }

  if (page === "tithe") {
    return <TithePage />;
  }

  if (page === "referrals") {
    return <ReferralProgramPage />;
  }

  if (page === "attendance") {
    return <AttendancePage />;
  }

  if (page === "members") {
    return <MembersPage />;
  }

  if (page === "member-form") {
    return <MemberFormPage />;
  }

  if (page === "member-details") {
    return <MemberDetailsPage />;
  }

  if (page === "church-projects") {
    return <ChurchProjectsPage />;
  }

  if (page === "church-project-details") {
    return <ChurchProjectDetailsPage />;
  }

  if (page === "programs-events") {
    return <ProgramsEventsPage />;
  }

  if (page === "event-details") {
    return <EventDetailsPage />;
  }

  if (page === "ministries") {
    return <MinistriesPage />;
  }

  if (page === "ministry-details") {
    return <MinistryDetailsPage />;
  }

  if (page === "billing") return null;

  return (
    <DashboardOverview
      onNavigate={(targetPage) => {
        if (!targetPage) return;
        if (targetPage === "dashboard") {
          navigate("/dashboard");
          return;
        }
        navigate(`/dashboard?page=${targetPage}`);
      }}
    />
  );
}

export default DashboardHome;