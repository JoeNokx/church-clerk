import { useMemo } from "react";

function KpiCard({ title, value, subtitle, change, compareLabel, diff, onClick, icon, accent, iconBg, iconColor, tooltip }) {
  const deltaClass = useMemo(() => {
    if (change === undefined || change === null) return "bg-gray-100 text-gray-600";
    if (change > 0) return "bg-green-100 text-green-700";
    if (change < 0) return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  }, [change]);

  const deltaText = useMemo(() => {
    if (change === undefined || change === null) return "—";
    const sign = change > 0 ? "+" : "";
    return `${sign}${Math.round(change)}%`;
  }, [change]);

  const arrow = useMemo(() => {
    if (change === undefined || change === null) return null;
    if (change > 0) {
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
          <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5-5.25a.75.75 0 011.08 0l5 5.25a.75.75 0 11-1.08 1.04L10.75 5.612V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
        </svg>
      );
    }
    if (change < 0) {
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
          <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5 5.25a.75.75 0 01-1.08 0l-5-5.25a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
        </svg>
      );
    }
    return null;
  }, [change]);

  const diffLabel = useMemo(() => {
    if (diff === undefined || diff === null) return compareLabel || null;
    const period = compareLabel || "last month";
    if (diff > 0) return `${diff} more than ${period}`;
    if (diff < 0) return `${Math.abs(diff)} less than ${period}`;
    return `No change from ${period}`;
  }, [diff, compareLabel]);

  const topBar = accent || null;
  const isSimpleVariant = !icon && !change && !onClick;
  const isColoredIconVariant = iconBg && !onClick;
  const isStaticIconVariant = !!(icon && !onClick && !iconBg);

  if (isSimpleVariant) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-white${topBar ? " overflow-hidden" : ""}`}>
        {topBar && <div className={`h-1.5 ${topBar}`} />}
        <div className="p-3 md:p-4">
          <div className="flex items-center gap-1.5">
            <div className="font-semibold text-gray-500 text-xs">{title}</div>
            {tooltip && (
              <div className="group relative flex-shrink-0">
                <button
                  type="button"
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={`Info: ${title}`}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm.75 14.5h-1.5v-6h1.5v6zm0-7.5h-1.5V7.5h1.5V9z" />
                  </svg>
                </button>
                <div className="pointer-events-none invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute top-full left-0 z-50 mt-2 w-52 rounded-lg border border-gray-200 bg-white px-3 py-2 leading-relaxed text-gray-500 shadow-lg" style={{fontSize:'10px'}}>
                  <div className="absolute bottom-full left-3 border-4 border-transparent border-b-gray-200" />
                  {tooltip}
                </div>
              </div>
            )}
          </div>
          <div className="mt-2 font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl">{value}</div>
        </div>
      </div>
    );
  }

  if (isStaticIconVariant) {
    return (
      <div className="rounded-[2rem] border border-gray-200 bg-white px-4 py-4 md:px-5 md:py-4">
        {/* Single top row: left = title + number + badge, right = icon */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-gray-500 text-xs leading-snug truncate">{title}</div>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-gray-900 tabular-nums leading-tight text-2xl md:text-3xl">{value ?? "—"}</span>
              {change !== undefined && change !== null ? (
                <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold text-xs ${deltaClass}`}>
                  {arrow}
                  {deltaText}
                </span>
              ) : null}
            </div>
          </div>
          {icon ? (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 [&>svg]:h-4 [&>svg]:w-4 mt-0.5">
              {icon}
            </span>
          ) : null}
        </div>
        {/* Diff / subtitle below */}
        {subtitle ? (
          <div className="mt-1 text-gray-400 text-xs leading-snug">{subtitle}</div>
        ) : diffLabel ? (
          <div className="mt-1 text-gray-400 text-xs">{diffLabel}</div>
        ) : null}
      </div>
    );
  }

  if (isColoredIconVariant) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3 md:p-6 lg:p-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className={`hidden md:inline-flex h-11 w-11 items-center justify-center rounded-lg ${iconBg} ${iconColor} md:h-12 md:w-12`}>
                {icon}
              </span>
              <div className="font-semibold text-gray-500 truncate leading-tight text-xs">{title}</div>
            </div>
            <div className="mt-2 font-bold text-gray-900 tabular-nums leading-tight md:text-3xl lg:text-4xl text-xl">{value ?? "—"}</div>
            {subtitle ? <div className="mt-1 text-gray-500 truncate text-xs">{subtitle}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="cck-allow-icons w-full text-left rounded-3xl border border-gray-200 bg-white p-4 md:p-5 hover:border-blue-200 hover:bg-blue-50/20 active:bg-blue-50/40 transition-colors"
    >
      {/* Top row: icon left, badge right */}
      <div className="flex items-start justify-between gap-2">
        {icon ? (
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 [&>svg]:h-5 [&>svg]:w-5">
            {icon}
          </span>
        ) : <span />}
        {change !== undefined && change !== null ? (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 font-semibold text-xs ${deltaClass}`}>
            {arrow}
            {deltaText}
          </span>
        ) : null}
      </div>

      {/* Content below */}
      <div className="mt-4">
        <div className="text-gray-500 text-sm leading-snug">{title}</div>
        <div className="mt-1 font-bold text-gray-900 tabular-nums leading-tight text-3xl md:text-4xl">{value ?? "—"}</div>
        {subtitle ? (
          <div className="mt-1.5 text-gray-400 text-xs leading-snug">{subtitle}</div>
        ) : compareLabel ? (
          <div className="mt-1.5 text-gray-400 text-xs">{compareLabel}</div>
        ) : null}
      </div>
    </button>
  );
}

export default KpiCard;
