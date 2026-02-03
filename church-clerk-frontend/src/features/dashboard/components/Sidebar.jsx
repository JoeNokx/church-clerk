import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";


function Sidebar() {

  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin" || user?.role === "superadmin";

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

  const linkBase = "flex items-center gap-3 px-3 py-2 rounded-lg text-sm";
  const linkInactive = "text-gray-700 hover:bg-gray-50";
  const linkActive = "bg-blue-50 text-blue-900 font-medium";

  const itemClass = (key) => `${linkBase} ${page === key ? linkActive : linkInactive}`;
  const toPage = (key) => {
    if (key === "dashboard") return "/dashboard";
    if (key === "billing") return "/dashboard/billing";
    if (key === "offerings") return "/dashboard?page=offering";
    return `/dashboard?page=${key}`;
  };


  return (
    <aside className="w-72 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="h-16 px-4 flex items-center gap-3 border-b border-gray-200">
        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center ring-1 ring-blue-100">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-blue-900">
            <path d="M12 3L4 8V21H20V8L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="text-sm font-semibold text-blue-900">ChurchClerk</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          <div className="space-y-1">
            <NavLink to={toPage("dashboard")} className={itemClass("dashboard")}>
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-500">
                <path d="M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7V11h-7v9Zm0-16v5h7V4h-7Z" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              Dashboard
            </NavLink>
          </div>

          <div>
            <div className="px-3 text-xs font-semibold text-gray-400 tracking-wider">HEADQUARTERS</div>
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

          <div>
            <div className="px-3 text-xs font-semibold text-gray-400 tracking-wider">PEOPLE &amp; MINISTRIES</div>
            <div className="mt-2 space-y-1">
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
              </NavLink>

              <NavLink to={toPage("attendance")} className={itemClass("attendance")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M7 3v3M17 3v3M4 8h16M6 12h4M6 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </span>
                Attendance
              </NavLink>

              <NavLink to={toPage("programs-events")} className={itemClass("programs-events")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M3 6h1M3 12h1M3 18h1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                Programs &amp; Events
              </NavLink>

              <NavLink to={toPage("ministries")} className={itemClass("ministries")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M12 3v18M5 7h14M5 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                Ministries
              </NavLink>

              <NavLink to={toPage("announcements")} className={itemClass("announcements")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M4 4h16v12H5.5L4 17.5V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M7 8h10M7 12h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                Announcements
              </NavLink>
            </div>
          </div>

          <div>
            <div className="px-3 text-xs font-semibold text-gray-400 tracking-wider">FINANCE</div>
            <div className="mt-2 space-y-1">
              <NavLink to={toPage("tithe")} className={itemClass("tithe")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M12 3v18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M16 7H10a3 3 0 100 6h4a3 3 0 110 6H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                Tithe
              </NavLink>

              <NavLink to={toPage("church-projects")} className={itemClass("church-projects")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M3 21h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M6 21V9l6-4 6 4v12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M10 21v-6h4v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                </span>
                Church Projects
              </NavLink>

              <NavLink to={toPage("special-funds")} className={itemClass("special-funds")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M12 2v20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M7 6h8a3 3 0 010 6H9a3 3 0 100 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                Special Funds
              </NavLink>

              <NavLink to={toPage("offerings")} className={itemClass("offerings")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M4 8h16v12H4V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M8 8V6a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                Offerings
              </NavLink>

              <NavLink to={toPage("welfare")} className={itemClass("welfare")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M12 21s-7-4.5-7-10a4 4 0 017-2 4 4 0 017 2c0 5.5-7 10-7 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                </span>
                Welfare
              </NavLink>

              <NavLink to={toPage("pledges")} className={itemClass("pledges")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M7 3h10v18H7V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M9 7h6M9 11h6M9 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                Pledges
              </NavLink>

              <NavLink to={toPage("business-ventures")} className={itemClass("business-ventures")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M4 7h16v14H4V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                Business Ventures
              </NavLink>

              <NavLink to={toPage("expenses")} className={itemClass("expenses")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M6 6h12M6 10h12M6 14h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M4 4h16v16H4V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                </span>
                Expenses
              </NavLink>

              <NavLink to={toPage("financial-statement")} className={itemClass("financial-statement")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M7 3h10v18H7V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M9 8h6M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                Financial Statement
              </NavLink>
            </div>
          </div>

          <div>
            <div className="px-3 text-xs font-semibold text-gray-400 tracking-wider">ADMINISTRATION</div>
            <div className="mt-2 space-y-1">
              {isSuperAdmin ? (
                <NavLink to="/admin/billing/plans" className={itemClass("admin-billing")}>
                  <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M4 7h16v10H4V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M7 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  Admin Billing
                </NavLink>
              ) : null}

              <NavLink to={toPage("reports-analytics")} className={itemClass("reports-analytics")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M7 16V9M12 16V5M17 16v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                Reports &amp; Analytics
              </NavLink>

              <NavLink to={toPage("billing")} className={itemClass("billing")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M4 7h16v10H4V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M7 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                Billing
              </NavLink>

              <NavLink to={toPage("referrals")} className={itemClass("referrals")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M7 7h10v10H7V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M4 12h3M17 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                Referrals
              </NavLink>

              <NavLink to={toPage("settings")} className={itemClass("settings")}>
                <span className="h-5 w-5 inline-flex items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7Z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M19.4 15a8.1 8.1 0 000-6l-2 1.2a6.2 6.2 0 00-1.5-1.5L17 6.6a8.1 8.1 0 00-6 0l1.2 2a6.2 6.2 0 00-1.5 1.5L8.6 9a8.1 8.1 0 000 6l2-1.2a6.2 6.2 0 001.5 1.5L11 17.4a8.1 8.1 0 006 0l-1.2-2a6.2 6.2 0 001.5-1.5l2.1 1.1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                </span>
                Settings
              </NavLink>

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
            </div>
          </div>
        </div>
      </nav>
    </aside>

  )
}

export default Sidebar
