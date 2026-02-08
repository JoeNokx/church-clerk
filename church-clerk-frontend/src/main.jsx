import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.jsx";
import { AuthProvider } from "./features/auth/auth.store.jsx";
import { PermissionProvider } from "./features/permissions/permission.store.js";
import { ChurchProvider } from "./features/church/church.store.js";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChurchProvider>
      <PermissionProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PermissionProvider>
    </ChurchProvider>
  </React.StrictMode>
);
