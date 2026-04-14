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

  const isHqMonitoringBranch = useMemo(() => {
    if (!homeChurchId) return false;
    if (!activeChurch?._id) return false;
    if (activeChurch?.type !== "Branch") return false;
    return String(activeChurch?.parentChurch || "") === String(homeChurchId);
  }, [activeChurch?._id, activeChurch?.parentChurch, activeChurch?.type, homeChurchId]);

  const bannerName = `${activeChurch?.name || ""}${activeChurch?.city ? ` - ${activeChurch.city}` : ""}`.toUpperCase();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-[16px]">
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
        <Sidebar />
      </div>

      {/* main content*/}
      <div className='flex-1 flex flex-col min-h-0 min-w-0 w-full'>

        {/* header */}
        <DashboardHeader onToggleSidebar={() => setIsSidebarOpen((v) => !v)} />

        <main className="flex-1 min-h-0 min-w-0 w-full p-4 md:p-6 lg:p-8 overflow-y-auto">
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
        </main>
        
        {/* footer */}
        <Footer />
      </div>

    </div>
  )
}

export default DashboardLayout