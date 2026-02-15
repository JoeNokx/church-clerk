import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import DashboardHeader from "../../features/Dashboard/Components/Header.jsx";
import Footer from "../../features/Dashboard/Components/Footer.jsx";
import SystemAdminSidebar from "../../features/SystemAdmin/Components/SystemAdminSidebar.jsx";

function DashboardLayout() {
  const location = useLocation();

  useEffect(() => {
    const path = String(location?.pathname || "");
    const isChurchDetail = /^\/admin\/churches\/[^/]+/i.test(path);
    if (!isChurchDetail) {
      localStorage.removeItem("systemAdminViewChurch");
      localStorage.removeItem("systemAdminActiveChurch");
      localStorage.removeItem("adminViewChurch");
    }
  }, [location?.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <SystemAdminSidebar />

      <div className="flex-1 flex flex-col min-h-0">
        <DashboardHeader />
        <main className="flex-1 min-h-0 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default DashboardLayout;
