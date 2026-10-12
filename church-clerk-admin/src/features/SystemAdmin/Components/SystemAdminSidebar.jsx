import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getOpenSupportTicketCount } from "../Services/systemAdmin.api.js";

const linkBase = "flex items-center gap-3 px-3 py-2 rounded-lg text-sm";
const linkInactive = "text-gray-700 hover:bg-gray-50";
const linkActive = "bg-blue-50 text-blue-900 font-medium";
const itemClass = ({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`;

const ChurchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-blue-900">
    <path d="M12 3L4 8V21H20V8L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

function NavItems({ openTicketCount, onLinkClick }) {
  return (
    <div className="space-y-1">
      <NavLink to="/admin/dashboard" className={itemClass} onClick={onLinkClick}>
        Dashboard
      </NavLink>
      <NavLink to="/admin/churches" className={itemClass} onClick={onLinkClick}>
        Churches
      </NavLink>
      <NavLink to="/admin/users" className={itemClass} onClick={onLinkClick}>
        Users &amp; Roles
      </NavLink>
      <NavLink to="/admin/billing/plans" className={itemClass} onClick={onLinkClick}>
        Billing
      </NavLink>
      <NavLink
        to="/admin/announcements"
        className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive} justify-between`}
        onClick={onLinkClick}
      >
        <span>Announcements</span>
        {openTicketCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
            {openTicketCount > 99 ? "99+" : openTicketCount}
          </span>
        )}
      </NavLink>
      <NavLink to="/admin/referrals" className={itemClass} onClick={onLinkClick}>
        Referrals System
      </NavLink>
      <NavLink to="/admin/audit" className={itemClass} onClick={onLinkClick}>
        Audit Log
      </NavLink>
      <NavLink to="/admin/settings" className={itemClass} onClick={onLinkClick}>
        System Settings
      </NavLink>
    </div>
  );
}

function SystemAdminSidebar({ mobileOpen, onClose }) {
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

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen, onClose]);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-72 shrink-0 bg-white border-r border-gray-200 h-screen flex-col">
        <div className="h-16 px-4 flex items-center gap-3 border-b border-gray-200">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center ring-1 ring-blue-100">
            <ChurchIcon />
          </div>
          <div>
            <div className="text-sm font-semibold text-blue-900">ChurchClerk</div>
            <div className="text-xs text-gray-500">System Admin</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavItems openTicketCount={openTicketCount} />
        </nav>
      </aside>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col lg:hidden shadow-xl">
            <div className="h-16 px-4 flex items-center justify-between gap-3 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center ring-1 ring-blue-100 shrink-0">
                  <ChurchIcon />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-blue-900 truncate">ChurchClerk</div>
                  <div className="text-xs text-gray-500">System Admin</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {/* Pass onClose so each link closes the drawer on navigate */}
              <NavItems openTicketCount={openTicketCount} onLinkClick={onClose} />
            </nav>
          </aside>
        </>
      )}
    </>
  );
}

export default SystemAdminSidebar;
