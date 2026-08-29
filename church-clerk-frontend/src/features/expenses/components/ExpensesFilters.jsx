import { useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
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

  const [recordedByValue, setRecordedByValue] = useState(store?.filters?.recordedBy || "");

  const fetchRef = useRef(store?.fetchGeneralExpenses);
  useEffect(() => { fetchRef.current = store?.fetchGeneralExpenses; });

  const debouncedRecordedBy = useMemo(() => {
    return debounce((next) => {
      fetchRef.current?.({ recordedBy: next, page: 1 });
    }, 400);
  }, []);

  useEffect(() => {
    setRecordedByValue(store?.filters?.recordedBy || "");
  }, [store?.filters?.recordedBy]);

  useEffect(() => {
    return () => { debouncedRecordedBy.cancel(); };
  }, [debouncedRecordedBy]);

  const onRecordedByChange = (e) => {
    const next = e.target.value;
    setRecordedByValue(next);
    store?.setFilters?.({ recordedBy: next, page: 1 });
    debouncedRecordedBy(next);
  };

  const { values: lookupCategories } = useLookupValues("generalExpenseCategory");
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
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-end">
      <input
        value={recordedByValue}
        onChange={onRecordedByChange}
        className="h-11 w-full md:w-[200px] rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
        placeholder="Search recorded by"
      />
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
