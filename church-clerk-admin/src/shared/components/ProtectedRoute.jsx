import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../Features/Auth/useAuth.js";
import LoadingSpinner from "./LoadingSpinner.jsx";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner label="Checking session..." />;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  const role = String(user?.role || "");
  const isSuperAdmin = role === "super_admin" || role === "superadmin";
  const isSupportAdmin = role === "supportadmin" || role === "support_admin";

  if (!isSuperAdmin && !isSupportAdmin) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        You are logged in but do not have permission to access the admin portal.
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
