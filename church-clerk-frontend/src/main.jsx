import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.jsx";
import { AuthProvider } from "./features/auth/auth.store.jsx";
import { PermissionProvider } from "./features/permissions/permission.store.js";
import { ChurchProvider } from "./features/church/church.store.js";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "nprogress/nprogress.css";
import "react-loading-skeleton/dist/skeleton.css";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChurchProvider>
      <PermissionProvider>
        <AuthProvider>
          <App />
          <ToastContainer position="top-right" autoClose={3000} limit={3} />
        </AuthProvider>
      </PermissionProvider>
    </ChurchProvider>
  </React.StrictMode>
);
