function KpiStatCard({ label, value, valueClassName, subLabel, change }) {
  const hasChange = change !== undefined && change !== null;
  const changeClass =
    change > 0 ? "bg-green-100 text-green-700" : change < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
      <div className="font-semibold text-gray-500 text-xs">{label}</div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <div className={`font-semibold ${valueClassName ?? "text-gray-900 text-lg"}`}>{value}</div>
        {hasChange ? (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-xs ${changeClass}`}>
            {change > 0 ? "+" : ""}
            {Math.round(change)}%
          </span>
        ) : null}
      </div>
      {subLabel ? <div className="mt-0.5 text-[11px] text-gray-400">{subLabel}</div> : null}
    </div>
  );
}

export default KpiStatCard;
