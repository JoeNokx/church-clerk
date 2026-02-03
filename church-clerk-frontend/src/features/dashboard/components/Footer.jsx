
import React from "react";

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 px-4 md:px-8 py-4 text-sm text-gray-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="font-semibold text-blue-900">ChurchClerk</div>
        <div>© {new Date().getFullYear()} ChurchClerk. All rights reserved.</div>
      </div>
    </footer>
  );
}

export default Footer;

