import React from "react";
import { Link } from "react-router-dom";

function LandingFooter() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="h-11 w-11 rounded-xl bg-white/10 text-white flex items-center justify-center font-semibold md:h-12 md:w-12">C</div>
              <div>
                <div className="font-semibold tracking-tight text-base">ChurchClerk</div>
                <div className="text-white/60 text-xs">Church management, simplified.</div>
              </div>
            </div>
            <p className="mt-4 text-white/70 max-w-md text-sm">
              A modern church management system for members, attendance, announcements, and finance—built for clarity, accountability, and growth.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <Link to="/register" className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 font-semibold text-slate-950 hover:bg-slate-100 text-sm">
                Start free trial
              </Link>
              <Link to="/login" className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 px-4 py-2 font-semibold text-white hover:bg-white/10 text-sm">
                Login
              </Link>
            </div>
          </div>

          <div>
            <div className="font-semibold text-sm">Product</div>
            <div className="mt-4 grid gap-2 text-white/70 text-sm">
              <a href="#features" className="hover:text-white">Features</a>
              <a href="#how" className="hover:text-white">How it works</a>
              <a href="#pricing" className="hover:text-white">Pricing</a>
              <a href="#faq" className="hover:text-white">FAQ</a>
            </div>
          </div>

          <div>
            <div className="font-semibold text-sm">Get Started</div>
            <div className="mt-4 grid gap-2 text-white/70 text-sm">
              <Link to="/register" className="hover:text-white">Create an account</Link>
              <Link to="/login" className="hover:text-white">Sign in</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-white/60 text-sm">
          <div>© {new Date().getFullYear()} ChurchClerk. All rights reserved.</div>
          <div className="flex items-center gap-4 md:gap-5">
            <a href="#pricing" className="hover:text-white">Plans</a>
            <a href="#features" className="hover:text-white">Features</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
