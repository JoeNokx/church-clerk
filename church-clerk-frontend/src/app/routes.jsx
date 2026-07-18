import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import NotFoundPage from "../shared/pages/NotFoundPage.jsx";
import JoinPage from "../features/member/pages/JoinPage.jsx";

import AuthLayout from "../layouts/AuthLayout.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import RoleBasedDashboardLayout from "../layouts/RoleBasedDashboardLayout.jsx";

import ProtectedRoute from "../shared/components/ProtectedRoute.jsx";

import Login from "../features/auth/pages/Login.jsx";
import Register from "../features/auth/pages/Register.jsx";
import RegisterChurch from "../features/auth/pages/RegisterChurch.jsx";
import VerifyEmail from "../features/auth/pages/VerifyEmail.jsx";
import ForgotPassword from "../features/auth/pages/ForgotPassword.jsx";
import ResetPassword from "../features/auth/pages/ResetPassword.jsx";

import DashboardHome from "../features/dashboard/pages/DashboardHome.jsx";
import Profile from "../features/dashboard/pages/Profile.jsx";
import LandingPage from "../features/dashboard/pages/LandingPage.jsx";

const BillingPage = lazy(() => import("../features/subscription/pages/BillingPage.jsx"));
const OfferingPage = lazy(() => import("../features/offering/pages/OfferingPage.jsx"));
const SettingsPage = lazy(() => import("../features/settings/pages/SettingsPage.jsx"));

function RouteSkeletonFallback() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-7 w-48 rounded bg-gray-200" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-gray-200" />
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 md:p-6 lg:p-8">
        <div className="h-4 w-1/2 rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-3/4 rounded bg-gray-200" />
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<AuthLayout />}>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
        <Route
          path="billing"
          element={
            <Suspense fallback={<RouteSkeletonFallback />}>
              <BillingPage />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<RouteSkeletonFallback />}>
              <SettingsPage />
            </Suspense>
          }
        />
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
        <Route
          index
          element={
            <Suspense fallback={<RouteSkeletonFallback />}>
              <OfferingPage />
            </Suspense>
          }
        />
      </Route>

      <Route path="/join/:token" element={<JoinPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
