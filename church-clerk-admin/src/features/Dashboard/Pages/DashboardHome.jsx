import { useAuth } from "../../Auth/useAuth.js";

function DashboardHome() {
  const { user } = useAuth();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
      <p className="text-sm text-gray-600">Welcome {user?.fullName || user?.email || ""}</p>
    </div>
  );
}

export default DashboardHome;
