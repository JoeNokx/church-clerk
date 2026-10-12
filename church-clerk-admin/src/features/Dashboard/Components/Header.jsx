import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Auth/useAuth.js";

function DashboardHeader({ onMobileMenuToggle }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-8 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {/* Hamburger — visible only below lg breakpoint */}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
          aria-label="Open navigation menu"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="text-sm font-semibold text-blue-900">System Admin</div>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((s) => !s)}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
        >
          <span className="font-medium">{user?.fullName || user?.email || "Account"}</span>
          <span className="text-gray-400">▾</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden z-50">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default DashboardHeader;
