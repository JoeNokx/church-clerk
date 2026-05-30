import { useContext, useEffect, useMemo, useRef, useState } from "react";

import BudgetingContext from "../budgeting.store.js";

function BudgetingFilters() {
  const store = useContext(BudgetingContext);

  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    setSearch(store?.filters?.search || "");
  }, [store?.filters?.search]);

  const years = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    return [y - 1, y, y + 1, y + 2];
  }, []);

  const applySearch = async () => {
    const value = String(search || "").trim();
    store?.setFilters?.({ search: value, page: 1 });
    await store?.fetchBudgets?.({ search: value, page: 1 });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
      <div className="flex items-center gap-2">
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void applySearch();
            }
          }}
          className="h-9 w-full sm:w-56 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          placeholder="Budget name..."
        />
        <button
          type="button"
          onClick={() => void applySearch()}
          className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Apply
        </button>
      </div>

      <select
        value={store?.filters?.fiscalYear || ""}
        onChange={(e) => {
          const value = e.target.value;
          store?.setFilters?.({ fiscalYear: value, page: 1 });
          void store?.fetchBudgets?.({ fiscalYear: value, page: 1 });
        }}
        className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
      >
        <option value="">All</option>
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
        className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
      >
        <option value="">All</option>
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </select>
    </div>
  );
}

export default BudgetingFilters;
