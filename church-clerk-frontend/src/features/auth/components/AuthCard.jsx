import React from "react";

function AuthCard({ children, title, subtitle, footer }) {
  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center text-center">
        <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center ring-1 ring-blue-100 md:h-12 md:w-12">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-blue-900"
          >
            <path
              d="M12 3L4 8V21H20V8L12 3Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M9 21V12H15V21"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="mt-3 font-semibold text-blue-900 tracking-tight text-base">ChurchClerk</div>

        {title && <h1 className="mt-3 font-bold text-gray-900 tracking-tight md:text-3xl lg:text-4xl text-xl md:text-2xl">{title}</h1>}
        {subtitle && <p className="mt-2 text-gray-600 text-sm">{subtitle}</p>}
      </div>

      <div className="mt-6 md:mt-8 bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 md:p-8 p-4 md:p-5">
        {children}

        {footer && <div className="mt-6 text-gray-600 text-center text-sm">{footer}</div>}
      </div>
    </div>
  );
}

export default AuthCard;
