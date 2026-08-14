import React, { useContext, useEffect, useMemo, useState } from "react";

import { useLocation } from "react-router-dom";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getDashboardAnalytics, getDashboardKPI, getDashboardWidgets, getDashboardWidgetsWithParams } from "../services/dashboard.api.js";

import { getUpcomingEvents } from "../../event/services/event.api.js";

import { getMyReferralCode, getMyReferralHistory } from "../../referral/services/referral.api.js";

import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";

import PermissionContext from "../../permissions/permission.store.js";

import ChurchContext from "../../church/church.store.js";

import AuthContext from "../../auth/auth.store.jsx";

import KpiCard from "../../../shared/components/KpiCard/index.jsx";


const DashboardCharts = React.lazy(() => import("../components/DashboardCharts.jsx"));


const OfferingFundsPage = React.lazy(() => import("../../offering/pages/OfferingFundsPage.jsx"));

const ReferralProgramPage = React.lazy(() => import("../../referral/pages/ReferralProgramPage.jsx"));

const TithePage = React.lazy(() => import("../../tithe/pages/TithePage.jsx"));

const AttendancePage = React.lazy(() => import("../../attendance/pages/AttendancePage.jsx"));

const MembersPage = React.lazy(() => import("../../member/pages/MembersPage.jsx"));

const MemberFormPage = React.lazy(() => import("../../member/pages/MemberFormPage.jsx"));

const MemberDetailsPage = React.lazy(() => import("../../member/pages/MemberDetailsPage.jsx"));

const ChurchProjectsPage = React.lazy(() => import("../../churchProject/pages/ChurchProjectsPage.jsx"));

const ChurchProjectDetailsPage = React.lazy(() => import("../../churchProject/pages/ChurchProjectDetailsPage.jsx"));

const BusinessVenturesPage = React.lazy(() => import("../../businessVentures/pages/BusinessVenturesPage.jsx"));

const BusinessVentureDetailsPage = React.lazy(() => import("../../businessVentures/pages/BusinessVentureDetailsPage.jsx"));

const ProgramsEventsPage = React.lazy(() => import("../../event/pages/ProgramsEventsPage.jsx"));

const EventDetailsPage = React.lazy(() => import("../../event/pages/EventDetailsPage.jsx"));

const MinistriesPage = React.lazy(() => import("../../ministries/pages/MinistriesPage.jsx"));

const MinistryDetailsPage = React.lazy(() => import("../../ministries/pages/MinistryDetailsPage.jsx"));

const BranchesOverviewPage = React.lazy(() => import("../../church/pages/BranchesOverviewPage.jsx"));

const WelfarePage = React.lazy(() => import("../../welfare/pages/WelfarePage.jsx"));

const ExpensesPage = React.lazy(() => import("../../expenses/pages/ExpensesPage.jsx"));

const BudgetingPage = React.lazy(() => import("../../budgeting/pages/BudgetingPage.jsx"));

const PledgesPage = React.lazy(() => import("../../pledge/pages/PledgesPage.jsx"));

const PledgeDetailsPage = React.lazy(() => import("../../pledge/pages/PledgeDetailsPage.jsx"));

const FinancialStatementPage = React.lazy(() => import("../../financialStatement/pages/FinancialStatementPage.jsx"));

const SettingsPage = React.lazy(() => import("../../settings/pages/SettingsPage.jsx"));

const ReportsAnalyticsPage = React.lazy(() => import("../../reportsAnalytics/pages/ReportsAnalyticsPage.jsx"));

const SupportHelpPage = React.lazy(() => import("../../supportHelp/pages/SupportHelpPage.jsx"));

const BillingPage = React.lazy(() => import("../../subscription/pages/BillingPage.jsx"));

const NotificationsPage = React.lazy(() => import("../../notifications/pages/NotificationsPage.jsx"));

const AnnouncementPage = React.lazy(() => import("../../announcement/pages/AnnouncementPage.jsx"));

const ApprovalsPage = React.lazy(() => import("../../governance/pages/ApprovalsPage.jsx"));

const OutreachPage = React.lazy(() => import("../../outreach/pages/OutreachPage.jsx"));

const OutreachEventDetailPage = React.lazy(() => import("../../outreach/pages/OutreachEventDetailPage.jsx"));


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

  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

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
      <div className="w-full bg-indigo-100 text-indigo-600 text-center font-bold py-0.5" style={{ fontSize: 8, letterSpacing: "0.05em" }}>{month}</div>
      <div className="text-gray-900 font-bold text-sm leading-none py-1 text-center w-full bg-white">{day}</div>
    </div>
  );
}

function formatTimeRange(from, to, legacy) {

  const f = String(from || "").trim();

  const t = String(to || "").trim();

  if (f && t) return `${f} - ${t}`;

  if (f) return f;

  if (t) return t;

  return legacy ? String(legacy) : "—";

}


function DashboardOverview({ onNavigate }) {

  const { toPage } = useDashboardNavigator();

  const { can } = useContext(PermissionContext) || {};

  const { user: authUser } = useContext(AuthContext) || {};

  const churchCtx = useContext(ChurchContext);

  const activeChurchId = churchCtx?.activeChurch?._id || null;

  const isMonitoringBranch = churchCtx?.isMonitoringBranch || false;
  const hqChurchId = churchCtx?.hqChurch?._id || null;
  const branchChurchIdCtx = churchCtx?.branchChurch?._id || null;

  const otherChurchId = useMemo(() => {
    if (!isMonitoringBranch || !activeChurchId || !hqChurchId || !branchChurchIdCtx) return null;
    if (String(activeChurchId) === String(branchChurchIdCtx)) return hqChurchId;
    if (String(activeChurchId) === String(hqChurchId)) return branchChurchIdCtx;
    return null;
  }, [isMonitoringBranch, activeChurchId, hqChurchId, branchChurchIdCtx]);

  const queryClient = useQueryClient();

  const canViewMembers = useMemo(() => (typeof can === "function" ? can("members", "view") : false), [can]);

  const canViewEvents = useMemo(() => (typeof can === "function" ? can("events", "view") : false), [can]);

  const year = useMemo(() => new Date().getFullYear(), []);

  const kpiQuery = useQuery({
    queryKey: ["dashboard", "kpi", activeChurchId],
    enabled: !!activeChurchId,
    staleTime: 0,
    queryFn: async () => {
      const res = await getDashboardKPI();
      return res?.data?.kpis || null;
    }
  });

  const analyticsQuery = useQuery({
    queryKey: ["dashboard", "analytics", activeChurchId, year],
    enabled: !!activeChurchId,
    staleTime: 0,
    queryFn: async () => {
      const res = await getDashboardAnalytics({ year });
      return res?.data?.analyticsDashboard || null;
    }
  });

  const widgetsQuery = useQuery({
    queryKey: ["dashboard", "widgets", activeChurchId],
    enabled: !!activeChurchId,
    staleTime: 0,
    queryFn: async () => {
      const res = await getDashboardWidgets();
      return res?.data?.dashboardWidget || null;
    }
  });

  const referralCodeQuery = useQuery({
    queryKey: ["referral", "code"],
    queryFn: async () => {
      const res = await getMyReferralCode();
      return res?.data || {};
    }
  });

  const referralHistoryQuery = useQuery({
    queryKey: ["referral", "history"],
    queryFn: async () => {
      const res = await getMyReferralHistory();
      return res?.data || {};
    }
  });

  const upcomingEventsQuery = useQuery({
    queryKey: ["dashboard", "upcoming-events", activeChurchId],
    enabled: !!activeChurchId,
    staleTime: 0,
    queryFn: async () => {
      const res = await getUpcomingEvents({ page: 1, limit: 6 });
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;
      const events = Array.isArray(data?.events) ? data.events : [];
      return events.slice(0, 6);
    }
  });

  useEffect(() => {
    if (!otherChurchId) return;
    const cid = String(otherChurchId);
    const y = year;
    void queryClient.prefetchQuery({
      queryKey: ["dashboard", "kpi", cid],
      staleTime: 2 * 60 * 1000,
      queryFn: () => getDashboardKPI({ churchId: cid }).then(r => r?.data?.kpis || null),
    });
    void queryClient.prefetchQuery({
      queryKey: ["dashboard", "analytics", cid, y],
      staleTime: 2 * 60 * 1000,
      queryFn: () => getDashboardAnalytics({ year: y }, { churchId: cid }).then(r => r?.data?.analyticsDashboard || null),
    });
    void queryClient.prefetchQuery({
      queryKey: ["dashboard", "widgets", cid],
      staleTime: 2 * 60 * 1000,
      queryFn: () => getDashboardWidgets({ churchId: cid }).then(r => r?.data?.dashboardWidget || null),
    });
    void queryClient.prefetchQuery({
      queryKey: ["dashboard", "upcoming-events", cid],
      staleTime: 2 * 60 * 1000,
      queryFn: () => getUpcomingEvents({ page: 1, limit: 6 }, { churchId: cid }).then(r => {
        const payload = r?.data?.data ?? r?.data;
        const data = payload?.data ?? payload;
        const events = Array.isArray(data?.events) ? data.events : [];
        return events.slice(0, 6);
      }),
    });
  }, [otherChurchId, queryClient, year]);

  const loading =
    kpiQuery.isLoading ||
    analyticsQuery.isLoading ||
    widgetsQuery.isLoading ||
    referralCodeQuery.isLoading ||
    referralHistoryQuery.isLoading ||
    upcomingEventsQuery.isLoading;
  const error =
    (kpiQuery.error && (kpiQuery.error?.response?.data?.message || kpiQuery.error?.message)) ||
    (analyticsQuery.error && (analyticsQuery.error?.response?.data?.message || analyticsQuery.error?.message)) ||
    (widgetsQuery.error && (widgetsQuery.error?.response?.data?.message || widgetsQuery.error?.message)) ||
    (referralCodeQuery.error && (referralCodeQuery.error?.response?.data?.message || referralCodeQuery.error?.message)) ||
    (referralHistoryQuery.error && (referralHistoryQuery.error?.response?.data?.message || referralHistoryQuery.error?.message)) ||
    (upcomingEventsQuery.error && (upcomingEventsQuery.error?.response?.data?.message || upcomingEventsQuery.error?.message)) ||
    "";

  const kpis = kpiQuery.data;
  const analytics = analyticsQuery.data;
  const widgets = widgetsQuery.data;

  const referral = useMemo(() => {
    const code = referralCodeQuery.data || {};
    const history = referralHistoryQuery.data || {};
    const referrals = Array.isArray(history?.referrals) ? history.referrals : [];
    return {
      totalReferrals: referrals.length,
      totalFreeMonthsEarned: Number(code?.totalFreeMonthsEarned || 0),
      totalFreeMonthsUsed: Number(code?.totalFreeMonthsUsed || 0),
      freeMonthsRemaining: Number(code?.freeMonthsRemaining || 0),
      referralBonusDays: Number(code?.referralBonusDays || 30)
    };
  }, [referralCodeQuery.data, referralHistoryQuery.data]);

  const upcomingEvents = Array.isArray(upcomingEventsQuery.data) ? upcomingEventsQuery.data : [];
  const upcomingEventsLoading = upcomingEventsQuery.isLoading;
  const upcomingEventsError =
    upcomingEventsQuery.error?.response?.data?.message ||
    upcomingEventsQuery.error?.message ||
    "";

  const [birthdaysModalOpen, setBirthdaysModalOpen] = useState(false);

  const [birthdaysModalLoading, setBirthdaysModalLoading] = useState(false);

  const [birthdaysModalError, setBirthdaysModalError] = useState("");

  const [allBirthdays, setAllBirthdays] = useState([]);

  const [birthdaysSearch, setBirthdaysSearch] = useState("");

  const [birthdaysPage, setBirthdaysPage] = useState(1);

  const [birthdaysMonthFilter, setBirthdaysMonthFilter] = useState("");


  const last10SundaysGraph = useMemo(() => {

    const rows = analytics?.last10SundaysGraph;

    if (!Array.isArray(rows)) return [];

    return rows.map((r) => ({

      date: r?.date || "",

      label: r?.label || "",

      totalAttendance: Number(r?.totalAttendance || 0),

      records: Array.isArray(r?.records) ? r.records : []

    }));

  }, [analytics]);



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

      { name: "Male", value: male, color: "#f59e0b" },

      { name: "Female", value: female, color: "#8b5cf6" }

    ];

  }, [analytics]);



  const ageGroupData = useMemo(() => {

    const rows = analytics?.ageGroupDistribution;

    if (!Array.isArray(rows)) return [];

    return rows.map((r) => ({ name: r.name, value: Number(r.value || 0), percentage: Number(r.percentage || 0), color: r.color }));

  }, [analytics]);



  const membersVsVisitorsGraph = useMemo(() => {

    const rows = analytics?.membersVsVisitorsGraph;

    if (!Array.isArray(rows)) return [];

    return rows.map((r) => ({ month: r.month, newMembers: Number(r.newMembers || 0), visitors: Number(r.visitors || 0) }));

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

    setBirthdaysMonthFilter("");

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

    if (!canViewMembers) return;

    if (!id) return;

    closeBirthdaysModal();

    toPage("member-details", { id }, { state: { from: "dashboard" } });

  };



  const goToEventDetails = (id) => {

    if (!canViewEvents) return;

    if (!id) return;

    toPage("event-details", { id }, { state: { from: "dashboard" } });

  };



  const filteredBirthdays = useMemo(() => {

    const q = String(birthdaysSearch || "").trim().toLowerCase();

    let rows = Array.isArray(allBirthdays) ? allBirthdays : [];

    if (birthdaysMonthFilter) {
      rows = rows.filter((m) => {
        const d = new Date(m?.nextBirthday);
        return !isNaN(d) && String(d.getMonth() + 1) === birthdaysMonthFilter;
      });
    }

    if (!q) return rows;

    return rows.filter((m) => {

      const name = `${m?.firstName || ""} ${m?.lastName || ""}`.trim().toLowerCase();

      return name.includes(q);

    });

  }, [allBirthdays, birthdaysSearch, birthdaysMonthFilter]);



  const birthdaysPageSize = 10;

  const birthdaysTotalPages = Math.max(1, Math.ceil(filteredBirthdays.length / birthdaysPageSize));

  const birthdaysSafePage = Math.min(Math.max(1, birthdaysPage), birthdaysTotalPages);

  const birthdaysSlice = useMemo(() => {

    const start = (birthdaysSafePage - 1) * birthdaysPageSize;

    return filteredBirthdays.slice(start, start + birthdaysPageSize);

  }, [filteredBirthdays, birthdaysSafePage]);



  if (loading) {

    return (

      <div className="w-full max-w-none">

        <div className="hidden md:block font-medium text-gray-900 md:text-2xl lg:text-3xl text-lg">Welcome back, {authUser?.fullName?.split(" ")[0] || "there"}!</div>

        <div className="hidden md:block mt-1 text-gray-500 text-sm">Here is a quick summary of what's happening with your church.</div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 lg:grid-cols-4">

          {[0, 1, 2, 3].map((i) => (

            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse md:p-6 lg:p-8">

              <div className="flex items-center gap-2">

                <div className="h-11 rounded-lg bg-gray-200 md:h-12 md:w-11 w-11 md:w-12" />

                <div className="h-4 w-24 rounded bg-gray-200" />

              </div>

              <div className="mt-3 h-11 w-20 rounded bg-gray-200 md:h-12" />

              <div className="mt-3 h-6 w-28 rounded-full bg-gray-200" />

            </div>

          ))}

        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">

          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 animate-pulse md:p-6 lg:p-8">

            <div className="h-4 w-32 rounded bg-gray-200" />

            <div className="mt-4 h-64 rounded-lg bg-gray-200" />

          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse md:p-6 lg:p-8">

            <div className="h-4 w-32 rounded bg-gray-200" />

            <div className="mt-4 h-64 rounded-lg bg-gray-200" />

          </div>

        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">

          {[0, 1, 2].map((i) => (

            <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden animate-pulse">

              <div className="border-b border-gray-200 bg-gray-50 px-4 md:px-5 lg:px-6 py-4">

                <div className="h-4 w-32 rounded bg-gray-200" />

                <div className="mt-1 h-3 w-20 rounded bg-gray-200" />

              </div>

              <div className="px-4 md:px-5 lg:px-6 pb-5 mt-4 space-y-3">

                {[0, 1, 2, 3].map((j) => (

                  <div key={j} className="flex items-center justify-between gap-3 py-1.5">

                    <div className="min-w-0">

                      <div className="h-4 w-24 rounded bg-gray-200" />

                      <div className="mt-1 h-3 w-16 rounded bg-gray-200" />

                    </div>

                    <div className="h-3 w-12 rounded bg-gray-200" />

                  </div>

                ))}

              </div>

            </div>

          ))}

        </div>

      </div>

    );

  }



  return (

    <div className="w-full max-w-none">

      <div className="hidden md:flex items-start justify-between gap-4">

        <div>

          <div className="font-medium text-gray-900 md:text-2xl lg:text-3xl text-lg">Welcome back, {authUser?.fullName?.split(" ")[0] || "there"}!</div>

          <div className="mt-1 text-gray-500 text-sm">Here is a quick summary of what's happening at {churchCtx?.activeChurch?.name || "your church"}.</div>

        </div>

        <button
          type="button"
          onClick={() => onNavigate("referrals")}
          className="shrink-0 mt-1 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2.5 md:py-2 font-semibold text-indigo-700 hover:bg-indigo-100 whitespace-nowrap text-sm"
        >
          🎁 Earn a free subscription
        </button>

      </div>



      {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}



      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

        <KpiCard
          title="Total Members"
          value={kpis?.totalMembers ?? 0}
          change={kpis?.change?.totalMembers}
          diff={kpis?.diff?.totalMembers}
          compareLabel="last month"
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
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
          title="Active Members"
          value={kpis?.currentMembers ?? 0}
          change={kpis?.change?.currentMembers}
          diff={kpis?.diff?.currentMembers}
          compareLabel="last month"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
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
          diff={kpis?.diff?.lastSundayAttendance}
          subtitle={kpis?.lastSundayInfo || ""}
          compareLabel="last Sunday"
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
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
          value={kpis?.newMembersThisMonth ?? 0}
          change={kpis?.change?.newMembersThisMonth}
          diff={kpis?.diff?.newMembersThisMonth}
          compareLabel="last month"
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 20c0-4 4-6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M20 11v6M17 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />

      </div>



      <div className="mt-5">

        <React.Suspense

          fallback={

            <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse md:p-6">

              <div className="h-4 w-32 rounded bg-gray-200" />

              <div className="mt-4 h-72 rounded-lg bg-gray-200" />

            </div>

          }

        >

          <DashboardCharts
            last10SundaysGraph={last10SundaysGraph}
            attendanceGraph={attendanceGraph}
            genderData={genderData}
            analytics={analytics}
            ageGroupData={ageGroupData}
            membersVsVisitorsGraph={membersVsVisitorsGraph}
            year={year}
          />

        </React.Suspense>

      </div>



      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">

        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">

          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">

            <div>

              <div className="font-semibold text-gray-900 text-sm">Recent Members</div>

              <div className="text-gray-500 text-xs">Members recently registered with your church</div>

            </div>

            <button

              type="button"

              onClick={() => onNavigate("members")}

              className="inline-flex items-center gap-0.5 text-gray-400 hover:text-blue-600 text-[11px]"

            >

              View All
              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2"><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>

            </button>

          </div>



          <div className="pb-2 overflow-x-auto">

            {recentMembers.length ? (

              <table className="w-full min-w-[520px] text-xs border-collapse">

                <thead>

                  <tr className="border-b border-gray-100">

                    <th className="sticky left-0 z-10 bg-white text-left py-2 pr-4 pl-3 font-semibold text-gray-400 uppercase tracking-wide text-[10px] whitespace-nowrap">Name</th>

                    <th className="text-left py-2 px-3 font-semibold text-gray-400 uppercase tracking-wide text-[10px] whitespace-nowrap">Phone</th>

                    <th className="text-left py-2 px-3 font-semibold text-gray-400 uppercase tracking-wide text-[10px] whitespace-nowrap">Age Group</th>

                    <th className="text-left py-2 px-3 font-semibold text-gray-400 uppercase tracking-wide text-[10px] whitespace-nowrap">City</th>

                    <th className="text-left py-2 pl-3 pr-3 font-semibold text-gray-400 uppercase tracking-wide text-[10px] whitespace-nowrap">Joined</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-50">

                  {recentMembers.map((m, idx) => (

                    <tr

                      key={`${m?._id || "rm"}-${idx}`}

                      className={`hover:bg-gray-50 group ${canViewMembers ? "cursor-pointer" : ""}`}

                      onClick={canViewMembers ? () => goToMemberDetails(m?._id) : undefined}

                    >

                      <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 py-2.5 pr-4 pl-3 whitespace-nowrap">

                        <div className="flex items-center gap-2">
                          {(m?.profileImageUrl || m?.photoUrl) ? (
                            <img src={m.profileImageUrl || m.photoUrl} alt="" className="h-7 w-7 rounded-full object-cover border border-gray-200 shrink-0" />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-[10px] shrink-0">
                              {(m?.firstName || "?").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <span className="font-semibold text-xs text-gray-900">
                            {`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || m?.fullName || "—"}
                          </span>
                        </div>

                      </td>

                      <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">{m?.phoneNumber || "—"}</td>

                      <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap capitalize">{m?.ageGroup || "—"}</td>

                      <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">{m?.city || "—"}</td>

                      <td className="py-2.5 pl-3 pr-3 text-gray-500 whitespace-nowrap">{formatRelativeTime(m?.createdAt || m?.dateJoined || m?.joinedAt)}</td>

                    </tr>

                  ))}

                </tbody>

              </table>

            ) : (

              <div className="px-3 pt-3 rounded-lg border border-gray-200 bg-gray-50 py-3 text-gray-600 text-sm mx-3 mt-2">No recent members yet.</div>

            )}

          </div>

        </div>

        <div className="lg:row-span-2 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5 shrink-0">
            <div>
              <div className="font-semibold text-gray-900 text-sm">Upcoming Birthdays</div>
              <div className="text-gray-500 text-xs">Sorted by soonest</div>
            </div>
            <button type="button" onClick={openBirthdaysModal} className="inline-flex items-center gap-0.5 text-gray-400 hover:text-blue-600 text-[11px]">
              View All
              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2"><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="px-3 pb-3 flex-1 overflow-hidden">
            <div className="mt-2 divide-y divide-gray-200">
              {upcomingBirthdays.length ? (
                upcomingBirthdays.map((m, idx) =>
                  canViewMembers ? (
                    <button key={`${m?._id || "b"}-${idx}`} type="button" onClick={() => goToMemberDetails(m?._id)} className="w-full text-left flex items-center gap-2.5 py-2 hover:bg-gray-50">
                      {(m?.profileImageUrl || m?.photoUrl) ? (
                        <img src={m.profileImageUrl || m.photoUrl} alt="" className="h-7 w-7 rounded-full object-cover border border-gray-200 shrink-0" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-[10px] shrink-0">
                          {(m?.firstName || "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 truncate text-xs">{`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "—"}</div>
                        <div className="text-gray-500 text-xs">{formatShortDate(m?.nextBirthday)}</div>
                      </div>
                      <div className="shrink-0 text-gray-600 text-[10px] font-medium whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5">{Number(m?.daysAway || 0)} day(s)</div>
                    </button>
                  ) : (
                    <div key={`${m?._id || "b"}-${idx}`} className="w-full flex items-center gap-2.5 py-2">
                      {(m?.profileImageUrl || m?.photoUrl) ? (
                        <img src={m.profileImageUrl || m.photoUrl} alt="" className="h-7 w-7 rounded-full object-cover border border-gray-200 shrink-0" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-[10px] shrink-0">
                          {(m?.firstName || "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 truncate text-xs">{`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "—"}</div>
                        <div className="text-gray-500 text-xs">{formatShortDate(m?.nextBirthday)}</div>
                      </div>
                      <div className="shrink-0 text-gray-600 text-[10px] font-medium whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5">{Number(m?.daysAway || 0)} day(s)</div>
                    </div>
                  )
                )
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600 text-sm">No upcoming birthdays.</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div>
              <div className="font-semibold text-gray-900 text-sm">Upcoming Programs</div>
              <div className="text-gray-500 text-xs">Next scheduled programs</div>
            </div>
            <button type="button" onClick={() => onNavigate("programs-events")} className="inline-flex items-center gap-0.5 text-gray-400 hover:text-blue-600 text-[11px]">
              View All
              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2"><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="px-3 pb-3">
            <div className="mt-2">
              {upcomingEventsLoading ? (
                <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 animate-pulse">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="h-4 w-28 rounded bg-gray-200" />
                        <div className="mt-1 h-3 w-20 rounded bg-gray-200" />
                      </div>
                      <div className="h-3 w-11 rounded bg-gray-200 md:w-12" />
                    </div>
                  ))}
                </div>
              ) : upcomingEventsError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{upcomingEventsError}</div>
              ) : upcomingEvents.length ? (
                <div className="divide-y divide-gray-200">
                  {upcomingEvents.map((ev, idx) => {
                    const evDate = ev?.dateFrom || ev?.startDate || ev?.date;
                    const daysLeft = getDaysUntil(evDate);
                    const daysLabel = daysLeft === null ? "" : daysLeft === 0 ? "Today" : daysLeft === 1 ? "1 day" : `${daysLeft} days`;
                    return canViewEvents ? (
                      <button key={`${ev?._id || "ev"}-${idx}`} type="button" onClick={() => goToEventDetails(ev?._id)} className="w-full text-left px-2 py-2 hover:bg-gray-50">
                        <div className="flex items-center gap-2.5">
                          <CalendarAvatar dateStr={evDate} />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 truncate text-xs">{ev?.title || ev?.name || "—"}</div>
                            <div className="text-gray-500 text-xs">{formatRange(evDate, ev?.dateTo || ev?.endDate)}</div>
                            <div className="text-gray-400 text-xs">{formatTimeRange(ev?.startTime, ev?.endTime, ev?.time)}{ev?.location ? ` • ${ev.location}` : ""}</div>
                          </div>
                          {daysLabel ? <div className="shrink-0 text-gray-600 text-[10px] font-medium whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5">{daysLabel}</div> : null}
                        </div>
                      </button>
                    ) : (
                      <div key={`${ev?._id || "ev"}-${idx}`} className="w-full px-2 py-2">
                        <div className="flex items-center gap-2.5">
                          <CalendarAvatar dateStr={evDate} />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 truncate text-xs">{ev?.title || ev?.name || "—"}</div>
                            <div className="text-gray-500 text-xs">{formatRange(evDate, ev?.dateTo || ev?.endDate)}</div>
                            <div className="text-gray-400 text-xs">{formatTimeRange(ev?.startTime, ev?.endTime, ev?.time)}{ev?.location ? ` • ${ev.location}` : ""}</div>
                          </div>
                          {daysLabel ? <div className="shrink-0 text-gray-600 text-[10px] font-medium whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5">{daysLabel}</div> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600 text-sm">No upcoming events.</div>
              )}
            </div>
          </div>
        </div>
      </div>



      {birthdaysModalOpen ? (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <button

            type="button"

            aria-label="Close birthdays modal"

            onClick={closeBirthdaysModal}

            className="absolute inset-0 bg-black/40"

          />



          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden flex flex-col">

            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-gray-50 py-4 px-4 md:px-6">

              <div>

                <div className="font-semibold text-gray-900 text-lg">Upcoming Birthdays</div>

                <div className="mt-1 text-gray-600 text-sm">All birthdays in the next 30 days</div>

              </div>

              <button

                type="button"

                onClick={closeBirthdaysModal}

                className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 shrink-0 md:h-12 md:w-12"

              >

                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-600">

                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                </svg>

              </button>

            </div>



            <div className="p-4 overflow-y-auto flex-1 md:p-6 lg:p-8">

              {birthdaysModalError ? (

                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{birthdaysModalError}</div>

              ) : null}



              <div className="flex items-center gap-2 flex-wrap">

                <input

                  value={birthdaysSearch}

                  onChange={(e) => {

                    setBirthdaysSearch(e.target.value);

                    setBirthdaysPage(1);

                  }}

                  placeholder="Search members"

                  className="flex-1 min-w-[160px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 text-sm"

                />

                <select

                  value={birthdaysMonthFilter}

                  onChange={(e) => { setBirthdaysMonthFilter(e.target.value); setBirthdaysPage(1); }}

                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm shrink-0"

                >

                  <option value="">All months</option>

                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((mo, i) => (

                    <option key={i + 1} value={String(i + 1)}>{mo}</option>

                  ))}

                </select>

              </div>



              <div className="mt-4">

                {birthdaysModalLoading ? (

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 animate-pulse space-y-3">

                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-3 py-1">
                        <div className="h-11 rounded-full bg-gray-200 md:h-12 md:w-11 w-11 md:w-12" />
                        <div className="h-4 w-24 rounded bg-gray-200" />
                        <div className="ml-auto h-3 w-16 rounded bg-gray-200" />
                      </div>
                    ))}

                  </div>

                ) : birthdaysSlice.length ? (

                  <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">

                    {birthdaysSlice.map((m, idx) =>

                      canViewMembers ? (

                        <button

                          key={`${m?._id || "bd"}-${idx}`}

                          type="button"

                          onClick={() => goToMemberDetails(m?._id)}

                          className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-gray-50"

                        >

                          {(m?.profileImageUrl || m?.photoUrl) ? (
                            <img src={m.profileImageUrl || m.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover border border-gray-200 shrink-0" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-sm shrink-0">
                              {(m?.firstName || "?").slice(0, 1).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">

                            <div className="font-semibold text-gray-900 truncate text-sm">{`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "—"}</div>

                            <div className="mt-0.5 text-gray-500 text-xs">{formatShortDate(m?.nextBirthday)}</div>

                          </div>

                          <div className="shrink-0 text-gray-600 text-xs font-medium whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1">{Number(m?.daysAway || 0)} day{Number(m?.daysAway || 0) === 1 ? "" : "s"}</div>

                        </button>

                      ) : (

                        <div

                          key={`${m?._id || "bd"}-${idx}`}

                          className="w-full flex items-center gap-3 px-4 py-3"

                        >

                          {(m?.profileImageUrl || m?.photoUrl) ? (
                            <img src={m.profileImageUrl || m.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover border border-gray-200 shrink-0" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-sm shrink-0">
                              {(m?.firstName || "?").slice(0, 1).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">

                            <div className="font-semibold text-gray-900 truncate text-sm">{`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "—"}</div>

                            <div className="mt-0.5 text-gray-500 text-xs">{formatShortDate(m?.nextBirthday)}</div>

                          </div>

                          <div className="shrink-0 text-gray-600 text-xs font-medium whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1">{Number(m?.daysAway || 0)} day{Number(m?.daysAway || 0) === 1 ? "" : "s"}</div>

                        </div>

                      )

                    )}

                  </div>

                ) : (

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600 text-sm">No birthdays found.</div>

                )}

              </div>

            </div>

            <div className="border-t border-gray-200 flex items-center justify-between px-4 py-3 gap-2 shrink-0 md:px-6">

              <div className="text-gray-500 text-sm">{filteredBirthdays.length} {filteredBirthdays.length === 1 ? "member" : "members"}</div>

              <div className="flex items-center gap-2">

                <button

                  type="button"

                  onClick={() => setBirthdaysPage((p) => Math.max(1, p - 1))}

                  disabled={birthdaysSafePage <= 1}

                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 disabled:opacity-50 text-sm"

                >

                  Prev

                </button>

                <div className="text-gray-600 text-sm">Page {birthdaysSafePage} of {birthdaysTotalPages}</div>

                <button

                  type="button"

                  onClick={() => setBirthdaysPage((p) => Math.min(birthdaysTotalPages, p + 1))}

                  disabled={birthdaysSafePage >= birthdaysTotalPages}

                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 disabled:opacity-50 text-sm"

                >

                  Next

                </button>

              </div>

            </div>

          </div>

        </div>

      ) : null}

    </div>

  );





}

function PageSkeletonFallback() {

  return (

    <div className="w-full max-w-none">

      <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse md:p-6 lg:p-8">

        <div className="h-5 w-48 rounded bg-gray-200" />

        <div className="mt-4 h-64 rounded-lg bg-gray-200" />

      </div>

    </div>

  );

}

function DashboardHome() {

    const location = useLocation();

    const { toPage } = useDashboardNavigator();

    const _churchCtx = useContext(ChurchContext);
    const _activeChurchId = _churchCtx?.activeChurch?._id || "default";



    const rawPage = new URLSearchParams(location.search).get("page") || "dashboard";

    const page = rawPage === "offering" ? "offerings" : rawPage;



  let PageComponent = null;



  if (page === "billing") PageComponent = BillingPage;

  if (page === "offerings" || page === "special-funds" || page === "offering-funds") PageComponent = OfferingFundsPage;

  if (page === "tithe") PageComponent = TithePage;

  if (page === "referrals") PageComponent = ReferralProgramPage;

  if (page === "attendance") PageComponent = AttendancePage;

  if (page === "members") PageComponent = MembersPage;

  if (page === "member-form") PageComponent = MemberFormPage;

  if (page === "member-details") PageComponent = MemberDetailsPage;

  if (page === "church-projects") PageComponent = ChurchProjectsPage;

  if (page === "church-project-details") PageComponent = ChurchProjectDetailsPage;

  if (page === "business-ventures") PageComponent = BusinessVenturesPage;

  if (page === "business-venture-details") PageComponent = BusinessVentureDetailsPage;

  if (page === "programs-events") PageComponent = ProgramsEventsPage;

  if (page === "event-details") PageComponent = EventDetailsPage;

  if (page === "ministries") PageComponent = MinistriesPage;

  if (page === "ministry-details") PageComponent = MinistryDetailsPage;

  if (page === "branches-overview") PageComponent = BranchesOverviewPage;

  if (page === "welfare") PageComponent = WelfarePage;

  if (page === "pledges") PageComponent = PledgesPage;

  if (page === "pledge-details") PageComponent = PledgeDetailsPage;

  if (page === "expenses") PageComponent = ExpensesPage;

  if (page === "budgeting") PageComponent = BudgetingPage;

  if (page === "financial-statement") PageComponent = FinancialStatementPage;

  if (page === "settings") PageComponent = SettingsPage;

  if (page === "reports-analytics") PageComponent = ReportsAnalyticsPage;

  if (page === "support-help") PageComponent = SupportHelpPage;

  if (page === "notifications") PageComponent = NotificationsPage;

  if (page === "announcements") PageComponent = AnnouncementPage;

  if (page === "approvals") PageComponent = ApprovalsPage;

  if (page === "outreach") PageComponent = OutreachPage;

  if (page === "outreach-event-details") PageComponent = OutreachEventDetailPage;



  if (PageComponent) {

    return (

      <React.Suspense fallback={<PageSkeletonFallback />}>

        <PageComponent />

      </React.Suspense>

    );

  }



  return (

    <DashboardOverview

      key={_activeChurchId}

      onNavigate={(targetPage) => {

        if (!targetPage) return;

        toPage(targetPage === "dashboard" ? "dashboard" : targetPage);

      }}

    />

  );

}



export default DashboardHome;