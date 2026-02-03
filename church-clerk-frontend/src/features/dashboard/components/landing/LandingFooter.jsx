import React from "react";
import { Link } from "react-router-dom";

function LandingFooter() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="text-base font-semibold text-blue-900">ChurchClerk</div>
            <p className="mt-2 text-sm text-gray-600">
              Simple tools to manage members, attendance, and giving—without spreadsheets.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-blue-900">
              Login
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium text-gray-700 hover:text-blue-900"
            >
              Register
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
          © {new Date().getFullYear()} ChurchClerk. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
