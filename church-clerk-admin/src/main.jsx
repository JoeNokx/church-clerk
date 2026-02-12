import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App/App.jsx";
import { AuthProvider } from "./Features/Auth/Store/auth.store.jsx";
import { ChurchProvider } from "./Features/Church/church.store.js";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChurchProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ChurchProvider>
  </React.StrictMode>
);
