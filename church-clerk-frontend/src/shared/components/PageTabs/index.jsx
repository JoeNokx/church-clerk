function PageTabs({ tabs = [], activeTab, onChange, sticky = true, stickyBg = "bg-white", className = "" }) {
  return (
    <div className={`border-b border-gray-200 ${sticky ? `sticky top-0 z-10 ${stickyBg}` : ""} ${className}`}>
      <div className="flex -mb-px overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange?.(t.key)}
            className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {t.label}
            {t.badge != null ? (
              <span className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 font-semibold text-xs ${t.badgeColor || "bg-gray-200 text-gray-700"}`}>
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export default PageTabs;
