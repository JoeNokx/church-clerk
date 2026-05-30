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
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
      <select
        value={store?.attendanceFilters?.serviceType || ""}
        onChange={onServiceTypeChange}
        className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
      >
        <option value="">All Services</option>
        {serviceTypeOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <DateRangeFilter appliedFrom={appliedDateFrom} appliedTo={appliedDateTo} onApply={applyDates} />
    </div>
  );
}

export default AttendanceFilters;
