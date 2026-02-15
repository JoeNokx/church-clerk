import { useContext, useEffect, useRef, useState } from "react";
import EventContext from "../event.store.js";

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

  const [searchValue, setSearchValue] = useState(store?.filters?.search || "");
  const debounceRef = useRef(null);

  useEffect(() => {
    setSearchValue(store?.filters?.search || "");
  }, [store?.filters?.search]);

  const refreshAll = async (partial) => {
    await store?.fetchEventStats?.(partial);
    await store?.fetchEvents?.({ status: activeStatus, ...(partial || {}) });
  };

  const onCategoryChange = async (e) => {
    const value = e.target.value;
    store?.setFilters({ category: value, page: 1 });
    await refreshAll({ category: value, page: 1 });
  };

  const onSearchChange = (e) => {
    const next = e.target.value;
    setSearchValue(next);
    store?.setFilters({ search: next, page: 1 });

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      refreshAll({ search: next, page: 1 });
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">Search:</span>
        <input
          value={searchValue}
          onChange={onSearchChange}
          className="h-9 w-[220px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          placeholder="Event title"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">Category:</span>
        <select
          value={store?.filters?.category || ""}
          onChange={onCategoryChange}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default ProgramsEventsFilters;
