import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth.js";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Checking session...</div>;

  // Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Logged in but no church (and not superadmin) → register church
  if (!user.church && user.role !== "superadmin" && user.role !== "super_admin") {
    if (location.pathname !== "/register-church") {
      return <Navigate to="/register-church" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
