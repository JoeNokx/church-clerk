import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Auth/useAuth.js";
import { useContext } from "react";
import ChurchContext from "../../Church/church.store.js";

function DashboardHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const churchCtx = useContext(ChurchContext);

  const [menuOpen, setMenuOpen] = useState(false);

  const viewingChurchName = useMemo(() => {
    return churchCtx?.activeChurch?.name || "";
  }, [churchCtx?.activeChurch?.name]);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-sm font-semibold text-blue-900">System Admin</div>
        {viewingChurchName ? (
          <div className="text-xs text-gray-500">Viewing: {viewingChurchName}</div>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((s) => !s)}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
        >
          <span className="font-medium">{user?.fullName || user?.email || "Account"}</span>
          <span className="text-gray-400">▾</span>
        </button>

        {menuOpen ? (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default DashboardHeader;
