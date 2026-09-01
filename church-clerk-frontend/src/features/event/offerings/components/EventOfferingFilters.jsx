import { useContext, useEffect, useMemo, useRef, useState } from "react";
import EventOfferingContext from "../eventOfferings.store.js";
import { useLookupValues } from "../../../lookups/hooks/useLookupValues.js";
import debounce from "../../../../shared/utils/debounce.js";
import FilterBar from "../../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../../shared/components/MobileFilterBar/index.jsx";

const DEFAULT_OFFERING_TYPES = [
  "first offering",
  "second offering",
  "third offering",
  "fourth offering",
  "fifth offering"
];

function EventOfferingFilters() {
  const store = useContext(EventOfferingContext);
  const filters = store?.filters || {};

  const { values: lookupOfferingTypes } = useLookupValues("offeringType");
  const offeringTypeOptions = lookupOfferingTypes?.length ? lookupOfferingTypes : DEFAULT_OFFERING_TYPES;

  const [searchValue, setSearchValue] = useState(filters.search || "");

  const fetchRef = useRef(store?.fetchOfferings);
  useEffect(() => { fetchRef.current = store?.fetchOfferings; });

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      fetchRef.current?.({ search: next, page: 1 });
    }, 400);
  }, []);

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  const onSearchChange = (next) => {
    setSearchValue(next);
    debouncedSearch(next);
  };

  const onOfferingTypeChange = (v) => {
    store?.fetchOfferings?.({ offeringType: v, page: 1 });
  };

  const offeringTypeSelectOptions = useMemo(
    () => offeringTypeOptions.map((t) => ({ label: t, value: t })),
    [offeringTypeOptions]
  );

  const mobileFilters = [
    {
      key: "offeringType",
      label: "Offering Type",
      value: filters.offeringType || "",
      defaultValue: "",
      options: [{ label: "All types", value: "" }, ...offeringTypeSelectOptions],
    },
  ];

  return (
    <>
      <FilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search recorded by"
        searchWidth="md:w-[320px]"
        selects={[
          {
            key: "offeringType",
            value: filters.offeringType || "",
            onChange: onOfferingTypeChange,
            options: offeringTypeSelectOptions,
            placeholder: "All types",
          },
        ]}
        dateFrom={filters.dateFrom || ""}
        dateTo={filters.dateTo || ""}
        onDateApply={(from, to) => store?.fetchOfferings?.({ dateFrom: from || "", dateTo: to || "", page: 1 })}
      />
      <MobileFilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search recorded by"
        dateFrom={filters.dateFrom || ""}
        dateTo={filters.dateTo || ""}
        onDateApply={(from, to) => store?.fetchOfferings?.({ dateFrom: from || "", dateTo: to || "", page: 1 })}
        filters={mobileFilters}
        onApply={(pending) => store?.fetchOfferings?.({ offeringType: pending.offeringType, page: 1 })}
      />
    </>
  );
}

export default EventOfferingFilters;
