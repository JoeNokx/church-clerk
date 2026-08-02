import React from "react";
import { Link } from "react-router-dom";
import LandingHeader from "../components/landing/LandingHeader.jsx";

function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col">
      <LandingHeader />
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <p className="text-4xl font-bold text-white tracking-tight md:text-5xl">
          Coming soon...
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/login" className="rounded-xl border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
            Log in
          </Link>
          <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors">
            Start Free Trial
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ComingSoonPage;
