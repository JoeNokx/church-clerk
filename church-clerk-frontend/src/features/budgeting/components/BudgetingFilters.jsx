import { useContext, useEffect, useMemo, useState } from "react";

import BudgetingContext from "../budgeting.store.js";
import debounce from "../../../shared/utils/debounce.js";

function BudgetingFilters() {
  const store = useContext(BudgetingContext);

  const [search, setSearch] = useState("");

  const years = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    return [y - 1, y, y + 1, y + 2];
  }, []);

  const debouncedFetch = useMemo(() => {
    return debounce((value) => {
      store?.setFilters?.({ search: value, page: 1 });
      void store?.fetchBudgets?.({ search: value, page: 1 });
    }, 400);
  }, [store]);

  useEffect(() => {
    setSearch(store?.filters?.search || "");
  }, [store?.filters?.search]);

  useEffect(() => {
    return () => { debouncedFetch.cancel?.(); };
  }, [debouncedFetch]);

  const onChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    debouncedFetch(value);
  };

  return (
    <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row md:flex-wrap md:items-end md:justify-end">
      <input
        value={search}
        onChange={onChange}
        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 md:w-56 text-sm"
        placeholder="Search budget name..."
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={store?.filters?.fiscalYear || ""}
          onChange={(e) => {
            const value = e.target.value;
            store?.setFilters?.({ fiscalYear: value, page: 1 });
            void store?.fetchBudgets?.({ fiscalYear: value, page: 1 });
          }}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={store?.filters?.status || ""}
          onChange={(e) => {
            const value = e.target.value;
            store?.setFilters?.({ status: value, page: 1 });
            void store?.fetchBudgets?.({ status: value, page: 1 });
          }}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>
    </div>
  );
}

export default BudgetingFilters;
