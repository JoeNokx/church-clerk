import { Outlet } from "react-router-dom";

function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      {children ?? <Outlet />}
    </div>
  );
}

export default AuthLayout;
