import React from "react";
import { Link } from "react-router-dom";

function LandingFooter() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 md:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M12 3L4 8v12a1 1 0 001 1h14a1 1 0 001-1V8L12 3Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M9 21V12h6v9" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[15px] font-bold tracking-tight">ChurchClerk</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              The complete church management platform—members, attendance, finance, ministries, and insights, all in one place built for growing churches.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link to="/register" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">Start Free Trial</Link>
              <Link to="/login" className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors">Log in</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-7 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Product</p>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how" className="hover:text-white transition-colors">How it Works</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Platform</p>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
                <li><span className="text-slate-500">Member Management</span></li>
                <li><span className="text-slate-500">Attendance</span></li>
                <li><span className="text-slate-500">Finance & Giving</span></li>
                <li><span className="text-slate-500">HQ & Branches</span></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Account</p>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
                <li><Link to="/register" className="hover:text-white transition-colors">Create Account</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} ChurchClerk. All rights reserved.</p>
          <p className="text-sm text-slate-600">Built for churches that care about accountability and growth.</p>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
