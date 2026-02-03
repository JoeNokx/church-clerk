import { NavLink, useLocation } from "react-router-dom";

function AdminBillingSidebar() {
  const location = useLocation();

  const linkBase = "flex items-center gap-3 px-3 py-2 rounded-lg text-sm";
  const linkInactive = "text-gray-700 hover:bg-gray-50";
  const linkActive = "bg-blue-50 text-blue-900 font-medium";

  const isActive = (path) => location.pathname === path;
  const itemClass = (path) => `${linkBase} ${isActive(path) ? linkActive : linkInactive}`;

  return (
    <aside className="w-72 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="h-16 px-4 flex items-center gap-3 border-b border-gray-200">
        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center ring-1 ring-blue-100">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-blue-900">
            <path d="M12 3L4 8V21H20V8L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-blue-900">ChurchClerk</div>
          <div className="text-xs text-gray-500">Admin Billing</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          <NavLink to="/admin/billing/plans" className={itemClass("/admin/billing/plans")}>Plans</NavLink>
          <NavLink to="/admin/billing/subscriptions" className={itemClass("/admin/billing/subscriptions")}>Subscriptions</NavLink>
        </div>
      </nav>
    </aside>
  );
}

export default AdminBillingSidebar;
