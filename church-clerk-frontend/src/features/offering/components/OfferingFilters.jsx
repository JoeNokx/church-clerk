import { useContext, useEffect, useState } from "react";
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
    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end md:justify-end">
      <select
        value={store?.filters?.serviceType || ""}
        onChange={onServiceTypeChange}
        className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
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

export default OfferingFilters;
