import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth.js";

function SuperAdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Checking session...</div>;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isSuperAdmin = user.role === "super_admin" || user.role === "superadmin";

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default SuperAdminRoute;
