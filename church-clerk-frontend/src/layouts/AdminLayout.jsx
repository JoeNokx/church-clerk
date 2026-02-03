import { Outlet } from "react-router-dom";
import AdminBillingSidebar from "../features/adminBilling/components/AdminBillingSidebar.jsx";
import DashboardHeader from "../features/dashboard/components/Header.jsx";
import Footer from "../features/dashboard/components/Footer.jsx";

function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AdminBillingSidebar />

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

export default AdminLayout;
