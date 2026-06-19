import DashboardHeader from "../features/dashboard/components/Header.jsx";
import Sidebar from "../features/dashboard/components/Sidebar.jsx";
import { Outlet, useLocation } from "react-router-dom";
import { useContext, useMemo, useState } from "react";
import { useAuth } from "../features/auth/useAuth.js";
import ChurchContext from "../features/church/church.store.js";
import SubscriptionStatusBanner from "../shared/components/SubscriptionStatusBanner.jsx";
import { AnimatePresence, motion } from "framer-motion";
import InAppAnnouncementsHost from "../features/inAppAnnouncements/components/InAppAnnouncementsHost.jsx";
import BranchContextNav from "../features/dashboard/components/BranchContextNav.jsx";

function DashboardLayout() {
  const { user } = useAuth();
  const churchCtx = useContext(ChurchContext);
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showBranchBlock, setShowBranchBlock] = useState(false);

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

  const activeChurch = churchCtx?.activeChurch;

  const isChurchSuspended = useMemo(() => {
    return Boolean(activeChurch?._id && activeChurch?.isActive === false);
  }, [activeChurch?._id, activeChurch?.isActive]);

  const isUserSuspended = useMemo(() => {
    return user?.isActive === false;
  }, [user?.isActive]);

  const isHqMonitoringBranch = churchCtx?.isMonitoringBranch || false;

  const isInBranchContext = useMemo(
    () =>
      isHqMonitoringBranch &&
      !!(churchCtx?.branchChurch?._id &&
        activeChurch?._id &&
        String(activeChurch._id) === String(churchCtx.branchChurch._id)),
    [isHqMonitoringBranch, activeChurch?._id, churchCtx?.branchChurch?._id]
  );

  const isReadOnly = isChurchSuspended || isUserSuspended;


  return (
    <div className="flex h-screen h-dvh w-full overflow-hidden bg-slate-50 text-[14px] md:text-[15px] lg:text-[16px] leading-[1.5] md:leading-[1.5] lg:leading-[1.5]">
      {isSidebarOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      {/* sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 md:static md:z-auto md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Sidebar
          onNavigate={() => setIsSidebarOpen(false)}
          onBeforeNavigate={isHqMonitoringBranch ? () => churchCtx.quickSwitchToHq?.() : undefined}
        />
      </div>

      {/* main content*/}
      <div className='flex-1 flex flex-col min-h-0 min-w-0 w-full'>

        {/* header */}
        <DashboardHeader onToggleSidebar={() => setIsSidebarOpen((v) => !v)} />

        {/* branch context navigation bar — hidden when user switched to HQ sidebar view */}
        {isHqMonitoringBranch && isInBranchContext && (
          <BranchContextNav
            homeChurchName={homeChurchName}
            homeChurchId={homeChurchId}
          />
        )}

        <main className="flex-1 min-h-0 min-w-0 w-full p-[16px] md:p-[24px] overflow-y-auto md:p-8 lg:p-4">
          {isUserSuspended && (
            <div className="mb-4 rounded-xl border-2 border-red-500 bg-red-50 px-4 py-3 text-red-900 text-sm">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <div className="font-bold">Your Account Has Been Suspended</div>
                  <div className="mt-0.5 text-red-800 text-sm">
                    Your account has been suspended by the system administrator.
                    All actions are restricted. Please contact support to resolve this.
                  </div>
                </div>
              </div>
            </div>
          )}
          {isChurchSuspended && (
            <div className="mb-4 rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-red-900 text-sm">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <div>
                  <div className="font-bold">Church Account Suspended</div>
                  <div className="mt-0.5 text-red-800 text-sm">
                    <strong>{activeChurch?.name || "This church"}</strong> has been suspended by the system administrator.
                    All actions are restricted. Please contact support to resolve this.
                  </div>
                </div>
              </div>
            </div>
          )}
          <SubscriptionStatusBanner />
          <InAppAnnouncementsHost />

          {isHqMonitoringBranch && isInBranchContext && (
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-800 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Branch Data · View Only
                <span className="ml-1 font-normal text-amber-700">— {churchCtx?.branchChurch?.name || "Branch"}</span>
              </span>
            </div>
          )}

          <div
            className={`relative ${isReadOnly ? "pointer-events-none select-none" : ""}`}
            onClickCapture={isInBranchContext ? (e) => {
              const actionable = e.target.closest(
                'button, a, input, textarea, select, [role="button"], [tabindex]'
              );
              if (!actionable) return;
              e.stopPropagation();
              e.preventDefault();
              setShowBranchBlock(true);
            } : undefined}
          >
            {isReadOnly && (
              <div className="absolute inset-0 z-10 rounded-xl bg-white/50" />
            )}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                className="cck-dashboard-outlet w-full"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Branch view-only modal */}
          {showBranchBlock && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
              onClick={() => setShowBranchBlock(false)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-4 md:p-6 lg:p-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                    <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0-6v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">View-Only Access</h3>
                    <p className="mt-1.5 text-gray-500 leading-relaxed text-sm">
                      As a <span className="font-semibold text-gray-700">Headquarters admin</span>, you can only
                      view branch data. To make changes, a branch admin must log in directly.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-xl bg-gray-900 py-2.5 font-semibold text-white hover:bg-gray-700 transition-colors text-sm"
                    onClick={() => setShowBranchBlock(false)}
                  >
                    Got It
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

    </div>
  )
}

export default DashboardLayout