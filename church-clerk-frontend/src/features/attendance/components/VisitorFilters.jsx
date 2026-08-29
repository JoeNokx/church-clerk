import { useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import AttendanceContext from "../attendance.store.js";
import DateRangeFilter from "../../../shared/components/DateRangeFilter/index.jsx";
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

  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end md:justify-end">
      <input
        value={value}
        onChange={onChange}
        className="h-11 w-full md:w-[180px] rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
        placeholder="Name or invited by"
      />
      <select
        value={store?.visitorFilters?.serviceType || ""}
        onChange={onServiceTypeChange}
        className="h-11 w-full md:flex-none rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 md:w-auto text-sm"
      >
        <option value="">All Services</option>
        {serviceTypeOptions.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select
        value={store?.visitorFilters?.source || ""}
        onChange={onSourceChange}
        className="h-11 w-full md:flex-none rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 md:w-auto text-sm"
      >
        <option value="">All Sources</option>
        <option value="Church member">Church member</option>
        <option value="Friend or family">Friend or family</option>
        <option value="Church outreach">Church outreach</option>
        <option value="Church program">Church program</option>
        <option value="Social media">Social media</option>
        <option value="Church website">Church website</option>
        <option value="Online search">Online search</option>
        <option value="Flyer">Flyer</option>
        <option value="Radio or television">Radio or television</option>
        <option value="Passed by">Passed by</option>
        <option value="Other">Other</option>
      </select>
      <DateRangeFilter appliedFrom={appliedDateFrom} appliedTo={appliedDateTo} onApply={applyDates} />
    </div>
  );
}

export default VisitorFilters;
