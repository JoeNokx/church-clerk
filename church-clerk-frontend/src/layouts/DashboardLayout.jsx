import DashboardHeader from "../features/dashboard/components/Header.jsx";
import Sidebar from "../features/dashboard/components/Sidebar.jsx";
import Footer from "../features/dashboard/components/Footer.jsx";
import { Outlet, useLocation } from "react-router-dom";
import { useContext, useMemo, useState } from "react";
import { useAuth } from "../features/auth/useAuth.js";
import ChurchContext from "../features/church/church.store.js";
import SubscriptionStatusBanner from "../shared/components/SubscriptionStatusBanner.jsx";
import { AnimatePresence, motion } from "framer-motion";
import InAppAnnouncementsHost from "../features/inAppAnnouncements/components/InAppAnnouncementsHost.jsx";

function DashboardLayout() {
  const { user } = useAuth();
  const churchCtx = useContext(ChurchContext);
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const isReadOnly = isChurchSuspended || isUserSuspended;

  const isHqMonitoringBranch = useMemo(() => {
    if (!homeChurchId) return false;
    if (!activeChurch?._id) return false;
    if (activeChurch?.type !== "Branch") return false;
    return String(activeChurch?.parentChurch || "") === String(homeChurchId);
  }, [activeChurch?._id, activeChurch?.parentChurch, activeChurch?.type, homeChurchId]);

  const bannerName = `${activeChurch?.name || ""}${activeChurch?.city ? ` - ${activeChurch.city}` : ""}`.toUpperCase();

  return (
    <div className="flex h-screen h-dvh w-full overflow-hidden bg-slate-50 text-[16px] max-sm:text-[14px] max-sm:leading-6 sm:max-lg:text-base sm:max-lg:leading-7">
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
        <Sidebar onNavigate={() => setIsSidebarOpen(false)} />
      </div>

      {/* main content*/}
      <div className='flex-1 flex flex-col min-h-0 min-w-0 w-full'>

        {/* header */}
        <DashboardHeader onToggleSidebar={() => setIsSidebarOpen((v) => !v)} />

        <main className="flex-1 min-h-0 min-w-0 w-full p-4 lg:p-8 max-sm:px-4 max-sm:py-3 sm:max-lg:px-6 sm:max-lg:py-4 overflow-y-auto">
          {isUserSuspended && (
            <div className="mb-4 rounded-xl border-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-900">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <div className="font-bold">Your Account Has Been Suspended</div>
                  <div className="mt-0.5 text-sm text-red-800">
                    Your account has been suspended by the system administrator.
                    All actions are restricted. Please contact support to resolve this.
                  </div>
                </div>
              </div>
            </div>
          )}
          {isChurchSuspended && (
            <div className="mb-4 rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-900">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <div>
                  <div className="font-bold">Church Account Suspended</div>
                  <div className="mt-0.5 text-sm text-red-800">
                    <strong>{activeChurch?.name || "This church"}</strong> has been suspended by the system administrator.
                    All actions are restricted. Please contact support to resolve this.
                  </div>
                </div>
              </div>
            </div>
          )}
          <SubscriptionStatusBanner />
          <InAppAnnouncementsHost />
          {isHqMonitoringBranch ? (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <span className="font-semibold">Hello {user?.fullName || ""}</span>, you&apos;re viewing{" "}
              <span className="font-bold">{bannerName}</span> data, which is your branch.
              {homeChurchName ? (
                <span className="ml-2 text-xs text-blue-800">(Headquarters: {homeChurchName})</span>
              ) : null}
            </div>
          ) : null}

          <div className={`relative ${isReadOnly ? "pointer-events-none select-none" : ""}`}>
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
        </main>
        
        {/* footer */}
        <Footer />
      </div>

    </div>
  )
}

export default DashboardLayout