import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import DateRangeFilter from "../../../shared/components/DateRangeFilter/index.jsx";
import AttendanceContext from "../attendance.store.js";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";

const SERVICE_TYPES = [
  "Sunday Service",
  "Sunday First Service",
  "Sunday Second Service",
  "Sunday Third Service",
  "Sunday Fourth Service",
  "Sunday Fifth Service",
  "Special Program",
  "Worship Service",
  "Bible Study",
  "Children Service",
  "Midweek Service",
  "Prayer Meeting"
];

function AttendanceFilters() {
  const store = useContext(AttendanceContext);

  const { values: lookupServiceTypes } = useLookupValues("serviceType");
  const serviceTypeOptions = lookupServiceTypes?.length ? lookupServiceTypes : SERVICE_TYPES;

  const appliedDateFrom = store?.attendanceFilters?.dateFrom || "";
  const appliedDateTo = store?.attendanceFilters?.dateTo || "";

  const [speakerValue, setSpeakerValue] = useState(store?.attendanceFilters?.mainSpeaker || "");

  const debouncedSpeakerSearch = useMemo(() => {
    return debounce((next) => {
      store?.setAttendanceFilters({ mainSpeaker: next, page: 1 });
      store?.fetchAttendances({ mainSpeaker: next, page: 1 });
    }, 400);
  }, [store]);

  useEffect(() => {
    return () => { debouncedSpeakerSearch.cancel(); };
  }, [debouncedSpeakerSearch]);

  const onSpeakerChange = (e) => {
    const next = e.target.value;
    setSpeakerValue(next);
    debouncedSpeakerSearch(next);
  };

  const onServiceTypeChange = async (e) => {
    const value = e.target.value;
    store?.setAttendanceFilters({ serviceType: value, page: 1 });
    await store?.fetchAttendances({ serviceType: value, page: 1 });
  };

  const applyDates = async (from, to) => {
    store?.setAttendanceFilters({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchAttendances({ dateFrom: from, dateTo: to, page: 1 });
  };

  return (
    <div className="flex items-center gap-2 w-full md:w-auto md:flex-wrap md:justify-end">
      <input
        value={speakerValue}
        onChange={onSpeakerChange}
        placeholder="Search speaker..."
        className="h-11 flex-1 md:flex-none md:w-[180px] rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
      />
      <select
        value={store?.attendanceFilters?.serviceType || ""}
        onChange={onServiceTypeChange}
        className="h-11 flex-1 md:flex-none rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 md:w-auto text-sm"
      >
        <option value="">All Services</option>
        {serviceTypeOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <div className="flex-1 md:flex-none">
        <DateRangeFilter appliedFrom={appliedDateFrom} appliedTo={appliedDateTo} onApply={applyDates} />
      </div>
    </div>
  );
}

export default AttendanceFilters;
