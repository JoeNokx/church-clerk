import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App/App.jsx";
import { AuthProvider } from "./features/Auth/store/auth.store.jsx";
import { ChurchProvider } from "./features/Church/church.store.js";
import { PermissionProvider } from "./features/Permissions/permission.store.js";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
