import { useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import OfferingContext from "../offering.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
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

  const onRecordedByChange = (next) => {
    setRecordedByValue(next);
    store?.setFilters?.({ recordedBy: next, page: 1 });
    debouncedRecordedBy(next);
  };

  const appliedDateFrom = store?.filters?.dateFrom || "";
  const appliedDateTo = store?.filters?.dateTo || "";

  const onServiceTypeChange = async (v) => {
    store?.setFilters({ serviceType: v, page: 1 });
    await store?.fetchOfferings({ serviceType: v, page: 1 });
  };

  const applyDates = async (from, to) => {
    store?.setFilters({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchOfferings({ dateFrom: from, dateTo: to, page: 1 });
  };

  const serviceOptions = useMemo(
    () => serviceTypeOptions.map((c) => ({ label: c, value: c })),
    [serviceTypeOptions]
  );

  const mobileFilters = [
    {
      key: "serviceType",
      label: "Service Type",
      value: store?.filters?.serviceType || "",
      defaultValue: "",
      options: [{ label: "All Services", value: "" }, ...serviceOptions],
    },
  ];

  const onMobileApply = async (pending) => {
    store?.setFilters({ serviceType: pending.serviceType, page: 1 });
    await store?.fetchOfferings({ serviceType: pending.serviceType, page: 1 });
  };

  return (
    <>
      <FilterBar
        searchValue={recordedByValue}
        onSearchChange={onRecordedByChange}
        searchPlaceholder="Search recorded by"
        searchWidth="md:w-[320px]"
        selects={[
          {
            key: "serviceType",
            value: store?.filters?.serviceType || "",
            onChange: onServiceTypeChange,
            options: serviceOptions,
            placeholder: "All Services",
          },
        ]}
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
      />
      <MobileFilterBar
        searchValue={recordedByValue}
        onSearchChange={onRecordedByChange}
        searchPlaceholder="Search recorded by"
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
        filters={mobileFilters}
        onApply={onMobileApply}
      />
    </>
  );
}

export default OfferingFilters;
