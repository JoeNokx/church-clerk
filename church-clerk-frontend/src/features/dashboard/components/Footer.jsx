
import React from "react";

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 px-4 md:px-8 py-4 text-gray-500 text-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="font-semibold text-blue-900">ChurchClerk</div>
        <div>© {new Date().getFullYear()} ChurchClerk. All rights reserved.</div>
      </div>
    </footer>
  );
}

export default Footer;

