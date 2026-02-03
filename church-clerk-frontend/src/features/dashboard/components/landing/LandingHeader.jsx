import React from "react";
import { Link } from "react-router-dom";

function LandingHeader() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-blue-900 tracking-tight">ChurchClerk</div>

        <nav className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-gray-700 hover:text-blue-900"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 px-4 py-2 rounded-lg shadow-sm"
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default LandingHeader;
