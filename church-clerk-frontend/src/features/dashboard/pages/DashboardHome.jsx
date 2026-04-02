import React, { useContext, useEffect, useMemo, useState } from "react";

import { useLocation } from "react-router-dom";

import Skeleton from "react-loading-skeleton";



import { getDashboardAnalytics, getDashboardKPI, getDashboardWidgets, getDashboardWidgetsWithParams } from "../services/dashboard.api.js";

import { getUpcomingEvents } from "../../event/services/event.api.js";

import { getMembers } from "../../member/services/member.api.js";

import { getMyReferralCode, getMyReferralHistory } from "../../referral/services/referral.api.js";

import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";

import PermissionContext from "../../permissions/permission.store.js";



const DashboardCharts = React.lazy(() => import("../components/DashboardCharts.jsx"));



const SpecialFundPage = React.lazy(() => import("../../specialFund/pages/SpecialFundPage.jsx"));

const ReferralProgramPage = React.lazy(() => import("../../referral/pages/ReferralProgramPage.jsx"));

const OfferingPage = React.lazy(() => import("../../offering/pages/OfferingPage.jsx"));

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

      className="w-full text-left rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-200 hover:bg-blue-50/30 transition"

    >

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <div className="flex items-center gap-2">

            <span className="h-8 w-8 rounded-lg bg-gray-50 ring-1 ring-gray-200 flex items-center justify-center text-gray-700">

              {icon}

            </span>

            <div className="text-sm font-semibold text-gray-500">{title}</div>

          </div>



          <div className="mt-3 text-3xl font-semibold text-gray-900">{value ?? "—"}</div>

          {subtitle ? <div className="mt-1 text-sm text-gray-500">{subtitle}</div> : null}



          <div className="mt-3 flex items-center gap-2">

            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-semibold ${deltaClass}`}>

              {arrow}

              <span>{deltaText}</span>

            </span>

            <span className="text-sm text-gray-500">{compareLabel || ""}</span>

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

  const { toPage } = useDashboardNavigator();

  const { can } = useContext(PermissionContext) || {};

  const canViewMembers = useMemo(() => (typeof can === "function" ? can("members", "view") : false), [can]);

  const canViewEvents = useMemo(() => (typeof can === "function" ? can("events", "view") : false), [can]);

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

      <div className="w-full max-w-none">

        <div className="text-2xl font-semibold text-gray-900">Dashboard Overview</div>

        <div className="mt-4">

          <Skeleton height={14} count={6} />

        </div>

      </div>

    );

  }



  return (

    <div className="w-full max-w-none">

      <div className="flex items-start justify-between gap-4">

        <div>

          <div className="text-2xl font-semibold text-gray-900">Dashboard Overview</div>

          <div className="mt-2 text-sm text-gray-600">A quick summary of what’s happening with your church.</div>

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

        <React.Suspense

          fallback={

            <>

              <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5">

                <div className="mt-1">

                  <Skeleton height={14} count={8} />

                </div>

              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5">

                <div className="mt-1">

                  <Skeleton height={14} count={8} />

                </div>

              </div>

            </>

          }

        >

          <DashboardCharts attendanceGraph={attendanceGraph} genderData={genderData} analytics={analytics} year={year} />

        </React.Suspense>



        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">

          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4">

            <div>

              <div className="text-base font-semibold text-gray-900">Upcoming Birthdays</div>

              <div className="mt-1 text-sm text-gray-600">Next 30 days</div>

            </div>

            <button

              type="button"

              onClick={openBirthdaysModal}

              className="text-base font-semibold text-blue-700 hover:underline"

            >

              View All

            </button>

          </div>



          <div className="px-5 pb-5">

            <div className="mt-4 divide-y divide-gray-200">

              {upcomingBirthdays.length ? (

                upcomingBirthdays.map((m, idx) =>

                  canViewMembers ? (

                    <button

                      key={`${m?._id || "b"}-${idx}`}

                      type="button"

                      onClick={() => goToMemberDetails(m?._id)}

                      className="w-full text-left flex items-center justify-between gap-3 py-1.5 hover:bg-gray-50"

                    >

                      <div className="min-w-0">

                        <div className="text-base font-semibold text-gray-900 truncate">{`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "—"}</div>

                        <div className="mt-0.5 text-sm text-gray-500">{formatShortDate(m?.nextBirthday)}</div>

                      </div>

                      <div className="text-sm font-semibold text-gray-700">{Number(m?.daysAway || 0)} day{Number(m?.daysAway || 0) === 1 ? "" : "s"}</div>

                    </button>

                  ) : (

                    <div

                      key={`${m?._id || "b"}-${idx}`}

                      className="w-full text-left flex items-center justify-between gap-3 py-1.5"

                    >

                      <div className="min-w-0">

                        <div className="text-base font-semibold text-gray-900 truncate">{`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "—"}</div>

                        <div className="mt-0.5 text-sm text-gray-500">{formatShortDate(m?.nextBirthday)}</div>

                      </div>

                      <div className="text-sm font-semibold text-gray-700">{Number(m?.daysAway || 0)} day{Number(m?.daysAway || 0) === 1 ? "" : "s"}</div>

                    </div>

                  )

                )

              ) : (

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">No birthdays in the next 30 days.</div>

              )}

            </div>

          </div>

        </div>



        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">

          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4">

            <div>

              <div className="text-base font-semibold text-gray-900">Recent Members</div>

              <div className="mt-1 text-sm text-gray-600">Recently registered</div>

            </div>

            <button

              type="button"

              onClick={() => onNavigate("members")}

              className="text-base font-semibold text-blue-700 hover:underline"

            >

              View All

            </button>

          </div>



          <div className="px-5 pb-5">

            <div className="mt-4 divide-y divide-gray-200">

              {recentMembers.length ? (

                recentMembers.map((m, idx) =>

                  canViewMembers ? (

                    <button

                      key={`${m?._id || "rm"}-${idx}`}

                      type="button"

                      onClick={() => goToMemberDetails(m?._id)}

                      className="w-full text-left flex items-center justify-between gap-3 py-2 hover:bg-gray-50"

                    >

                      <div className="min-w-0">

                        <div className="text-base font-semibold text-gray-900 truncate">{`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || m?.fullName || "—"}</div>

                        <div className="mt-0.5 text-sm text-gray-500">Joined {formatRelativeTime(m?.createdAt || m?.dateJoined || m?.joinedAt)}</div>

                      </div>

                      <div className="shrink-0 text-sm font-semibold text-gray-700">View</div>

                    </button>

                  ) : (

                    <div

                      key={`${m?._id || "rm"}-${idx}`}

                      className="w-full text-left flex items-center justify-between gap-3 py-2"

                    >

                      <div className="min-w-0">

                        <div className="text-base font-semibold text-gray-900 truncate">{`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || m?.fullName || "—"}</div>

                        <div className="mt-0.5 text-sm text-gray-500">Joined {formatRelativeTime(m?.createdAt || m?.dateJoined || m?.joinedAt)}</div>

                      </div>

                    </div>

                  )

                )

              ) : (

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">No recent members.</div>

              )}

            </div>

          </div>

        </div>



        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">

          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4">

            <div>

              <div className="text-base font-semibold text-gray-900">Upcoming Events</div>

              <div className="mt-1 text-sm text-gray-600">Next scheduled programs</div>

            </div>

            <button

              type="button"

              onClick={() => onNavigate("programs-events")}

              className="text-base font-semibold text-blue-700 hover:underline"

            >

              View All

            </button>

          </div>



          <div className="px-5 pb-5">

            <div className="mt-4">

              {upcomingEventsLoading ? (

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">

                  <Skeleton height={14} count={6} />

                </div>

              ) : upcomingEventsError ? (

                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{upcomingEventsError}</div>

              ) : upcomingEvents.length ? (

                <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">

                  {upcomingEvents.map((ev, idx) =>

                    canViewEvents ? (

                      <button

                        key={`${ev?._id || "ev"}-${idx}`}

                        type="button"

                        onClick={() => goToEventDetails(ev?._id)}

                        className="w-full text-left px-4 py-3 hover:bg-gray-50"

                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <div className="text-base font-semibold text-gray-900 truncate">{ev?.title || ev?.name || "—"}</div>

                            <div className="mt-0.5 text-sm text-gray-500">

                              {formatRange(ev?.dateFrom || ev?.startDate || ev?.date, ev?.dateTo || ev?.endDate)}

                            </div>

                            <div className="mt-0.5 text-sm text-gray-500">

                              {formatTimeRange(ev?.startTime, ev?.endTime, ev?.time)}

                              {ev?.location ? ` • ${ev.location}` : ""}

                            </div>

                          </div>

                          <div className="shrink-0 text-sm font-semibold text-gray-700">View</div>

                        </div>

                      </button>

                    ) : (

                      <div

                        key={`${ev?._id || "ev"}-${idx}`}

                        className="w-full text-left px-4 py-3"

                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <div className="text-base font-semibold text-gray-900 truncate">{ev?.title || ev?.name || "—"}</div>

                            <div className="mt-0.5 text-sm text-gray-500">

                              {formatRange(ev?.dateFrom || ev?.startDate || ev?.date, ev?.dateTo || ev?.endDate)}

                            </div>

                            <div className="mt-0.5 text-sm text-gray-500">

                              {formatTimeRange(ev?.startTime, ev?.endTime, ev?.time)}

                              {ev?.location ? ` • ${ev.location}` : ""}

                            </div>

                          </div>

                        </div>

                      </div>

                    )

                  )}

                </div>

              ) : (

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">No upcoming events.</div>

              )}

            </div>

          </div>

        </div>

      </div>



      <div className="mt-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white overflow-hidden">

        <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-white/70 px-5 py-4">

          <div>

            <div className="text-base font-semibold text-gray-900">Referral Program</div>

            <div className="mt-1 text-sm text-gray-600">Invite members and earn free months</div>

          </div>

          <button

            type="button"

            onClick={() => onNavigate("referrals")}

            className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"

          >

            View Referrals

          </button>

        </div>



        <div className="px-5 pb-5">

          <div className="mt-4 flex flex-wrap gap-3">

            <div className="rounded-lg border border-blue-100 bg-white/70 px-3 py-2 sm:w-44">

              <div className="text-sm font-semibold text-blue-900/70">Total Referrals</div>

              <div className="mt-1 text-base font-semibold text-blue-900">{referral?.totalReferrals ?? 0}</div>

            </div>

            <div className="rounded-lg border border-blue-100 bg-white/70 px-3 py-2 sm:w-44">

              <div className="text-sm font-semibold text-blue-900/70">Free Months Earned</div>

              <div className="mt-1 text-base font-semibold text-blue-900">{referral?.totalFreeMonthsEarned ?? 0}</div>

            </div>

            <div className="rounded-lg border border-blue-100 bg-white/70 px-3 py-2 sm:w-44">

              <div className="text-sm font-semibold text-blue-900/70">Free Months Used</div>

              <div className="mt-1 text-base font-semibold text-blue-900">{referral?.totalFreeMonthsUsed ?? 0}</div>

            </div>

            <div className="rounded-lg border border-blue-100 bg-white/70 px-3 py-2 sm:w-44">

              <div className="text-sm font-semibold text-blue-900/70">Free Months Remaining</div>

              <div className="mt-1 text-base font-semibold text-blue-900">{referral?.freeMonthsRemaining ?? 0}</div>

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



          <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">

            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4">

              <div>

                <div className="text-lg font-semibold text-gray-900">Upcoming Birthdays</div>

                <div className="mt-1 text-sm text-gray-600">All birthdays in the next 30 days</div>

              </div>

              <button

                type="button"

                onClick={closeBirthdaysModal}

                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"

              >

                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-600">

                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                </svg>

              </button>

            </div>



            <div className="p-6">

              {birthdaysModalError ? (

                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{birthdaysModalError}</div>

              ) : null}



              <div className="flex items-center justify-between gap-3 flex-wrap">

                <input

                  value={birthdaysSearch}

                  onChange={(e) => {

                    setBirthdaysSearch(e.target.value);

                    setBirthdaysPage(1);

                  }}

                  placeholder="Search members"

                  className="w-full sm:flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"

                />



                <div className="flex items-center gap-2 shrink-0">

                  <button

                    type="button"

                    onClick={() => setBirthdaysPage((p) => Math.max(1, p - 1))}

                    disabled={birthdaysSafePage <= 1}

                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"

                  >

                    Prev

                  </button>

                  <div className="text-sm text-gray-600">

                    Page {birthdaysSafePage} of {birthdaysTotalPages}

                  </div>

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



              <div className="mt-4">

                {birthdaysModalLoading ? (

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">

                    <Skeleton height={14} count={8} />

                  </div>

                ) : birthdaysSlice.length ? (

                  <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">

                    {birthdaysSlice.map((m, idx) =>

                      canViewMembers ? (

                        <button

                          key={`${m?._id || "bd"}-${idx}`}

                          type="button"

                          onClick={() => goToMemberDetails(m?._id)}

                          className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"

                        >

                          <div className="min-w-0">

                            <div className="text-base font-semibold text-gray-900 truncate">{`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "—"}</div>

                            <div className="mt-0.5 text-sm text-gray-500">{formatShortDate(m?.nextBirthday)}</div>

                          </div>

                          <div className="shrink-0 text-sm font-semibold text-gray-700">{Number(m?.daysAway || 0)} day{Number(m?.daysAway || 0) === 1 ? "" : "s"}</div>

                        </button>

                      ) : (

                        <div

                          key={`${m?._id || "bd"}-${idx}`}

                          className="w-full text-left flex items-center justify-between gap-3 px-4 py-3"

                        >

                          <div className="min-w-0">

                            <div className="text-base font-semibold text-gray-900 truncate">{`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "—"}</div>

                            <div className="mt-0.5 text-sm text-gray-500">{formatShortDate(m?.nextBirthday)}</div>

                          </div>

                          <div className="shrink-0 text-sm font-semibold text-gray-700">{Number(m?.daysAway || 0)} day{Number(m?.daysAway || 0) === 1 ? "" : "s"}</div>

                        </div>

                      )

                    )}

                  </div>

                ) : (

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">No birthdays found.</div>

                )}

              </div>

            </div>

          </div>

        </div>

      ) : null}

    </div>

  );

}



function DashboardHome() {

  const location = useLocation();

  const { toPage } = useDashboardNavigator();



  const rawPage = new URLSearchParams(location.search).get("page") || "dashboard";

  const page = rawPage === "offering" ? "offerings" : rawPage;



  function PageSkeletonFallback() {

    return (

      <div className="w-full max-w-none">

        <div className="rounded-xl border border-gray-200 bg-white p-5">

          <Skeleton height={16} width={220} />

          <div className="mt-3">

            <Skeleton height={12} count={6} />

          </div>

        </div>

      </div>

    );

  }



  let PageComponent = null;



  if (page === "billing") PageComponent = BillingPage;

  if (page === "special-funds") PageComponent = SpecialFundPage;

  if (page === "offerings") PageComponent = OfferingPage;

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



  if (PageComponent) {

    return (

      <React.Suspense fallback={<PageSkeletonFallback />}>

        <PageComponent />

      </React.Suspense>

    );

  }



  return (

    <DashboardOverview

      onNavigate={(targetPage) => {

        if (!targetPage) return;

        toPage(targetPage === "dashboard" ? "dashboard" : targetPage);

      }}

    />

  );

}



export default DashboardHome;