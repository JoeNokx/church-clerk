import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import AttendanceContext from "../attendance.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";
import { getAttendances } from "../services/attendance.api.js";

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

  const serviceOptions = useMemo(
    () => serviceTypeOptions.map((t) => ({ label: t, value: t })),
    [serviceTypeOptions]
  );

  const selectConfigs = [
    {
      key: "serviceType",
      value: store?.attendanceFilters?.serviceType || "",
      onChange: (v) => onServiceTypeChange({ target: { value: v } }),
      options: serviceOptions,
      placeholder: "All Services",
    },
  ];

  const mobileFilters = [
    {
      key: "serviceType",
      label: "Service Type",
      value: store?.attendanceFilters?.serviceType || "",
      defaultValue: "",
      options: [{ label: "All Services", value: "" }, ...serviceOptions],
    },
  ];

  const getLiveCount = useCallback(async ({ filters: f, dateFrom: dFrom, dateTo: dTo }) => {
    try {
      const params = { page: 1, limit: 1 };
      if (f?.serviceType && f.serviceType !== "") params.serviceType = f.serviceType;
      if (speakerValue) params.mainSpeaker = speakerValue;
      if (dFrom) params.dateFrom = dFrom;
      if (dTo) params.dateTo = dTo;
      const res = await getAttendances(params);
      const payload = res?.data?.data ?? res?.data;
      return payload?.pagination?.totalItems ?? payload?.pagination?.totalResult ?? null;
    } catch {
      return null;
    }
  }, [speakerValue]);

  const onMobileApply = async (pending) => {
    store?.setAttendanceFilters({ serviceType: pending.serviceType, page: 1 });
    await store?.fetchAttendances({ serviceType: pending.serviceType, page: 1 });
  };

  return (
    <>
      <FilterBar
        searchValue={speakerValue}
        onSearchChange={(v) => onSpeakerChange({ target: { value: v } })}
        searchPlaceholder="Search speaker..."
        searchWidth="md:w-[320px]"
        selects={selectConfigs}
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
      />
      <MobileFilterBar
        searchValue={speakerValue}
        onSearchChange={(v) => onSpeakerChange({ target: { value: v } })}
        searchPlaceholder="Search speaker..."
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
        filters={mobileFilters}
        onApply={onMobileApply}
        resultCount={store?.attendancePagination?.totalItems ?? store?.attendancePagination?.totalResult ?? null}
        getLiveCount={getLiveCount}
      />
    </>
  );
}

export default AttendanceFilters;
