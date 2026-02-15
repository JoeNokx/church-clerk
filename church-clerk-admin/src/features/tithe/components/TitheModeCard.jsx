function TitheModeCard({ mode, onChange, disabled = false }) {
  const safeMode = mode === "aggregate" ? "aggregate" : "individual";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">Recording mode</div>
          <div className="mt-1 text-xs text-gray-500">Choose how your church records tithe</div>
        </div>

        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange?.("individual")}
            className={`h-9 px-4 rounded-md text-sm font-semibold ${
              safeMode === "individual" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"
            } ${disabled ? "opacity-60" : ""}`}
          >
            Individual
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange?.("aggregate")}
            className={`h-9 px-4 rounded-md text-sm font-semibold ${
              safeMode === "aggregate" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"
            } ${disabled ? "opacity-60" : ""}`}
          >
            Aggregate
          </button>
        </div>
      </div>
    </div>
  );
}

export default TitheModeCard;
