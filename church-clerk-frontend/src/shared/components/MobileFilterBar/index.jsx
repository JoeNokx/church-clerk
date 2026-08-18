import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
      <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
      <path
        d="M3 5h18M3 12h18M3 19h18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="7" cy="5" r="2.25" fill="white" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="12" r="2.25" fill="white" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="19" r="2.25" fill="white" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function XSmallIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
      <path
        d="M4 4l8 8M12 4L4 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BottomSheet({ open, onClose, title, children }) {
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setAnimate(true))
      );
      return () => cancelAnimationFrame(id);
    } else {
      setAnimate(false);
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!visible || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 ${
          animate ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out ${
          animate ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
          <div className="font-semibold text-gray-900 text-base">{title}</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="cck-allow-icons h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200"
          >
            <XIcon />
          </button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 65px)" }}>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

export default function MobileFilterBar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  dateFrom = "",
  dateTo = "",
  onDateApply,
  filters = [],
  onApply,
  resultCount = null,
  getLiveCount,
  className = "",
}) {
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [pendingDateFrom, setPendingDateFrom] = useState("");
  const [pendingDateTo, setPendingDateTo] = useState("");
  const [pendingFilters, setPendingFilters] = useState({});
  const [filterLiveCount, setFilterLiveCount] = useState(null);
  const [dateLiveCount, setDateLiveCount] = useState(null);
  const filterTimerRef = useRef(null);
  const dateTimerRef = useRef(null);

  const runFilterCount = (pending, pDateFrom, pDateTo) => {
    if (!getLiveCount) return;
    clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(async () => {
      const count = await getLiveCount({ filters: pending, dateFrom: pDateFrom, dateTo: pDateTo });
      setFilterLiveCount(count ?? null);
    }, 350);
  };

  const runDateCount = (pDateFrom, pDateTo) => {
    if (!getLiveCount) return;
    clearTimeout(dateTimerRef.current);
    dateTimerRef.current = setTimeout(async () => {
      const count = await getLiveCount({ filters: pendingFilters, dateFrom: pDateFrom, dateTo: pDateTo });
      setDateLiveCount(count ?? null);
    }, 350);
  };

  const openDateSheet = () => {
    setPendingDateFrom(dateFrom);
    setPendingDateTo(dateTo);
    setDateLiveCount(null);
    setDateSheetOpen(true);
    runDateCount(dateFrom, dateTo);
  };

  const openFilterSheet = () => {
    const initial = {};
    (filters || []).forEach((f) => {
      initial[f.key] = f.value ?? f.defaultValue ?? "";
    });
    setPendingFilters(initial);
    setFilterLiveCount(null);
    setFilterSheetOpen(true);
    runFilterCount(initial, dateFrom, dateTo);
  };

  const updatePendingFilter = (key, value) => {
    const next = { ...pendingFilters, [key]: value };
    setPendingFilters(next);
    runFilterCount(next, dateFrom, dateTo);
  };

  const updatePendingDateFrom = (value) => {
    const newTo = pendingDateTo && value && pendingDateTo < value ? "" : pendingDateTo;
    setPendingDateFrom(value);
    if (newTo !== pendingDateTo) setPendingDateTo(newTo);
    runDateCount(value, newTo);
  };

  const updatePendingDateTo = (value) => {
    setPendingDateTo(value);
    runDateCount(pendingDateFrom, value);
  };

  const dateActive = Boolean(dateFrom || dateTo);
  const filterActive = (filters || []).some(
    (f) => f.value && f.value !== (f.defaultValue ?? "all") && f.value !== ""
  );

  const applyDate = () => {
    onDateApply?.(pendingDateFrom || "", pendingDateTo || "");
    setDateSheetOpen(false);
  };

  const clearDate = () => {
    setPendingDateFrom("");
    setPendingDateTo("");
    onDateApply?.("", "");
    setDateSheetOpen(false);
  };

  const applyFilters = () => {
    onApply?.(pendingFilters);
    setFilterSheetOpen(false);
  };

  const makeLabel = (liveCount) => {
    const n = liveCount ?? resultCount;
    return n != null
      ? `Show ${n.toLocaleString()} Result${n !== 1 ? "s" : ""}`
      : "Show Results";
  };

  const filterBtnLabel = makeLabel(filterLiveCount);
  const dateBtnLabel = makeLabel(dateLiveCount);

  const chips = [];

  if (dateFrom || dateTo) {
    let label;
    if (dateFrom && dateTo && dateFrom === dateTo) label = dateFrom;
    else if (dateFrom && dateTo) label = `${dateFrom} → ${dateTo}`;
    else if (dateFrom) label = `From ${dateFrom}`;
    else label = `To ${dateTo}`;
    chips.push({
      key: "__date__",
      label,
      onRemove: () => onDateApply?.("", ""),
    });
  }

  (filters || []).forEach((f) => {
    const isActive =
      f.value && f.value !== (f.defaultValue ?? "all") && f.value !== "";
    if (isActive) {
      const opt = (f.options || []).find((o) => o.value === f.value);
      chips.push({
        key: f.key,
        label: `${f.label}: ${opt?.label || f.value}`,
        onRemove: () => {
          const cleared = {};
          (filters || []).forEach((ff) => {
            cleared[ff.key] = ff.value;
          });
          cleared[f.key] = f.defaultValue ?? "all";
          onApply?.(cleared);
        },
      });
    }
  });

  const clearAll = () => {
    onDateApply?.("", "");
    const cleared = {};
    (filters || []).forEach((f) => {
      cleared[f.key] = f.defaultValue ?? "all";
    });
    onApply?.(cleared);
  };

  return (
    <div className={`md:hidden ${className}`}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
        />

        {onDateApply && (
          <button
            type="button"
            aria-label="Filter by date"
            onClick={openDateSheet}
            className={`cck-allow-icons h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-lg border transition-colors ${
              dateActive
                ? "border-blue-500 bg-blue-50 text-blue-600"
                : "border-gray-200 bg-white text-gray-500"
            }`}
          >
            <CalendarIcon />
          </button>
        )}

        {filters?.length > 0 && (
          <button
            type="button"
            aria-label="Open filters"
            onClick={openFilterSheet}
            className={`cck-allow-icons h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-lg border transition-colors ${
              filterActive
                ? "border-blue-500 bg-blue-50 text-blue-600"
                : "border-gray-200 bg-white text-gray-500"
            }`}
          >
            <SlidersIcon />
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
            >
              {chip.label}
              <button
                type="button"
                aria-label={`Remove ${chip.label}`}
                onClick={chip.onRemove}
                className="cck-allow-icons ml-0.5 inline-flex shrink-0 items-center rounded-full text-blue-400 hover:text-blue-600"
              >
                <XSmallIcon />
              </button>
            </span>
          ))}
          {chips.length > 1 && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-full px-2 py-0.5 text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <BottomSheet
        open={dateSheetOpen}
        onClose={() => setDateSheetOpen(false)}
        title="Filter by Date"
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                From
              </label>
              <input
                type="date"
                value={pendingDateFrom}
                onChange={(e) => updatePendingDateFrom(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                To
              </label>
              <input
                type="date"
                value={pendingDateTo}
                min={pendingDateFrom || undefined}
                onChange={(e) => updatePendingDateTo(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Pick only{" "}
            <span className="font-semibold text-gray-500">From</span> for a
            single day, or both for a range.
          </p>
          <div className="flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={clearDate}
              className="h-11 flex-1 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-600 active:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={applyDate}
              className="h-11 flex-1 rounded-lg bg-blue-600 text-sm font-semibold text-white active:bg-blue-700"
            >
              {dateBtnLabel}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Filters"
      >
        <div className="flex flex-col gap-4 p-4">
          {(filters || []).map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                {f.label}
              </label>
              <select
                value={pendingFilters[f.key] ?? f.defaultValue ?? ""}
                onChange={(e) => updatePendingFilter(f.key, e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              >
                {(f.options || []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="pb-2">
            <button
              type="button"
              onClick={applyFilters}
              className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white active:bg-blue-700"
            >
              {filterBtnLabel}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
