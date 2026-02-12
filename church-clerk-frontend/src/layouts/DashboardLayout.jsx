import DashboardHeader from "../features/dashboard/components/Header.jsx";
import Sidebar from "../features/dashboard/components/Sidebar.jsx";
import Footer from "../features/dashboard/components/Footer.jsx";
import { Outlet } from "react-router-dom";
import { useContext, useMemo } from "react";
import { useAuth } from "../features/auth/useAuth.js";
import ChurchContext from "../features/church/church.store.js";
import SubscriptionStatusBanner from "../shared/components/SubscriptionStatusBanner.jsx";

function DashboardLayout() {
  const { user } = useAuth();
  const churchCtx = useContext(ChurchContext);

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
    <div className="flex h-screen overflow-hidden bg-slate-50">
        {/* sidebar */}
        <Sidebar />

        {/* main content*/}
        <div className='flex-1 flex flex-col min-h-0'>

            {/* header */}
            <DashboardHeader />

            <main className="flex-1 min-h-0 p-4 md:p-8 overflow-y-auto">
                <SubscriptionStatusBanner />
                {isHqMonitoringBranch ? (
                  <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    <span className="font-semibold">Hello {user?.fullName || ""}</span>, you&apos;re viewing{" "}
                    <span className="font-bold">{bannerName}</span> data, which is your branch.
                    {homeChurchName ? (
                      <span className="ml-2 text-xs text-blue-800">(Headquarters: {homeChurchName})</span>
                    ) : null}
                  </div>
                ) : null}
                <Outlet />
            </main>
            
            {/* footer */}
            <Footer />
        </div>

    </div>
  )
}

export default DashboardLayout