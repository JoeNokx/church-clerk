import { useEffect, useMemo, useRef, useState } from "react";

function DateRangeFilter({ appliedFrom, appliedTo, onApply }) {
  const datePickerRef = useRef(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [panelStyle, setPanelStyle] = useState(null);

  useEffect(() => {
    setDraftFrom(appliedFrom || "");
    setDraftTo(appliedTo || "");
  }, [appliedFrom, appliedTo]);

  const labelText = useMemo(() => {
    if (!appliedFrom && !appliedTo) return "Date";
    if (appliedFrom && appliedTo && appliedFrom === appliedTo) return appliedFrom;
    if (appliedFrom && appliedTo) return `${appliedFrom} to ${appliedTo}`;
    if (appliedFrom) return appliedFrom;
    if (appliedTo) return appliedTo;
    return "Date";
  }, [appliedFrom, appliedTo]);

  useEffect(() => {
    if (!datePickerOpen) return;

    const onDocMouseDown = (e) => {
      if (!datePickerRef.current) return;
      if (datePickerRef.current.contains(e.target)) return;
      setDatePickerOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [datePickerOpen]);

  const clearDates = async () => {
    setDraftFrom("");
    setDraftTo("");
    await onApply?.("", "");
    setDatePickerOpen(false);
  };

  const onDraftFromChange = (value) => {
    setDraftFrom(value);

    if (draftTo && value && draftTo < value) {
      setDraftTo("");
    }
  };

  const onDraftToChange = (value) => {
    setDraftTo(value);
  };

  const applyDates = async () => {
    const from = draftFrom || "";
    const to = draftTo || "";

    if (!from && !to) {
      await clearDates();
      return;
    }

    if ((from && !to) || (!from && to)) {
      const single = from || to;
      await onApply?.(single, single);
      setDatePickerOpen(false);
      return;
    }

    await onApply?.(from, to);
    setDatePickerOpen(false);
  };

  const togglePicker = () => {
    if (datePickerOpen) {
      setDatePickerOpen(false);
      return;
    }

    const isMobileTablet = window.innerWidth < 1024;
    if (isMobileTablet && datePickerRef.current) {
      const rect = datePickerRef.current.getBoundingClientRect();
      const PANEL_W = 320;
      const EDGE = 8;
      const vw = window.innerWidth;
      const w = Math.min(PANEL_W, vw - EDGE * 2);
      let left = Math.round(rect.right - w);
      left = Math.max(EDGE, Math.min(left, vw - w - EDGE));
      setPanelStyle({ position: "fixed", top: Math.round(rect.bottom) + EDGE, left, width: w, zIndex: 50 });
    } else {
      setPanelStyle(null);
    }

    setDatePickerOpen(true);
  };

  return (
    <div className="relative" ref={datePickerRef}>
      <button
        type="button"
        onClick={togglePicker}
        className="inline-flex h-[44px] items-center gap-2 rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-[16px] md:px-[18px] lg:px-3 text-[14px] font-semibold text-gray-700 hover:bg-gray-50 md:h-12 lg:h-11 lg:text-sm"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-500">
          <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <span className="text-gray-700">{labelText}</span>
      </button>

      {datePickerOpen && (
        <div
          className={`cck-date-dropdown rounded-xl border border-gray-200 bg-white p-3 shadow-lg${panelStyle ? "" : " absolute right-0 z-50 mt-2 w-[320px]"}`}
          style={panelStyle || undefined}
        >
          <div className="flex items-center justify-between gap-3 pb-3">
            <div className="font-semibold text-gray-500 text-xs">Filter by date</div>
            <button type="button" onClick={clearDates} className="font-semibold text-gray-600 hover:text-gray-900 text-xs">
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-semibold text-gray-500 text-xs">From</div>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => onDraftFromChange(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 md:px-4 lg:px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
              />
            </div>

            <div>
              <div className="font-semibold text-gray-500 text-xs">To</div>
              <input
                type="date"
                value={draftTo}
                min={draftFrom || undefined}
                onChange={(e) => onDraftToChange(e.target.value)}
                className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 md:px-4 lg:px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
              />
            </div>
          </div>

          <div className="pt-3 text-gray-500 text-xs">
            Pick only <span className="font-semibold">From</span> for a single day, or pick both for a range.
          </div>

          <div className="flex items-center justify-end pt-3">
            <button
              type="button"
              onClick={applyDates}
              className="h-[44px] rounded-[10px] md:rounded-lg bg-blue-600 px-[16px] md:px-[18px] lg:px-4 text-[14px] font-semibold text-white hover:bg-blue-700 md:h-12 lg:h-11 lg:text-sm"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangeFilter;
