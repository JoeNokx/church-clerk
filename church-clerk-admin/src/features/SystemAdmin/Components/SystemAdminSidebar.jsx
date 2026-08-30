import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getOpenSupportTicketCount } from "../Services/systemAdmin.api.js";

function SystemAdminSidebar() {
  const linkBase = "flex items-center gap-3 px-3 py-2 rounded-lg text-sm";
  const linkInactive = "text-gray-700 hover:bg-gray-50";
  const linkActive = "bg-blue-50 text-blue-900 font-medium";

  const itemClass = ({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`;

  const [openTicketCount, setOpenTicketCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await getOpenSupportTicketCount();
        if (!cancelled) setOpenTicketCount(Number(res?.data?.count || 0));
      } catch { void 0; }
    };
    void load();
    const interval = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <aside className="hidden lg:flex w-72 bg-white border-r border-gray-200 h-screen flex-col">
      <div className="h-16 px-4 flex items-center gap-3 border-b border-gray-200">
        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center ring-1 ring-blue-100">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-blue-900">
            <path d="M12 3L4 8V21H20V8L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-blue-900">ChurchClerk</div>
          <div className="text-xs text-gray-500">System Admin</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          <NavLink to="/admin/dashboard" className={itemClass}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/churches" className={itemClass}>
            Churches
          </NavLink>
          <NavLink to="/admin/users" className={itemClass}>
            Users &amp; Roles
          </NavLink>
          <NavLink to="/admin/billing/plans" className={itemClass}>
            Billing
          </NavLink>
          <NavLink to="/admin/announcements" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive} justify-between`}>
            <span>Announcements</span>
            {openTicketCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
                {openTicketCount > 99 ? "99+" : openTicketCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/admin/referrals" className={itemClass}>
            Referrals System
          </NavLink>
          <NavLink to="/admin/audit" className={itemClass}>
            Audit Log
          </NavLink>
          <NavLink to="/admin/settings" className={itemClass}>
            System Settings
          </NavLink>
        </div>
      </nav>
    </aside>
  );
}

export default SystemAdminSidebar;
