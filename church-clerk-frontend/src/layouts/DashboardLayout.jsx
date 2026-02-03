import DashboardHeader from "../features/dashboard/components/Header.jsx";
import Sidebar from "../features/dashboard/components/Sidebar.jsx";
import Footer from "../features/dashboard/components/Footer.jsx";
import { Outlet } from "react-router-dom";



function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
        {/* sidebar */}
        <Sidebar />

        {/* main content*/}
        <div className='flex-1 flex flex-col min-h-0'>

            {/* header */}
            <DashboardHeader />

            <main className="flex-1 min-h-0 p-4 md:p-8 overflow-y-auto">
                <Outlet />
            </main>
            
            {/* footer */}
            <Footer />
        </div>

    </div>
  )
}

export default DashboardLayout