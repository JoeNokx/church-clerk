import { useState } from "react";
import { Outlet } from "react-router-dom";
import DashboardHeader from "../../features/Dashboard/Components/Header.jsx";
import Footer from "../../features/Dashboard/Components/Footer.jsx";
import SystemAdminSidebar from "../../features/SystemAdmin/Components/SystemAdminSidebar.jsx";

function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <SystemAdminSidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <DashboardHeader onMobileMenuToggle={() => setMobileNavOpen(true)} />
        <main className="flex-1 min-h-0 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default DashboardLayout;
