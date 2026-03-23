import React from "react";
import { Link } from "react-router-dom";

function LandingFooter() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-white/10 text-white flex items-center justify-center font-semibold">C</div>
              <div>
                <div className="text-base font-semibold tracking-tight">ChurchClerk</div>
                <div className="text-xs text-white/60">Church management, simplified.</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/70 max-w-md">
              A modern church management system for members, attendance, announcements, and finance—built for clarity, accountability, and growth.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <Link to="/register" className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100">
                Start free trial
              </Link>
              <Link to="/login" className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
                Login
              </Link>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold">Product</div>
            <div className="mt-4 grid gap-2 text-sm text-white/70">
              <a href="#features" className="hover:text-white">Features</a>
              <a href="#how" className="hover:text-white">How it works</a>
              <a href="#pricing" className="hover:text-white">Pricing</a>
              <a href="#faq" className="hover:text-white">FAQ</a>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold">Get Started</div>
            <div className="mt-4 grid gap-2 text-sm text-white/70">
              <Link to="/register" className="hover:text-white">Create an account</Link>
              <Link to="/login" className="hover:text-white">Sign in</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-white/60">
          <div>© {new Date().getFullYear()} ChurchClerk. All rights reserved.</div>
          <div className="flex items-center gap-5">
            <a href="#pricing" className="hover:text-white">Plans</a>
            <a href="#features" className="hover:text-white">Features</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
