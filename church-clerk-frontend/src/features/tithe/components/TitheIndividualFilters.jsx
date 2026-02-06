import { useContext, useEffect, useState } from "react";
import TitheContext from "../tithe.store.js";

function TitheIndividualFilters() {
  const store = useContext(TitheContext);

  const filters = store?.individualFilters || {};

  const [searchValue, setSearchValue] = useState(filters.search || "");

  useEffect(() => {
    setSearchValue(filters.search || "");
  }, [filters.search]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        value={searchValue}
        onChange={async (e) => {
          const next = e.target.value;
          setSearchValue(next);
          await store?.fetchIndividuals?.({ search: next, page: 1 });
        }}
        placeholder="Search member..."
        className="h-9 w-full sm:w-56 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
      />

      <input
        value={filters.dateFrom || ""}
        onChange={async (e) => {
          await store?.fetchIndividuals?.({ dateFrom: e.target.value, page: 1 });
        }}
        type="date"
        className="h-9 w-full sm:w-40 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
      />

      <input
        value={filters.dateTo || ""}
        onChange={async (e) => {
          await store?.fetchIndividuals?.({ dateTo: e.target.value, page: 1 });
        }}
        type="date"
        className="h-9 w-full sm:w-40 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
      />
    </div>
  );
}

export default TitheIndividualFilters;
