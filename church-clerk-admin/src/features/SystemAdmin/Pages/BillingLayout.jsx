import { NavLink, Outlet } from "react-router-dom";

function BillingLayout() {
  const linkBase = "px-3 py-2 rounded-lg text-sm font-medium";
  const linkInactive = "text-gray-700 hover:bg-gray-50";
  const linkActive = "bg-blue-50 text-blue-900";

  const itemClass = ({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`;

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Billing</div>
          <div className="mt-1 text-sm text-gray-600">Manage billing for all churches.</div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-gray-200 bg-white p-2">
        <div className="flex flex-wrap gap-2">
          <NavLink end to="/admin/billing/plans" className={itemClass}>
            Plans
          </NavLink>
          <NavLink to="/admin/billing/subscriptions" className={itemClass}>
            Subscriptions
          </NavLink>
          <NavLink to="/admin/billing/payments" className={itemClass}>
            Payments
          </NavLink>
          <NavLink to="/admin/billing/revenue" className={itemClass}>
            Revenue
          </NavLink>
          <NavLink to="/admin/billing/invoices" className={itemClass}>
            Invoices
          </NavLink>
          <NavLink to="/admin/billing/webhooks" className={itemClass}>
            Webhook Logs
          </NavLink>
        </div>
      </div>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}

export default BillingLayout;
