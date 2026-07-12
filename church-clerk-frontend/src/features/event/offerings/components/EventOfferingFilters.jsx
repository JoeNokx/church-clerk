import { useContext } from "react";
import EventOfferingContext from "../eventOfferings.store.js";
import DateRangeFilter from "../../../../shared/components/DateRangeFilter/index.jsx";
import { useLookupValues } from "../../../lookups/hooks/useLookupValues.js";

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

  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      <select
        value={filters.offeringType || ""}
        onChange={(e) => store?.fetchOfferings?.({ offeringType: e.target.value, page: 1 })}
        className="h-11 flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 md:flex-none md:w-44 text-sm"
      >
        <option value="">All types</option>
        {offeringTypeOptions.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <DateRangeFilter
        appliedFrom={filters.dateFrom || ""}
        appliedTo={filters.dateTo || ""}
        onApply={(from, to) => store?.fetchOfferings?.({ dateFrom: from || "", dateTo: to || "", page: 1 })}
        onClear={() => store?.fetchOfferings?.({ dateFrom: "", dateTo: "", page: 1 })}
      />
    </div>
  );
}

export default EventOfferingFilters;
