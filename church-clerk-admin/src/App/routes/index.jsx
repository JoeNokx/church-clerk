import { Navigate, Route, Routes } from "react-router-dom";
import AuthLayout from "../Layouts/AuthLayout.jsx";
import DashboardLayout from "../Layouts/DashboardLayout.jsx";
import Login from "../../features/Auth/pages/Login.jsx";
import DashboardHome from "../../features/Dashboard/Pages/DashboardHome.jsx";
import ProtectedRoute from "../../shared/components/ProtectedRoute.jsx";
import ChurchesPage from "../../features/SystemAdmin/Pages/ChurchesPage.jsx";
import ChurchDetailPage from "../../features/SystemAdmin/Pages/ChurchDetailPage.jsx";
import UsersRolesPage from "../../features/SystemAdmin/Pages/UsersRolesPage.jsx";
import BillingLayout from "../../features/SystemAdmin/Pages/BillingLayout.jsx";
import BillingPlansPage from "../../features/SystemAdmin/Pages/BillingPlansPage.jsx";
import BillingSubscriptionsPage from "../../features/SystemAdmin/Pages/BillingSubscriptionsPage.jsx";
import BillingPaymentsPage from "../../features/SystemAdmin/Pages/BillingPaymentsPage.jsx";
import BillingRevenuePage from "../../features/SystemAdmin/Pages/BillingRevenuePage.jsx";
import BillingInvoicesPage from "../../features/SystemAdmin/Pages/BillingInvoicesPage.jsx";
import BillingWebhookLogsPage from "../../features/SystemAdmin/Pages/BillingWebhookLogsPage.jsx";
import ReferralsPage from "../../features/SystemAdmin/Pages/ReferralsPage.jsx";
import AuditLogPage from "../../features/SystemAdmin/Pages/AuditLogPage.jsx";
import SystemSettingsPage from "../../features/SystemAdmin/Pages/SystemSettingsPage.jsx";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/admin/login" element={<Login />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="churches" element={<ChurchesPage />} />
        <Route path="churches/:id" element={<ChurchDetailPage />} />
        <Route path="users" element={<UsersRolesPage />} />
        <Route path="billing" element={<BillingLayout />}>
          <Route index element={<Navigate to="plans" replace />} />
          <Route path="plans" element={<BillingPlansPage />} />
          <Route path="subscriptions" element={<BillingSubscriptionsPage />} />
          <Route path="payments" element={<BillingPaymentsPage />} />
          <Route path="revenue" element={<BillingRevenuePage />} />
          <Route path="invoices" element={<BillingInvoicesPage />} />
          <Route path="webhooks" element={<BillingWebhookLogsPage />} />
        </Route>

        <Route path="plans" element={<Navigate to="../billing/plans" replace />} />
        <Route path="subscriptions" element={<Navigate to="../billing/subscriptions" replace />} />
        <Route path="billing-history" element={<Navigate to="../billing/payments" replace />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="settings" element={<SystemSettingsPage />} />

        <Route path="users-roles" element={<Navigate to="../users" replace />} />
        <Route path="audit-log" element={<Navigate to="../audit" replace />} />
        <Route path="system-settings" element={<Navigate to="../settings" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default AppRoutes;
