import { useContext } from "react";

import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../../auth/useAuth.js";

import ChurchContext from "../../church/church.store.js";

import PermissionContext from "../../permissions/permission.store.js";





function Sidebar({ onNavigate = () => {}, onBeforeNavigate }) {



  const { user } = useAuth();



  const churchCtx = useContext(ChurchContext);

  const activeChurch = churchCtx?.activeChurch;

  const { can } = useContext(PermissionContext) || {};



  const canRead = (moduleKey) => {

    if (typeof can !== "function") return true;

    return can(moduleKey, "read");

  };



  const isMonitoringBranch = churchCtx?.isMonitoringBranch || false;

  // True when the user last clicked a branch-bar item (activeChurch = branch church)
  const isInBranchContext =
    isMonitoringBranch &&
    !!(churchCtx?.branchChurch?._id &&
      activeChurch?._id &&
      String(activeChurch._id) === String(churchCtx.branchChurch._id));

  const planAllows = (moduleFlagKey) => {

    if (isMonitoringBranch) return true;

    const modules = activeChurch?.modules;

    if (!modules || Object.keys(modules).length === 0) return true;

    return Boolean(modules?.[moduleFlagKey]);

  };

  const isReadOnly = (moduleFlagKey) => {

    if (isMonitoringBranch) return false;

    return activeChurch?.modules?.[moduleFlagKey] === "readOnly";

  };

  const LockBadge = () => (
    <span title="Read-only: upgrade to unlock" className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100">
      <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 text-amber-600">
        <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      </svg>
    </span>
  );



  const canSeeSettings = () => {

    return (

      canRead("settings") ||

      canRead("settingsMyProfile") ||

      canRead("settingsChurchProfile") ||

      canRead("settingsUsersRoles") ||

      canRead("settingsAuditLog")

    );

  };

  const homeChurchId = typeof user?.church === "string" ? user.church : user?.church?._id;

  const showHeadquartersNav =

    activeChurch?.type === "Headquarters" ||

    (activeChurch?.type === "Branch" && homeChurchId && String(activeChurch?.parentChurch || "") === String(homeChurchId));

  const isHqMonitoringBranch = showHeadquartersNav && activeChurch?.type === "Branch";



  const showBranchesOverview = showHeadquartersNav && planAllows("Branches") && canRead("branches");



  const showPeopleMinistries =

    (planAllows("Members") && canRead("members")) ||

    (planAllows("Attendance") && canRead("attendance")) ||

    (planAllows("ProgramsEvents") && canRead("events")) ||

    (planAllows("Ministries") && canRead("ministry")) ||

    (planAllows("Announcements") && canRead("announcements"));



  const showFinance =

    (planAllows("Tithe") && canRead("tithe")) ||

    (planAllows("Budgeting") && canRead("budgeting")) ||

    (planAllows("ChurchProjects") && canRead("churchProjects")) ||

    (planAllows("SpecialFunds") && canRead("specialFunds")) ||

    (planAllows("Offerings") && canRead("offerings")) ||

    (planAllows("Welfare") && canRead("welfare")) ||

    (planAllows("Pledges") && canRead("pledges")) ||

    (planAllows("BusinessVentures") && canRead("businessVentures")) ||

    (planAllows("Expenses") && canRead("expenses")) ||

    (planAllows("FinancialStatement") && canRead("financialStatement"));



  const showAdministration =

    (planAllows("ReportsAnalytics") && canRead("reportsAnalytics")) ||

    (planAllows("Billing") && canRead("billing")) ||

    (planAllows("Referrals") && canRead("referrals")) ||

    (planAllows("Settings") && canSeeSettings()) ||

    (planAllows("support") && canRead("support"));



  const location = useLocation();

  const isBillingPath = location.pathname === "/dashboard/billing";

  const isOfferingPath = location.pathname === "/offering";

  const rawPage = new URLSearchParams(location.search).get("page") || "dashboard";

  const page = isBillingPath

    ? "billing"

    : isOfferingPath

      ? "offerings"

      : rawPage === "offering"

        ? "offerings"

        : rawPage;



  const linkBase = "flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-lg text-[15px]";

  const linkInactive = "text-gray-700 hover:bg-gray-50";

  const linkActive = "bg-blue-50 text-blue-900 font-medium";



  // When viewing branch data, sidebar items must NOT appear active
  const itemClass = (key) =>
    `${linkBase} ${page === key && !isInBranchContext ? linkActive : linkInactive}`;

  const toPage = (key) => {

    if (key === "dashboard") return "/dashboard";

    if (key === "billing") return "/dashboard/billing";

    if (key === "settings") return "/dashboard/settings";

    if (key === "offerings") return "/dashboard?page=offering";

    return `/dashboard?page=${key}`;

  };





  return (

    <aside className="w-72 bg-white border-r border-gray-200 h-screen flex flex-col md:w-72">

      <div className="h-16 px-4 flex items-center gap-3 border-b border-gray-200">

        <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center ring-1 ring-blue-100 md:h-12 md:w-12">

          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-blue-900">

            <path d="M12 3L4 8V21H20V8L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

            <path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

          </svg>

        </div>

        <div className="text-[15px] font-semibold text-blue-900">ChurchClerk</div>

      </div>



      <nav className="flex-1 overflow-y-auto px-3 py-4">

        <div
          className="space-y-6"
          onClick={(e) => {
            const el = e.target;
            if (!el || typeof el.closest !== "function") return;
            const link = el.closest("a");
            if (!link) return;
            onBeforeNavigate?.();
            onNavigate?.();
          }}
        >

          <div className="space-y-1">

            {planAllows("Dashboard") && canRead("dashboard") ? (

              <NavLink to={toPage("dashboard")} className={itemClass("dashboard")}>

                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-500">

                  <path d="M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7V11h-7v9Zm0-16v5h7V4h-7Z" stroke="currentColor" strokeWidth="1.8" />

                </svg>

                Dashboard

              </NavLink>

            ) : null}

          </div>







          {showBranchesOverview ? (

            <div>

              <div className="px-3 font-semibold text-gray-400 tracking-wider text-xs">HEADQUARTERS</div>

              <div className="mt-2 space-y-1">

                <NavLink to={toPage("branches-overview")} className={itemClass("branches-overview")}>

                  <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                      <path d="M4 7h16M7 7v14m10-14v14M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                    </svg>

                  </span>

                  Branches Overview

                </NavLink>

              </div>

            </div>

          ) : null}



          {showPeopleMinistries ? (

            <div>

              <div className="px-3 font-semibold text-gray-400 tracking-wider text-xs">PEOPLE &amp; MINISTRIES</div>

              <div className="mt-2 space-y-1">

                {planAllows("Members") && canRead("members") ? (

                  <NavLink to={toPage("members")} className={itemClass("members")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11Z" stroke="currentColor" strokeWidth="1.8" />

                        <path d="M8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Z" stroke="currentColor" strokeWidth="1.8" />

                        <path d="M3 20c0-3 2-5 5-5h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                        <path d="M21 20c0-3-2-5-5-5h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                        <path d="M8 20c0-3 1.8-5 4-5s4 2 4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                      </svg>

                    </span>

                    Members

                    {isReadOnly("Members") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("Attendance") && canRead("attendance") ? (

                  <NavLink to={toPage("attendance")} className={itemClass("attendance")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M7 3v3M17 3v3M4 8h16M6 12h4M6 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                        <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />

                      </svg>

                    </span>

                    Attendance

                    {isReadOnly("Attendance") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("ProgramsEvents") && canRead("events") ? (

                  <NavLink to={toPage("programs-events")} className={itemClass("programs-events")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                        <path d="M3 6h1M3 12h1M3 18h1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                      </svg>

                    </span>

                    Programs &amp; Events

                    {isReadOnly("ProgramsEvents") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("Ministries") && canRead("ministry") ? (

                  <NavLink to={toPage("ministries")} className={itemClass("ministries")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M12 3v18M5 7h14M5 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                      </svg>

                    </span>

                    Ministries

                    {isReadOnly("Ministries") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("Announcements") && canRead("announcements") ? (

                  <NavLink to={toPage("announcements")} className={itemClass("announcements")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M4 4h16v12H5.5L4 17.5V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

                        <path d="M7 8h10M7 12h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                      </svg>

                    </span>

                    Announcements

                    {isReadOnly("Announcements") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}

              </div>

            </div>

          ) : null}



          {showFinance ? (

            <div>

              <div className="px-3 font-semibold text-gray-400 tracking-wider text-xs">FINANCE</div>

              <div className="mt-2 space-y-1">

                {planAllows("Tithe") && canRead("tithe") ? (

                  <NavLink to={toPage("tithe")} className={itemClass("tithe")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M12 3v18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                        <path d="M16 7H10a3 3 0 100 6h4a3 3 0 110 6H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                      </svg>

                    </span>

                    Tithe

                    {isReadOnly("Tithe") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("Budgeting") && canRead("budgeting") ? (

                  <NavLink to={toPage("budgeting")} className={itemClass("budgeting")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M7 4h10v16H7V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

                        <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                      </svg>

                    </span>

                    Budgeting

                    {isReadOnly("Budgeting") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("ChurchProjects") && canRead("churchProjects") ? (

                  <NavLink to={toPage("church-projects")} className={itemClass("church-projects")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M3 21h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                        <path d="M6 21V9l6-4 6 4v12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

                        <path d="M10 21v-6h4v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

                      </svg>

                    </span>

                    Church Projects

                    {isReadOnly("ChurchProjects") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {((planAllows("Offerings") && canRead("offerings")) || (planAllows("SpecialFunds") && canRead("specialFunds"))) ? (() => {

                  const isActive = !isInBranchContext && (page === "offering-funds" || page === "offerings" || page === "special-funds" || isOfferingPath);

                  const bothReadOnly = (!planAllows("Offerings") || !canRead("offerings") || isReadOnly("Offerings")) && (!planAllows("SpecialFunds") || !canRead("specialFunds") || isReadOnly("SpecialFunds"));

                  return (

                    <NavLink to={toPage("offering-funds")} className={`${linkBase} ${isActive ? linkActive : linkInactive}`}>

                      <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                          <path d="M4 8h16v12H4V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

                          <path d="M8 8V6a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                        </svg>

                      </span>

                      Offering &amp; Funds

                      {bothReadOnly ? <LockBadge /> : null}

                    </NavLink>

                  );

                })() : null}



                {planAllows("Welfare") && canRead("welfare") ? (

                  <NavLink to={toPage("welfare")} className={itemClass("welfare")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M12 21s-7-4.5-7-10a4 4 0 017-2 4 4 0 017 2c0 5.5-7 10-7 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

                      </svg>

                    </span>

                    Welfare

                    {isReadOnly("Welfare") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("Pledges") && canRead("pledges") ? (

                  <NavLink to={toPage("pledges")} className={itemClass("pledges")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M7 3h10v18H7V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

                        <path d="M9 7h6M9 11h6M9 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                      </svg>

                    </span>

                    Pledges

                    {isReadOnly("Pledges") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("BusinessVentures") && canRead("businessVentures") ? (

                  <NavLink to={toPage("business-ventures")} className={itemClass("business-ventures")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M4 7h16v14H4V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

                        <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                      </svg>

                    </span>

                    Business Ventures

                    {isReadOnly("BusinessVentures") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("Expenses") && canRead("expenses") ? (

                  <NavLink to={toPage("expenses")} className={itemClass("expenses")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M6 6h12M6 10h12M6 14h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                        <path d="M4 4h16v16H4V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

                      </svg>

                    </span>

                    General Expenses

                    {isReadOnly("Expenses") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("FinancialStatement") && canRead("financialStatement") ? (

                  <NavLink to={toPage("financial-statement")} className={itemClass("financial-statement")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M7 3h10v18H7V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

                        <path d="M9 8h6M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                      </svg>

                    </span>

                    Financial Statement

                    {isReadOnly("FinancialStatement") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}

              </div>

            </div>

          ) : null}



          {showAdministration ? (

            <div>

              <div className="px-3 font-semibold text-gray-400 tracking-wider text-xs">ADMINISTRATION</div>

              <div className="mt-2 space-y-1">

                {planAllows("ReportsAnalytics") && canRead("reportsAnalytics") ? (

                  <NavLink to={toPage("reports-analytics")} className={itemClass("reports-analytics")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M4 20V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                        <path d="M7 16l4-5 4 3 3-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

                      </svg>

                    </span>

                    Reports &amp; Analytics

                    {isReadOnly("ReportsAnalytics") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("Billing") && canRead("billing") ? (

                  <NavLink to={toPage("billing")} className={itemClass("billing")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M4 7h16v10H4V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

                        <path d="M7 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                      </svg>

                    </span>

                    Billing

                  </NavLink>

                ) : null}



                {planAllows("Referrals") && canRead("referrals") ? (

                  <NavLink to={toPage("referrals")} className={itemClass("referrals")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M7 7h10v10H7V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

                        <path d="M4 12h3M17 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                      </svg>

                    </span>

                    Referrals

                  </NavLink>

                ) : null}



                {(user?.role === "superadmin" || user?.role === "churchadmin") ? (

                  <NavLink to={toPage("approvals")} className={itemClass("approvals")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

                        <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />

                      </svg>

                    </span>

                    Approvals

                  </NavLink>

                ) : null}



                {planAllows("Settings") && canSeeSettings() ? (

                  <NavLink to={toPage("settings")} className={itemClass("settings")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7Z" stroke="currentColor" strokeWidth="1.8" />

                        <path d="M19.4 15a8.1 8.1 0 000-6l-2 1.2a6.2 6.2 0 00-1.5-1.5L17 6.6a8.1 8.1 0 00-6 0l1.2 2a6.2 6.2 0 00-1.5 1.5L8.6 9a8.1 8.1 0 000 6l2-1.2a6.2 6.2 0 001.5 1.5L11 17.4a8.1 8.1 0 006 0l-1.2-2a6.2 6.2 0 001.5-1.5l2.1 1.1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />

                      </svg>

                    </span>

                    Settings

                  </NavLink>

                ) : null}



                {planAllows("support") && canRead("support") ? (

                  <NavLink to={toPage("support-help")} className={itemClass("support-help")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

                        <path d="M9.5 9a2.5 2.5 0 115 0c0 2-2.5 2-2.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0Z" stroke="currentColor" strokeWidth="1.8" />

                      </svg>

                    </span>

                    Support &amp; Help

                  </NavLink>

                ) : null}

              </div>

            </div>

          ) : null}

        </div>

      </nav>

    </aside>



  )

}



export default Sidebar

