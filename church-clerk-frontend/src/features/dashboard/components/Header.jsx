import { useAuth } from "../../auth/useAuth.js";

function DashboardHeader() {

    const {user, logout} = useAuth();

    const displayRole = user?.role
      ? user.role === "churchadmin"
        ? "Church Admin"
        : user.role === "financialofficer"
          ? "Financial Officer"
          : user.role === "superadmin"
            ? "System Admin"
            : user.role
      : "";

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="h-16 px-4 md:px-8 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xl font-semibold text-gray-900">Dashboard</div>
          <div className="text-sm text-gray-600 truncate">Welcome back! Here’s what’s happening with your church</div>
        </div>

        <div className="hidden md:flex items-center justify-center flex-1">
          <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-xs text-gray-500">Viewing:</span>
            <div className="inline-flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Headquarters Church</span>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-500">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button type="button" className="relative h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-600">
              <path d="M15 17H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M18 9a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center">2</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-900 text-white flex items-center justify-center text-sm font-semibold">
              {(user?.fullName || "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-semibold text-gray-900">{user?.fullName || "User"}</div>
              <div className="text-xs text-gray-500">{displayRole}</div>
            </div>
          </div>

          <button onClick={logout} className="text-sm font-medium text-red-600 hover:underline">
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader