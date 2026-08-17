import { useContext, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApprovals } from "../../governance/services/governance.api.js";

import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../../auth/useAuth.js";

import ChurchContext from "../../church/church.store.js";

import PermissionContext from "../../permissions/permission.store.js";





function ChurchNameMarquee({ name }) {
  const containerRef = useRef(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setOverflow(el.scrollWidth > el.clientWidth);
  }, [name]);

  if (!overflow) {
    return (
      <div ref={containerRef} className="overflow-hidden whitespace-nowrap text-[13px] font-semibold text-slate-100 leading-tight">
        {name}
      </div>
    );
  }

  return (
    <div className="overflow-hidden whitespace-nowrap text-[13px] font-semibold text-slate-100 leading-tight">
      <span className="cck-marquee-track inline-block">
        {name}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{name}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      </span>
    </div>
  );
}

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
    <span title="Read-only: upgrade to unlock" className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
      <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 text-amber-400">
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



  const canSeeApprovals = user?.role === "superadmin" || user?.role === "churchadmin";

  const { data: pendingApprovalsCount = 0 } = useQuery({
    queryKey: ["church-governance", "PENDING_APPROVAL", "sidebar-count"],
    queryFn: () => getApprovals({ status: "PENDING_APPROVAL", limit: 1 }).then(r => r.data?.pagination?.total || 0),
    enabled: canSeeApprovals,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const pendingApprovalCount = typeof pendingApprovalsCount === "number" ? pendingApprovalsCount : 0;

  const location = useLocation();

  const isBillingPath = location.pathname === "/dashboard/billing";

  const isOfferingPath = location.pathname === "/offering";

  const isSettingsPath = location.pathname.startsWith("/dashboard/settings");

  const rawPage = new URLSearchParams(location.search).get("page") || "dashboard";

  const page = isBillingPath

    ? "billing"

    : isSettingsPath

      ? "settings"

      : isOfferingPath

        ? "offerings"

        : rawPage === "offering"

          ? "offerings"

          : rawPage;



  const linkBase = "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150";

  const linkInactive = "text-slate-400 hover:bg-white/[0.06] hover:text-white";

  const linkActive = "bg-indigo-500/[0.15] text-white font-medium before:absolute before:left-0 before:inset-y-1 before:w-[3px] before:rounded-r-full before:bg-indigo-400";



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

    <aside className="w-72 bg-slate-900 h-full flex flex-col">

      <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-800 shrink-0">

        <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">

          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">

            <path d="M12 3L4 8V21H20V8L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />

            <path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />

          </svg>

        </div>

        <span className="font-semibold text-white text-[15px] tracking-tight">ChurchClerk</span>

      </div>



      <nav className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">

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

                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                </svg>

                Dashboard

              </NavLink>

            ) : null}

          </div>







          {showBranchesOverview ? (

            <div>

              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">HEADQUARTERS</div>

              <div className="mt-2 space-y-1">

                <NavLink to={toPage("branches-overview")} className={itemClass("branches-overview")}>

                  <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M9 3h6v4H9zM2 17h6v4H2zM16 17h6v4h-6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="M12 7v4M12 11H5v6M12 11h7v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>

                  </span>

                  Branches Overview

                </NavLink>

              </div>

            </div>

          ) : null}



          {showPeopleMinistries ? (

            <div>

              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">PEOPLE &amp; MINISTRIES</div>

              <div className="mt-2 space-y-1">

                {planAllows("Members") && canRead("members") ? (

                  <NavLink to={toPage("members")} className={itemClass("members")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

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

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path d="M9 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M1 20c0-4 3.5-6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        <path d="M15 16l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>

                    </span>

                    Attendance

                    {isReadOnly("Attendance") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("ProgramsEvents") && canRead("events") ? (

                  <NavLink to={toPage("programs-events")} className={itemClass("programs-events")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path d="M7 3v3M17 3v3M4 8h16M6 12h4M6 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>

                    </span>

                    Programs &amp; Events

                    {isReadOnly("ProgramsEvents") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("Ministries") && canRead("ministry") ? (

                  <NavLink to={toPage("ministries")} className={itemClass("ministries")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>

                    </span>

                    Ministries

                    {isReadOnly("Ministries") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("Announcements") && canRead("announcements") ? (

                  <NavLink to={toPage("announcements")} className={itemClass("announcements")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M4 4h16v12H5.5L4 17.5V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

                        <path d="M7 8h10M7 12h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                      </svg>

                    </span>

                    Announcements

                    {isReadOnly("Announcements") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}

                {canRead("outreach") ? (

                  <NavLink to={toPage("outreach")} className={itemClass("outreach")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path d="M12 22s-7-4.5-7-10a4 4 0 017-2 4 4 0 017 2c0 5.5-7 10-7 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                        <path d="M17 3l1.5 1.5M19.5 5.5l1.5 1.5M17 9l2-2M21 3l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>

                    </span>

                    Outreach

                  </NavLink>

                ) : null}

              </div>

            </div>

          ) : null}



          {showFinance ? (

            <div>

              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">FINANCE</div>

              <div className="mt-2 space-y-1">

                {planAllows("Tithe") && canRead("tithe") ? (

                  <NavLink to={toPage("tithe")} className={itemClass("tithe")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <rect x="2" y="7" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M6 12h.01M18 12h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>

                    </span>

                    Tithe

                    {isReadOnly("Tithe") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("Budgeting") && canRead("budgeting") ? (

                  <NavLink to={toPage("budgeting")} className={itemClass("budgeting")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M3 20h18M3 4v16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        <path d="M6 16h8M6 12h12M6 8h5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>

                      </svg>

                    </span>

                    Budgeting

                    {isReadOnly("Budgeting") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("ChurchProjects") && canRead("churchProjects") ? (

                  <NavLink to={toPage("church-projects")} className={itemClass("church-projects")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

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

                      <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                          <path d="M20 12v9H4v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M22 7H2v5h20V7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                          <path d="M12 22V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          <path d="M12 7H7.5a2.5 2.5 0 010-5C10 2 12 7 12 7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 7h4.5a2.5 2.5 0 000-5C14 2 12 7 12 7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>

                        </svg>

                      </span>

                      Offering &amp; Funds

                      {bothReadOnly ? <LockBadge /> : null}

                    </NavLink>

                  );

                })() : null}



                {planAllows("Welfare") && canRead("welfare") ? (

                  <NavLink to={toPage("welfare")} className={itemClass("welfare")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

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

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>

                      </svg>

                    </span>

                    Pledges

                    {isReadOnly("Pledges") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("BusinessVentures") && canRead("businessVentures") ? (

                  <NavLink to={toPage("business-ventures")} className={itemClass("business-ventures")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        <path d="M2 13h20" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>

                    </span>

                    Business Ventures

                    {isReadOnly("BusinessVentures") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("Expenses") && canRead("expenses") ? (

                  <NavLink to={toPage("expenses")} className={itemClass("expenses")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        <path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>

                      </svg>

                    </span>

                    General Expenses

                    {isReadOnly("Expenses") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("FinancialStatement") && canRead("financialStatement") ? (

                  <NavLink to={toPage("financial-statement")} className={itemClass("financial-statement")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M2 3h8a2 2 0 012 2v14a2 2 0 00-2-2H2V3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                        <path d="M22 3h-8a2 2 0 00-2 2v14a2 2 0 012-2h8V3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>

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

              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">ADMINISTRATION</div>

              <div className="mt-2 space-y-1">

                {planAllows("ReportsAnalytics") && canRead("reportsAnalytics") ? (

                  <NavLink to={toPage("reports-analytics")} className={itemClass("reports-analytics")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        <path d="M2 20h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>

                    </span>

                    Reports &amp; Analytics

                    {isReadOnly("ReportsAnalytics") ? <LockBadge /> : null}

                  </NavLink>

                ) : null}



                {planAllows("Billing") && canRead("billing") ? (

                  <NavLink to={toPage("billing")} className={itemClass("billing")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M6 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M14 14h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>

                    </span>

                    Billing

                  </NavLink>

                ) : null}



                {planAllows("Referrals") && canRead("referrals") ? (

                  <NavLink to={toPage("referrals")} className={itemClass("referrals")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.8"/>
                        <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
                        <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M8.6 10.7l6.8-4.4M8.6 13.3l6.8 4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>

                      </svg>

                    </span>

                    Referrals

                  </NavLink>

                ) : null}



                {(user?.role === "superadmin" || user?.role === "churchadmin") ? (

                  <NavLink to={toPage("approvals")} className={itemClass("approvals")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

                        <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />

                      </svg>

                    </span>

                    Approvals

                    {pendingApprovalCount > 0 ? (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1 text-[11px] font-bold text-white">
                        {pendingApprovalCount > 99 ? "99+" : pendingApprovalCount}
                      </span>
                    ) : null}

                  </NavLink>

                ) : null}



                {planAllows("Settings") && canSeeSettings() ? (

                  <NavLink to={toPage("settings")} className={itemClass("settings")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">

                        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8"/>

                      </svg>

                    </span>

                    Settings

                  </NavLink>

                ) : null}



                {planAllows("support") && canRead("support") ? (

                  <NavLink to={toPage("support-help")} className={itemClass("support-help")}>

                    <span className="h-5 w-5 inline-flex items-center justify-center shrink-0">

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

      {activeChurch?._id ? (
        <div className="px-3 pb-4 pt-1 shrink-0">
          <div className="h-px bg-slate-800 mb-3" />
          <NavLink
            to="/dashboard/settings?tab=church-profile"
            onClick={() => { onBeforeNavigate?.(); onNavigate?.(); }}
            className="group flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/70 px-3 py-2.5 hover:bg-slate-800 transition-colors"
            style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)" }}
          >
            {activeChurch?.logoUrl ? (
              <img
                src={activeChurch.logoUrl}
                alt={activeChurch.name}
                className="h-9 w-9 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white"
                style={{ background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)" }}
              >
                {(activeChurch?.name || "C").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1 overflow-hidden">
              <ChurchNameMarquee name={activeChurch?.name || "My Church"} />
              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                {activeChurch?.type || "Church Profile"}
              </div>
            </div>
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" stroke="currentColor" strokeWidth="2">
              <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </NavLink>
        </div>
      ) : null}

    </aside>



  )

}



export default Sidebar

