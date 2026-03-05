import { BrowserRouter, useLocation } from "react-router-dom";
import { useEffect } from "react";
import NProgress from "nprogress";
import { startRouteProgress, stopRouteProgress } from "../shared/services/http.js";
import AppRoutes from "./routes.jsx";

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

function App() {
  return (
    <BrowserRouter>
      <RouteProgress />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
