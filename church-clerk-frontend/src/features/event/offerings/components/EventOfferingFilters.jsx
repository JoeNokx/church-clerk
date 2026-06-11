import { useContext } from "react";
import EventOfferingContext from "../eventOfferings.store.js";

const OFFERING_TYPES = [
  "",
  "first offering",
  "second offering",
  "third offering",
  "fourth offering",
  "fifth offering"
];

function EventOfferingFilters() {
  const store = useContext(EventOfferingContext);

  const filters = store?.filters || {};

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <select
        value={filters.offeringType || ""}
        onChange={(e) => store?.fetchOfferings?.({ offeringType: e.target.value, page: 1 })}
        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 md:w-44 text-sm"
      >
        {OFFERING_TYPES.map((t) => (
          <option key={t || "all"} value={t}>
            {t ? t : "All types"}
          </option>
        ))}
      </select>

      <input
        value={filters.dateFrom || ""}
        onChange={(e) => store?.fetchOfferings?.({ dateFrom: e.target.value, page: 1 })}
        type="date"
        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 md:w-40 text-sm"
      />

      <input
        value={filters.dateTo || ""}
        onChange={(e) => store?.fetchOfferings?.({ dateTo: e.target.value, page: 1 })}
        type="date"
        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 md:w-40 text-sm"
      />
    </div>
  );
}

export default EventOfferingFilters;
