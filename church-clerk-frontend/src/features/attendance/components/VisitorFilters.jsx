import { useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import AttendanceContext from "../attendance.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";

const SERVICE_TYPES = [
  "Sunday Service",
  "Sunday First Service",
  "Sunday Second Service",
  "Sunday Third Service",
  "Sunday Fourth Service",
  "Sunday Fifth Service",
  "Children Service",
  "Midweek Service",
  "Prayer Meeting"
];

function VisitorFilters() {
  const store = useContext(AttendanceContext);
  const [value, setValue] = useState(store?.visitorFilters?.search || "");

  const { values: lookupServiceTypes } = useLookupValues("serviceType");
  const serviceTypeOptions = lookupServiceTypes?.length ? lookupServiceTypes : SERVICE_TYPES;

  const appliedDateFrom = store?.visitorFilters?.dateFrom || "";
  const appliedDateTo = store?.visitorFilters?.dateTo || "";

  const fetchRef = useRef(store?.fetchVisitors);
  useEffect(() => { fetchRef.current = store?.fetchVisitors; });

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      fetchRef.current?.({ search: next, page: 1 });
    }, 400);
  }, []);

  useEffect(() => {
    setValue(store?.visitorFilters?.search || "");
  }, [store?.visitorFilters?.search]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const onChange = (e) => {
    const next = e.target.value;
    setValue(next);
    store?.setVisitorFilters({ search: next, page: 1 });
    debouncedSearch(next);
  };

  const onServiceTypeChange = (e) => {
    const next = e.target.value;
    store?.setVisitorFilters({ serviceType: next, page: 1 });
    store?.fetchVisitors({ serviceType: next, page: 1 });
  };

  const onSourceChange = (e) => {
    const next = e.target.value;
    store?.setVisitorFilters({ source: next, page: 1 });
    store?.fetchVisitors({ source: next, page: 1 });
  };

  const applyDates = (from, to) => {
    store?.setVisitorFilters({ dateFrom: from, dateTo: to, page: 1 });
    store?.fetchVisitors({ dateFrom: from, dateTo: to, page: 1 });
  };

  const serviceOptions = useMemo(
    () => serviceTypeOptions.map((t) => ({ label: t, value: t })),
    [serviceTypeOptions]
  );

  const SOURCE_OPTIONS = [
    { label: "Church member", value: "Church member" },
    { label: "Friend or family", value: "Friend or family" },
    { label: "Church outreach", value: "Church outreach" },
    { label: "Church program", value: "Church program" },
    { label: "Social media", value: "Social media" },
    { label: "Church website", value: "Church website" },
    { label: "Online search", value: "Online search" },
    { label: "Flyer", value: "Flyer" },
    { label: "Radio or television", value: "Radio or television" },
    { label: "Passed by", value: "Passed by" },
    { label: "Other", value: "Other" },
  ];

  const selectConfigs = [
    {
      key: "serviceType",
      value: store?.visitorFilters?.serviceType || "",
      onChange: (v) => onServiceTypeChange({ target: { value: v } }),
      options: serviceOptions,
      placeholder: "All Services",
    },
    {
      key: "source",
      value: store?.visitorFilters?.source || "",
      onChange: (v) => onSourceChange({ target: { value: v } }),
      options: SOURCE_OPTIONS,
      placeholder: "All Sources",
    },
  ];

  const mobileFilters = [
    {
      key: "serviceType",
      label: "Service Type",
      value: store?.visitorFilters?.serviceType || "",
      defaultValue: "",
      options: [{ label: "All Services", value: "" }, ...serviceOptions],
    },
    {
      key: "source",
      label: "Source",
      value: store?.visitorFilters?.source || "",
      defaultValue: "",
      options: [{ label: "All Sources", value: "" }, ...SOURCE_OPTIONS],
    },
  ];

  const onMobileApply = (pending) => {
    store?.setVisitorFilters({ serviceType: pending.serviceType, source: pending.source, page: 1 });
    store?.fetchVisitors({ serviceType: pending.serviceType, source: pending.source, page: 1 });
  };

  return (
    <>
      <FilterBar
        searchValue={value}
        onSearchChange={(v) => onChange({ target: { value: v } })}
        searchPlaceholder="Name or invited by"
        searchWidth="md:w-[320px]"
        selects={selectConfigs}
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
      />
      <MobileFilterBar
        searchValue={value}
        onSearchChange={(v) => onChange({ target: { value: v } })}
        searchPlaceholder="Name or invited by"
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
        filters={mobileFilters}
        onApply={onMobileApply}
      />
    </>
  );
}

export default VisitorFilters;
