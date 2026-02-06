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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        value={filters.offeringType || ""}
        onChange={(e) => store?.fetchOfferings?.({ offeringType: e.target.value, page: 1 })}
        className="h-10 w-full sm:w-44 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
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
        className="h-10 w-full sm:w-40 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
      />

      <input
        value={filters.dateTo || ""}
        onChange={(e) => store?.fetchOfferings?.({ dateTo: e.target.value, page: 1 })}
        type="date"
        className="h-10 w-full sm:w-40 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
      />
    </div>
  );
}

export default EventOfferingFilters;
