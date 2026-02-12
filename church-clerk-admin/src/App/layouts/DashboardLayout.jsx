import { Outlet } from "react-router-dom";
import DashboardHeader from "../../Features/Dashboard/Components/Header.jsx";
import Footer from "../../Features/Dashboard/Components/Footer.jsx";
import SystemAdminSidebar from "../../Features/SystemAdmin/Components/SystemAdminSidebar.jsx";

function DashboardLayout() {
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
