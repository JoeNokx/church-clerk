import { useContext, useEffect, useMemo, useRef, useState } from "react";
import AttendanceContext from "../attendance.store.js";

const SERVICE_TYPES = [
  "Sunday Service",
  "Sunday 1st Service",
  "Sunday 2nd Service",
  "Sunday 3rd Service",
  "Sunday 4th Service",
  "Sunday 5th Service",
  "Special Program",
  "Worship Service",
  "Bible Study",
  "Children Service",
  "Midweek Service",
  "Prayer Meeting"
];

function AttendanceFilters() {
  const store = useContext(AttendanceContext);

  const datePickerRef = useRef(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  const appliedDateFrom = store?.attendanceFilters?.dateFrom || "";
  const appliedDateTo = store?.attendanceFilters?.dateTo || "";

  useEffect(() => {
    setDraftFrom(appliedDateFrom || "");
    setDraftTo(appliedDateTo || "");
  }, [appliedDateFrom, appliedDateTo]);

  const labelText = useMemo(() => {
    if (!appliedDateFrom && !appliedDateTo) return "Date";
    if (appliedDateFrom && appliedDateTo && appliedDateFrom === appliedDateTo) return appliedDateFrom;
    if (appliedDateFrom && appliedDateTo) return `${appliedDateFrom} to ${appliedDateTo}`;
    if (appliedDateFrom) return appliedDateFrom;
    if (appliedDateTo) return appliedDateTo;
    return "Date";
  }, [appliedDateFrom, appliedDateTo]);

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

  const onServiceTypeChange = async (e) => {
    const value = e.target.value;
    store?.setAttendanceFilters({ serviceType: value, page: 1 });
    await store?.fetchAttendances({ serviceType: value, page: 1 });
  };

  const clearDates = async () => {
    setDraftFrom("");
    setDraftTo("");
    store?.setAttendanceFilters({ dateFrom: "", dateTo: "", page: 1 });
    await store?.fetchAttendances({ dateFrom: "", dateTo: "", page: 1 });
    setDatePickerOpen(false);
  };

  const onDraftFromChange = (value) => {
    setDraftFrom(value);
    if (draftTo && value && draftTo < value) {
      setDraftTo("");
    }
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
      store?.setAttendanceFilters({ dateFrom: single, dateTo: single, page: 1 });
      await store?.fetchAttendances({ dateFrom: single, dateTo: single, page: 1 });
      setDatePickerOpen(false);
      return;
    }

    store?.setAttendanceFilters({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchAttendances({ dateFrom: from, dateTo: to, page: 1 });
    setDatePickerOpen(false);
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">Service:</span>
        <select
          value={store?.attendanceFilters?.serviceType || ""}
          onChange={onServiceTypeChange}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          <option value="">All Services</option>
          {SERVICE_TYPES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="relative" ref={datePickerRef}>
        <button
          type="button"
          onClick={() => setDatePickerOpen((v) => !v)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-500">
            <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          <span className="text-gray-700">{labelText}</span>
        </button>

        {datePickerOpen && (
          <div className="absolute right-0 z-20 mt-2 w-[320px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
            <div className="flex items-center justify-between gap-3 pb-3">
              <div className="text-xs font-semibold text-gray-500">Filter by date</div>
              <button type="button" onClick={clearDates} className="text-xs font-semibold text-gray-600 hover:text-gray-900">
                Clear
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-500">From</div>
                <input
                  type="date"
                  value={draftFrom}
                  onChange={(e) => onDraftFromChange(e.target.value)}
                  className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500">To</div>
                <input
                  type="date"
                  value={draftTo}
                  min={draftFrom || undefined}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                />
              </div>
            </div>

            <div className="pt-3 text-xs text-gray-500">
              Pick only <span className="font-semibold">From</span> for a single day, or pick both for a range.
            </div>

            <div className="pt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={applyDates}
                className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceFilters;
