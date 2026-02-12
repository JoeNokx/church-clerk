import { Navigate, Route, Routes } from "react-router-dom";
import AuthLayout from "../Layouts/AuthLayout.jsx";
import DashboardLayout from "../Layouts/DashboardLayout.jsx";
import Login from "../../Features/Auth/Pages/Login.jsx";
import DashboardHome from "../../Features/Dashboard/Pages/DashboardHome.jsx";
import ProtectedRoute from "../../Shared/Components/ProtectedRoute.jsx";
import ChurchesPage from "../../Features/SystemAdmin/Pages/ChurchesPage.jsx";
import ChurchDetailPage from "../../Features/SystemAdmin/Pages/ChurchDetailPage.jsx";
import UsersRolesPage from "../../Features/SystemAdmin/Pages/UsersRolesPage.jsx";
import BillingLayout from "../../Features/SystemAdmin/Pages/BillingLayout.jsx";
import BillingPlansPage from "../../Features/SystemAdmin/Pages/BillingPlansPage.jsx";
import BillingSubscriptionsPage from "../../Features/SystemAdmin/Pages/BillingSubscriptionsPage.jsx";
import BillingPaymentsPage from "../../Features/SystemAdmin/Pages/BillingPaymentsPage.jsx";
import BillingRevenuePage from "../../Features/SystemAdmin/Pages/BillingRevenuePage.jsx";
import BillingInvoicesPage from "../../Features/SystemAdmin/Pages/BillingInvoicesPage.jsx";
import BillingWebhookLogsPage from "../../Features/SystemAdmin/Pages/BillingWebhookLogsPage.jsx";
import ReferralsPage from "../../Features/SystemAdmin/Pages/ReferralsPage.jsx";
import AuditLogPage from "../../Features/SystemAdmin/Pages/AuditLogPage.jsx";
import SystemSettingsPage from "../../Features/SystemAdmin/Pages/SystemSettingsPage.jsx";

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
