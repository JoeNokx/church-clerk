import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import ChurchContext from "../../church/church.store.js";
import { getMyBranches } from "../../church/services/church.api.js";

function DashboardHeader() {

    const navigate = useNavigate();

    const {user, logout} = useAuth();
    const churchCtx = useContext(ChurchContext);

    const [churchMenuOpen, setChurchMenuOpen] = useState(false);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [branchesError, setBranchesError] = useState("");
    const [branches, setBranches] = useState([]);

    const menuRef = useRef(null);
    const accountRef = useRef(null);

    const activeChurch = churchCtx?.activeChurch;

    const homeChurchId = useMemo(() => {
      const c = user?.church;
      if (!c) return null;
      return typeof c === "string" ? c : c?._id || null;
    }, [user]);

    const homeChurchName = useMemo(() => {
      const c = user?.church;
      if (!c) return "";
      if (typeof c === "string") return "";
      return c?.name || "";
    }, [user]);

    const isHeadquartersUser = useMemo(() => {
      if (!homeChurchId) return false;
      if (!activeChurch?._id) return false;

      if (activeChurch?.type === "Headquarters") {
        return String(activeChurch._id) === String(homeChurchId);
      }

      if (activeChurch?.type === "Branch") {
        return String(activeChurch?.parentChurch || "") === String(homeChurchId);
      }

      return false;
    }, [activeChurch, homeChurchId]);

    const canSwitchContext = isHeadquartersUser;
    const canViewBranches = activeChurch?.type === "Headquarters" && String(activeChurch?._id || "") === String(homeChurchId || "");

    const viewingChurchName = activeChurch?.name || homeChurchName || "—";
    const viewingChurchId = activeChurch?._id || homeChurchId || null;

    const loadBranches = useCallback(async () => {
      setBranchesLoading(true);
      setBranchesError("");
      try {
        const res = await getMyBranches({ page: 1, limit: 50 });
        const payload = res?.data?.data ?? res?.data;
        const rows = Array.isArray(payload?.branches) ? payload.branches : Array.isArray(payload) ? payload : [];
        setBranches(rows);
      } catch (e) {
        setBranches([]);
        setBranchesError(e?.response?.data?.message || e?.message || "Failed to load branches");
      } finally {
        setBranchesLoading(false);
      }
    }, []);

    const switchToChurch = useCallback(async (churchId) => {
      if (!churchId || typeof churchCtx?.switchChurch !== "function") return;
      if (churchId === viewingChurchId) {
        setChurchMenuOpen(false);
        return;
      }

      try {
        await churchCtx.switchChurch(churchId);
        setChurchMenuOpen(false);
      } catch (e) {
        setBranchesError(e?.response?.data?.message || e?.message || "Failed to switch church");
      }
    }, [churchCtx, viewingChurchId]);

    useEffect(() => {
      if (canSwitchContext) return;
      setBranchesError("");
      setBranches([]);
      setBranchesLoading(false);
      setChurchMenuOpen(false);
    }, [canSwitchContext]);

    useEffect(() => {
      if (!churchMenuOpen) return;
      if (!canViewBranches) return;
      if (branches.length) return;
      loadBranches();
    }, [branches.length, canViewBranches, churchMenuOpen, loadBranches]);

    const viewAllBranches = useCallback(async () => {
      try {
        if (homeChurchId && String(activeChurch?._id || "") !== String(homeChurchId)) {
          await churchCtx?.switchChurch?.(homeChurchId);
        }
      } catch (e) {
        void e;
      } finally {
        setChurchMenuOpen(false);
        navigate("/dashboard?page=branches-overview");
      }
    }, [activeChurch?._id, churchCtx, homeChurchId, navigate]);

    useEffect(() => {
      const handleOutside = (event) => {
        const el = menuRef.current;
        if (!el) return;
        if (el.contains(event.target)) return;
        setChurchMenuOpen(false);
      };

      if (churchMenuOpen) {
        document.addEventListener("mousedown", handleOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleOutside);
      };
    }, [churchMenuOpen]);

    useEffect(() => {
      const handleOutside = (event) => {
        const el = accountRef.current;
        if (!el) return;
        if (el.contains(event.target)) return;
        setAccountMenuOpen(false);
      };

      if (accountMenuOpen) {
        document.addEventListener("mousedown", handleOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleOutside);
      };
    }, [accountMenuOpen]);

    const displayRole = user?.role
      ? user.role === "churchadmin"
        ? "Church Admin"
        : user.role === "financialofficer"
          ? "Financial Officer"
          : user.role === "superadmin"
            ? "System Admin"
            : user.role
      : "";

    const avatarUrl =
      user?.profileImageUrl ||
      user?.avatarUrl ||
      user?.photoUrl ||
      user?.imageUrl ||
      user?.image ||
      "";

    const handleViewProfile = () => {
      setAccountMenuOpen(false);
      navigate("/dashboard?page=settings&tab=my-profile");
    };

    const handleChangePassword = () => {
      setAccountMenuOpen(false);
      navigate("/dashboard?page=settings&tab=my-profile&section=password");
    };

    const handleHelpSupport = () => {
      setAccountMenuOpen(false);
      navigate("/dashboard?page=support-help");
    };

    const handleFaq = () => {
      setAccountMenuOpen(false);
      navigate("/dashboard?page=support-help#faq");
    };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="h-16 px-4 md:px-8 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xl font-semibold text-gray-900">Dashboard</div>
          <div className="text-sm text-gray-600 truncate">Welcome back! Here’s what’s happening with your church</div>
        </div>

        <div className="hidden md:flex items-center justify-center flex-1">
          <div className="relative" ref={menuRef}>
            {canSwitchContext ? (
              <button
                type="button"
                onClick={() => setChurchMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm hover:bg-gray-50"
              >
                <span className="text-xs text-gray-500">Viewing:</span>
                <div className="inline-flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{viewingChurchName}</span>
                  {activeChurch?._id && activeChurch?.canEdit === false ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Read-only
                    </span>
                  ) : null}
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-500">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                <span className="text-xs text-gray-500">Viewing:</span>
                <span className="text-sm font-medium text-gray-900">{viewingChurchName}</span>
              </div>
            )}

            {canSwitchContext && churchMenuOpen ? (
              <div className="absolute left-0 top-full mt-2 w-[360px] rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="text-xs font-semibold text-gray-500">Currently viewing</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900 truncate">{viewingChurchName}</div>
                </div>

                {branchesError ? (
                  <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">{branchesError}</div>
                ) : null}

                <div className="p-2">
                  {homeChurchId ? (
                    <button
                      type="button"
                      onClick={() => switchToChurch(homeChurchId)}
                      className={`w-full text-left rounded-lg px-3 py-2 hover:bg-gray-50 ${viewingChurchId === homeChurchId ? "bg-blue-50" : ""}`}
                    >
                      <div className="text-sm font-semibold text-gray-900 truncate">{homeChurchName || "Headquarters"}</div>
                      <div className="mt-0.5 text-xs text-gray-500">Headquarters</div>
                    </button>
                  ) : null}

                  <div className="mt-2 px-3 py-1 text-xs font-semibold text-gray-400 tracking-wider">BRANCHES</div>

                  {branchesLoading ? (
                    <div className="px-3 py-2 text-sm text-gray-600">Loading…</div>
                  ) : branches.length ? (
                    <div className="mt-1">
                      {branches.map((b) => (
                        <button
                          key={b?._id}
                          type="button"
                          onClick={() => switchToChurch(b?._id)}
                          className={`w-full text-left rounded-lg px-3 py-2 hover:bg-gray-50 ${viewingChurchId === b?._id ? "bg-blue-50" : ""}`}
                        >
                          <div className="text-sm font-semibold text-gray-900 truncate">{b?.name || "—"}</div>
                          <div className="mt-0.5 text-xs text-gray-500 truncate">
                            {`${b?.city || ""}${b?.region ? `, ${b.region}` : ""}`.trim() || "—"}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-600">
                      {canViewBranches ? "No branches found." : "Switch to Headquarters to load branches."}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={viewAllBranches}
                    className="mt-2 w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    View all branches
                  </button>
                </div>
              </div>
            ) : null}
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

          <div className="relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((v) => !v)}
              className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-gray-50"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.fullName || "User"}
                  className="h-9 w-9 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-blue-900 text-white flex items-center justify-center text-sm font-semibold">
                  {(user?.fullName || "U").slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="hidden sm:block leading-tight text-left">
                <div className="text-sm font-semibold text-gray-900">{user?.fullName || "User"}</div>
                <div className="text-xs text-gray-500">{displayRole}</div>
              </div>

              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-500">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            {accountMenuOpen ? (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-900">My Account</div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={handleViewProfile}
                    className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-500">
                      <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    View Profile
                  </button>
                  <div className="border-t border-gray-100" />

                  <button
                    type="button"
                    onClick={handleChangePassword}
                    className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-500">
                      <path d="M7 11V8a5 5 0 0110 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M6 11h12v10H6V11Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M12 15v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    Change Password
                  </button>
                  <div className="border-t border-gray-100" />

                  <button
                    type="button"
                    onClick={handleHelpSupport}
                    className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-500">
                      <path d="M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M9.5 9a2.5 2.5 0 115 0c0 2-2.5 2-2.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0Z" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                    Help &amp; Support
                  </button>
                  <div className="border-t border-gray-100" />

                  <button
                    type="button"
                    onClick={handleFaq}
                    className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-500">
                      <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M5 4h14v16H7l-2 2V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                    FAQ
                  </button>
                  <div className="border-t border-gray-100" />

                  <button
                    type="button"
                    onClick={async () => {
                      setAccountMenuOpen(false);
                      await logout();
                    }}
                    className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-red-500">
                      <path d="M10 7V5a2 2 0 012-2h7a2 2 0 012 2v14a2 2 0 01-2 2h-7a2 2 0 01-2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M4 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M7 9l-3 3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader