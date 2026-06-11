import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth.js";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center ring-1 ring-blue-100">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-900">
              <path d="M12 3L4 8V21H20V8L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="font-semibold text-blue-900 tracking-tight text-base">ChurchClerk</div>
          <div className="h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  // Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.isEmailVerified === false) {
    if (location.pathname !== "/verify-email") {
      const email = user?.email ? `?email=${encodeURIComponent(user.email)}` : "";
      return <Navigate to={`/verify-email${email}`} replace />;
    }
  }

  // Logged in but no church → register church
  if (!user.church) {
    if (location.pathname !== "/register-church") {
      return <Navigate to="/register-church" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
