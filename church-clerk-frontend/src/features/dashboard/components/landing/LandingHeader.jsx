import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const NAV = [
  { label: "Product", href: "/product" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" }
];

function LandingHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="sticky top-0 z-50 border-b border-slate-200 bg-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3.5 md:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 3L4 8v12a1 1 0 001 1h14a1 1 0 001-1V8L12 3Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M9 21V12h6v9" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-slate-900">ChurchClerk</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "text-blue-700 underline underline-offset-4 decoration-blue-700 decoration-2"
                    : "text-slate-600 hover:text-blue-700 hover:underline hover:underline-offset-4 hover:decoration-blue-700 hover:decoration-2"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/login" className="rounded-lg border border-transparent px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-blue-700">
            Login
          </Link>
          <Link to="/register" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors">
            Get Started
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="md:hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          aria-label="Menu"
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute inset-x-0 top-full z-50 border-b border-slate-200 bg-white md:hidden"
          >
            <div className="mx-auto max-w-7xl space-y-1 px-4 py-3">
              {NAV.map(item => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-50 hover:text-blue-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="grid grid-cols-2 gap-2 pt-2 pb-1">
                <Link to="/login" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 py-2.5 text-center text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">Login</Link>
                <Link to="/register" onClick={() => setOpen(false)} className="rounded-lg bg-blue-700 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-800">Get Started</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LandingHeader;
