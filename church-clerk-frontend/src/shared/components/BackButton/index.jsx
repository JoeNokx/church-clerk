function BackButton({ onClick, label = "Back", className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-semibold ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {label}
    </button>
  );
}

export default BackButton;
