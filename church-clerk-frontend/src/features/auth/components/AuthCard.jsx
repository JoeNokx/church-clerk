import React from "react";
import { Link } from "react-router-dom";

function AuthCard({ children, title, subtitle, footer }) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path d="M12 3L4 8V21H20V8L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-[15px] font-bold tracking-tight text-slate-900">ChurchClerk</span>
      </div>

      {title && (
        <h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          {title}
        </h1>
      )}
      {subtitle && (
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      )}

      <div className="mt-8">
        {children}
      </div>

      {footer && (
        <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>
      )}
    </div>
  );
}

export default AuthCard;
