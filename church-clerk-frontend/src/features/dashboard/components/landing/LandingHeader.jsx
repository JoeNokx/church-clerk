import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

function LandingHeader() {
  const [open, setOpen] = useState(false);

  const navItems = useMemo(() => {
    return [
      { label: "Features", href: "#features" },
      { label: "How it Works", href: "#how" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" }
    ];
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-11 w-11 rounded-xl bg-blue-900 text-white flex items-center justify-center font-semibold md:h-12 md:w-12">C</div>
          <div className="leading-tight">
            <div className="font-semibold text-gray-900 tracking-tight text-sm">ChurchClerk</div>
            <div className="text-[11px] text-gray-500">Church management</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-4 md:gap-6">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="font-medium text-gray-700 hover:text-blue-900 text-sm">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="font-medium text-gray-700 hover:text-blue-900 text-sm">
            Login
          </Link>
          <Link
            to="/register"
            className="font-semibold text-white bg-blue-900 hover:bg-blue-800 px-4 py-2 rounded-lg shadow-sm text-sm"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12"
          aria-label="Toggle menu"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open ? (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-4 space-y-3">
            <div className="grid gap-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 font-medium text-gray-700 hover:bg-gray-50 text-sm"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link to="/login" className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 text-center hover:bg-gray-50 text-sm">
                Login
              </Link>
              <Link to="/register" className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white text-center hover:bg-blue-800 text-sm">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default LandingHeader;
