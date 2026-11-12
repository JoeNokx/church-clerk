import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getOpenSupportTicketCount } from "../Services/systemAdmin.api.js";
import { useAuth } from "../../Auth/useAuth.js";

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
  const { hasPermission } = useAuth();

  // Each item mirrors the module/action that gates its backend routes, so a
  // system role never sees a menu it can't actually use.
  const items = [
    { to: "/admin/dashboard", label: "Dashboard", show: hasPermission("dashboard", "read") },
    { to: "/admin/churches", label: "Churches", show: hasPermission("systemChurches", "read") },
    {
      to: "/admin/users",
      label: "Users & Roles",
      show: hasPermission("systemUsers", "read") || hasPermission("systemRoles", "read")
    },
    { to: "/admin/billing/plans", label: "Billing", show: hasPermission("systemBilling", "read") },
    {
      to: "/admin/announcements",
      label: "Announcements",
      show: hasPermission("announcements", "read") || hasPermission("systemSupport", "read"),
      badge: openTicketCount
    },
    { to: "/admin/referrals", label: "Referrals System", show: hasPermission("referrals", "read") },
    { to: "/admin/audit", label: "Audit Log", show: hasPermission("settingsAuditLog", "read") },
    { to: "/admin/settings", label: "System Settings", show: hasPermission("systemBilling", "update") || hasPermission("systemUsers", "create") }
  ];

  return (
    <div className="space-y-1">
      {items.filter((item) => item.show).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={item.badge > 0
            ? ({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive} justify-between`
            : itemClass}
          onClick={onLinkClick}
        >
          <span>{item.label}</span>
          {item.badge > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </NavLink>
      ))}
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
