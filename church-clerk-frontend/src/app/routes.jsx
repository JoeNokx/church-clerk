import { Routes, Route } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import RoleBasedDashboardLayout from "../layouts/RoleBasedDashboardLayout.jsx";

import ProtectedRoute from "../shared/components/ProtectedRoute.jsx";

import Login from "../features/auth/pages/Login.jsx";
import Register from "../features/auth/pages/Register.jsx";
import RegisterChurch from "../features/auth/pages/RegisterChurch.jsx";

import DashboardHome from "../features/dashboard/pages/DashboardHome.jsx";
import Profile from "../features/dashboard/pages/Profile.jsx";
import LandingPage from "../features/dashboard/pages/LandingPage.jsx";
import BillingPage from "../features/subscription/pages/BillingPage.jsx";

import OfferingPage from "../features/offering/pages/OfferingPage.jsx";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<AuthLayout />}>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute><AuthLayout /></ProtectedRoute>}>
        <Route path="/register-church" element={<RegisterChurch />} />
      </Route>

      <Route path="/test" element={<div>Test page renders</div>} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RoleBasedDashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route
        path="/offering"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OfferingPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
