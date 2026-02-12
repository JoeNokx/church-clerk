function AuthCard({ children, title, subtitle, footer }) {
  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center text-center">
        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center ring-1 ring-blue-100">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-blue-900">
            <path d="M12 3L4 8V21H20V8L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="mt-3 text-base font-semibold text-blue-900 tracking-tight">ChurchClerk</div>

        {title && <h1 className="mt-4 text-3xl font-semibold text-gray-900">{title}</h1>}
        {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 sm:p-8">
        {children}
        {footer && <div className="mt-6 text-sm text-gray-600 text-center">{footer}</div>}
      </div>
    </div>
  );
}

export default AuthCard;
