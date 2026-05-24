import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App/App.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./features/Auth/store/auth.store.jsx";
import { ChurchProvider } from "./features/Church/church.store.js";
import { PermissionProvider } from "./features/Permissions/permission.store.js";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false
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
