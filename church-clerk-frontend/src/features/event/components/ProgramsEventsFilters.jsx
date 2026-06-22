import { useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import EventContext from "../event.store.js";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";

const CATEGORY_OPTIONS = [
  "Conference",
  "Service",
  "Worship",
  "Prayers",
  "Outreach",
  "Bible Study",
  "Serminary",
  "Retreat",
  "Workshop",
  "Camp Meeting"
];

function ProgramsEventsFilters({ activeStatus }) {
  const store = useContext(EventContext);

  const { values: lookupCategories } = useLookupValues("eventCategory");
  const categoryOptions = lookupCategories?.length ? lookupCategories : CATEGORY_OPTIONS;

  const [searchValue, setSearchValue] = useState(store?.filters?.search || "");

  useEffect(() => {
    setSearchValue(store?.filters?.search || "");
  }, [store?.filters?.search]);

  const refreshAll = async (partial) => {
    await store?.fetchEventStats?.(partial);
    await store?.fetchEvents?.({ status: activeStatus, ...(partial || {}) });
  };

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      store?.fetchEventStats?.({ search: next, page: 1 });
      store?.fetchEvents?.({ status: activeStatus, search: next, page: 1 });
    }, 400);
  }, [activeStatus, store]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const onCategoryChange = async (e) => {
    const value = e.target.value;
    store?.setFilters({ category: value, page: 1 });
    await refreshAll({ category: value, page: 1 });
  };

  const onSearchChange = (e) => {
    const next = e.target.value;
    setSearchValue(next);
    store?.setFilters({ search: next, page: 1 });

    debouncedSearch(next);
  };

  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end md:justify-end">
      <input
        value={searchValue}
        onChange={onSearchChange}
        className="h-11 w-full md:w-[220px] rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
        placeholder="Search event title..."
      />

      <select
        value={store?.filters?.category || ""}
        onChange={onCategoryChange}
        className="h-11 w-full md:w-auto rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm truncate"
      >
        <option value="">All Categories</option>
        {categoryOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

export default ProgramsEventsFilters;
