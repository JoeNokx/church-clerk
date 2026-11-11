const INTERVALS = [
  { key: "monthly", label: "Monthly" },
  { key: "halfYear", label: "6 Months" },
  { key: "yearly", label: "Yearly" }
];

function BillingIntervalToggle({ value, onChange, savingsByInterval = {} }) {
  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
      {INTERVALS.map(({ key, label }) => {
        const pct = Number(savingsByInterval?.[key] || 0);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              value === key
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {label}
            {pct > 0 ? (
              <span className="pointer-events-none absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                Save {pct}%
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default BillingIntervalToggle;
