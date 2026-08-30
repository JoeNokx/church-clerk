import DateRangeFilter from "../DateRangeFilter/index.jsx";

/**
 * FilterBar — reusable desktop filter row.
 *
 * Props:
 *   searchValue    {string}   – controlled search input value
 *   onSearchChange {fn}       – called with the raw string on every keystroke
 *   searchPlaceholder {string}
 *   searchWidth    {string}   – tailwind width class, e.g. "md:w-[320px]" (default)
 *
 *   selects        {Array}    – list of select configs:
 *     { key, value, onChange, options: [{ label, value }], placeholder? }
 *     placeholder becomes the first <option value=""> item (optional)
 *
 *   dateFrom       {string}   – applied date-from (YYYY-MM-DD)
 *   dateTo         {string}   – applied date-to
 *   onDateApply    {fn}       – (from, to) => void; omit to hide the date picker
 *
 *   children       {ReactNode} – any extra controls appended after the date picker
 *   className      {string}   – extra classes on the outer wrapper
 */
export default function FilterBar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  searchWidth = "md:w-[320px]",
  selects = [],
  dateFrom = "",
  dateTo = "",
  onDateApply,
  children,
  className = "",
}) {
  return (
    <div className={`hidden md:flex md:flex-row md:flex-wrap md:items-end md:gap-3 ${className}`}>
      {onSearchChange !== undefined && (
        <input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className={`h-10 w-full ${searchWidth} rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-100`}
        />
      )}

      {selects.map(({ key, value, onChange, options = [], placeholder }) => (
        <div key={key} className="relative flex-1 md:flex-none">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            {placeholder !== undefined && (
              <option value="">{placeholder}</option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-[10px] flex items-center">
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-gray-400">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      ))}

      {onDateApply && (
        <DateRangeFilter
          appliedFrom={dateFrom}
          appliedTo={dateTo}
          onApply={onDateApply}
        />
      )}

      {children}
    </div>
  );
}
