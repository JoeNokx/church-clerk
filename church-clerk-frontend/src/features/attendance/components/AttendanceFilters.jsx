import { useContext, useEffect, useState } from "react";
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
