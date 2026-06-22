import { useMemo } from "react";

function KpiCard({ title, value, subtitle, change, compareLabel, onClick, icon, accent, iconBg, iconColor }) {
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
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      );
    }
    if (change < 0) {
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
          <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832l-3.71 3.94a.75.75 0 11-1.08-1.04l4.24-4.5a.75.75 0 011.08 0l4.24 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
        </svg>
      );
    }
    return null;
  }, [change]);

  const topBar = accent || null;
  const isSimpleVariant = !icon && !change && !onClick;
  const isColoredIconVariant = iconBg && !onClick;

  if (isSimpleVariant) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {topBar && <div className={`h-1.5 ${topBar}`} />}
        <div className="p-3 md:p-4">
          <div className="font-semibold text-gray-500 text-xs">{title}</div>
          <div className="mt-2 font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl">{value}</div>
        </div>
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
      className="cck-allow-icons w-full text-left rounded-xl border border-gray-200 bg-white p-3 hover:border-blue-200 hover:bg-blue-50/30 active:bg-blue-50/40 transition md:p-6 lg:p-8"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="hidden md:flex h-6 w-6 shrink-0 rounded-lg bg-gray-50 ring-1 ring-gray-200 items-center justify-center text-gray-700 [&>svg]:h-4 [&>svg]:w-4 md:[&>svg]:h-5 md:[&>svg]:w-5 md:h-12 md:w-11">
              {icon}
            </span>
            <div className="font-semibold text-gray-500 truncate leading-tight md:text-sm text-xs">{title}</div>
          </div>

          <div className="mt-2 font-bold text-gray-900 tabular-nums leading-tight md:text-3xl lg:text-4xl text-xl">{value ?? "—"}</div>
          {subtitle ? <div className="mt-0.5 text-gray-500 truncate text-xs">{subtitle}</div> : null}

          {change !== undefined && change !== null ? (
            <div className="mt-2 flex items-center gap-1 flex-wrap md:gap-2">
              <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 md:px-2.5 md:py-1 font-semibold ${deltaClass} text-xs`}>
                {arrow}
                <span>{deltaText}</span>
              </span>
              <span className="text-gray-500 text-xs">{compareLabel || ""}</span>
            </div>
          ) : null}
        </div>

        <svg viewBox="0 0 20 20" fill="currentColor" className="hidden md:block h-4 w-4 text-gray-300 shrink-0 mt-0.5 md:h-5 md:w-5">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.24 4.24a.75.75 0 010 1.06l-4.24 4.24a.75.75 0 01-1.06.02z" clipRule="evenodd" />
        </svg>
      </div>
    </button>
  );
}

export default KpiCard;
