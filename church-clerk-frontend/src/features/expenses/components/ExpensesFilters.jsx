import { useContext, useEffect, useState } from "react";
import DateRangeFilter from "../../../shared/components/DateRangeFilter/index.jsx";
import ExpensesContext from "../expenses.store.js";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";

const CATEGORY_OPTIONS = [
  "Maintenance",
  "Equipment",
  "Utilities",
  "Transportation",
  "Pastor Support",
  "Charity",
  "Church Project",
  "Program",
  "Building materials",
  "Salary"
];

function ExpensesFilters() {
  const store = useContext(ExpensesContext);

  const { values: lookupCategories } = useLookupValues("expenseCategory");
  const categoryOptions = lookupCategories?.length ? lookupCategories : CATEGORY_OPTIONS;

  const appliedDateFrom = store?.filters?.dateFrom || "";
  const appliedDateTo = store?.filters?.dateTo || "";

  const onCategoryChange = async (e) => {
    const value = e.target.value;
    store?.setFilters?.({ category: value, page: 1 });
    await store?.fetchGeneralExpenses?.({ category: value, page: 1 });
  };

  const applyDates = async (from, to) => {
    store?.setFilters?.({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchGeneralExpenses?.({ dateFrom: from, dateTo: to, page: 1 });
  };

  return (
    <div className="flex flex-row flex-wrap gap-2 items-end justify-end">
      <select
        value={store?.filters?.category || ""}
        onChange={onCategoryChange}
        className="h-11 flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 md:flex-none text-sm"
      >
        <option value="">All Categories</option>
        {categoryOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <DateRangeFilter appliedFrom={appliedDateFrom} appliedTo={appliedDateTo} onApply={applyDates} />
    </div>
  );
}

export default ExpensesFilters;
