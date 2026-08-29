import { useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import DateRangeFilter from "../../../shared/components/DateRangeFilter/index.jsx";
import OfferingContext from "../offering.store.js";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";

const SERVICE_TYPES = [
  "Sunday Service",
  "First Sunday Service",
  "Second Sunday Service",
  "Third Sunday Service",
  "Worship Service",
  "Bible Study",
  "Special Program",
  "Children Service",
  "Midweek Service",
  "Prayer Meeting",
  "cells Meeting",
  "groups Meeting",
  "department Meeting"
];

function OfferingFilters() {
  const store = useContext(OfferingContext);

  const { values: lookupServiceTypes } = useLookupValues("serviceType");
  const serviceTypeOptions = lookupServiceTypes?.length ? lookupServiceTypes : SERVICE_TYPES;

  const [recordedByValue, setRecordedByValue] = useState(store?.filters?.recordedBy || "");

  const fetchRef = useRef(store?.fetchOfferings);
  useEffect(() => { fetchRef.current = store?.fetchOfferings; });

  const debouncedRecordedBy = useMemo(() => debounce((next) => {
    fetchRef.current?.({ recordedBy: next, page: 1 });
  }, 400), []);

  useEffect(() => {
    setRecordedByValue(store?.filters?.recordedBy || "");
  }, [store?.filters?.recordedBy]);

  useEffect(() => {
    return () => { debouncedRecordedBy.cancel(); };
  }, [debouncedRecordedBy]);

  const onRecordedByChange = (e) => {
    const next = e.target.value;
    setRecordedByValue(next);
    store?.setFilters?.({ recordedBy: next, page: 1 });
    debouncedRecordedBy(next);
  };

  const appliedDateFrom = store?.filters?.dateFrom || "";
  const appliedDateTo = store?.filters?.dateTo || "";

  const onServiceTypeChange = async (e) => {
    const value = e.target.value;
    store?.setFilters({ serviceType: value, page: 1 });
    await store?.fetchOfferings({ serviceType: value, page: 1 });
  };

  const applyDates = async (from, to) => {
    store?.setFilters({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchOfferings({ dateFrom: from, dateTo: to, page: 1 });
  };

  return (
    <div className="flex items-center gap-2 w-full flex-wrap">
      <input
        value={recordedByValue}
        onChange={onRecordedByChange}
        className="h-11 flex-1 min-w-[150px] rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
        placeholder="Search recorded by"
      />
      <select
        value={store?.filters?.serviceType || ""}
        onChange={onServiceTypeChange}
        className="h-11 flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
      >
        <option value="">All Services</option>
        {serviceTypeOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <div className="flex-1 min-w-0">
        <DateRangeFilter appliedFrom={appliedDateFrom} appliedTo={appliedDateTo} onApply={applyDates} />
      </div>
    </div>
  );
}

export default OfferingFilters;
