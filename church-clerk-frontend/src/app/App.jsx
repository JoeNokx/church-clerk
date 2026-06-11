import { BrowserRouter, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import NProgress from "nprogress";
import { startRouteProgress, stopRouteProgress } from "../shared/services/http.js";
import AppRoutes from "./routes.jsx";
import ErrorBoundary from "../shared/components/ErrorBoundary.jsx";
import OfflineBanner from "../shared/components/OfflineBanner.jsx";

function RouteProgress() {
  const location = useLocation();

  useEffect(() => {
    NProgress.configure({ showSpinner: false, trickleSpeed: 150 });
  }, []);
 
  useEffect(() => {
    stopRouteProgress();
    return () => {
      startRouteProgress();
    };
  }, [location.pathname, location.search]);

  return null;
}

function SubscriptionLockedModal() {
  const [modal, setModal] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      setModal(e.detail?.message || "Your subscription is suspended. Please contact support.");
    };
    window.addEventListener("subscriptionLocked", handler);
    return () => window.removeEventListener("subscriptionLocked", handler);
  }, []);

  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl text-center md:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div className="font-semibold text-gray-900 mb-2 text-base">Subscription Suspended</div>
        <div className="text-gray-500 mb-6 text-sm">{modal}</div>
        <button
          type="button"
          onClick={() => setModal(null)}
          className="rounded-lg bg-blue-700 py-2 font-semibold text-white hover:bg-blue-800 text-sm px-4 md:px-6"
        >
          OK
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <OfflineBanner />
        <RouteProgress />
        <SubscriptionLockedModal />
        <AppRoutes />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
