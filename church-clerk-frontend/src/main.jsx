import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./features/auth/auth.store.jsx";
import { PermissionProvider } from "./features/permissions/permission.store.js";
import { ChurchProvider } from "./features/church/church.store.js";
import { ToastContainer } from "react-toastify";
import { bootstrapDelegateSession } from "./shared/utils/delegateSession.js";
import "react-toastify/dist/ReactToastify.css";
import "nprogress/nprogress.css";
import "react-loading-skeleton/dist/skeleton.css";
import "./styles/index.css";

// Detect and store a delegated session token before React mounts,
// so the auth provider and http interceptor pick it up naturally.
bootstrapDelegateSession();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ChurchProvider>
        <PermissionProvider>
          <AuthProvider>
            <App />
            <ToastContainer position="top-right" autoClose={3000} limit={3} />
          </AuthProvider>
        </PermissionProvider>
      </ChurchProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
