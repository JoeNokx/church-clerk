import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import ExpensesContext from "../expenses.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";
import { getGeneralExpenses } from "../services/expenses.api.js";

const CATEGORY_OPTIONS = [
  "Maintenance",
  "Equipment",
  "Utilities",
  "Transportation",
  "Pastor Support",
  "Charity",
  "Fundraising",
  "Program",
  "Building materials",
  "Salary"
];

function ExpensesFilters() {
  const store = useContext(ExpensesContext);

  const [searchValue, setSearchValue] = useState(store?.filters?.search || "");

  const fetchRef = useRef(store?.fetchGeneralExpenses);
  useEffect(() => { fetchRef.current = store?.fetchGeneralExpenses; });

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      fetchRef.current?.({ search: next, page: 1 });
    }, 400);
  }, []);

  useEffect(() => {
    setSearchValue(store?.filters?.search || "");
  }, [store?.filters?.search]);

  useEffect(() => {
    return () => { debouncedSearch.cancel(); };
  }, [debouncedSearch]);

  const onSearchChange = (next) => {
    setSearchValue(next);
    store?.setFilters?.({ search: next, page: 1 });
    debouncedSearch(next);
  };

  const { values: lookupCategories } = useLookupValues("generalExpenseCategory");
  const categoryOptions = lookupCategories?.length ? lookupCategories : CATEGORY_OPTIONS;

  const appliedDateFrom = store?.filters?.dateFrom || "";
  const appliedDateTo = store?.filters?.dateTo || "";

  const onCategoryChange = async (v) => {
    store?.setFilters?.({ category: v, page: 1 });
    await store?.fetchGeneralExpenses?.({ category: v, page: 1 });
  };

  const applyDates = async (from, to) => {
    store?.setFilters?.({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchGeneralExpenses?.({ dateFrom: from, dateTo: to, page: 1 });
  };

  const categorySelectOptions = useMemo(
    () => categoryOptions.map((c) => ({ label: c, value: c })),
    [categoryOptions]
  );

  const mobileFilters = [
    {
      key: "category",
      label: "Category",
      value: store?.filters?.category || "",
      defaultValue: "",
      options: [{ label: "All Categories", value: "" }, ...categorySelectOptions],
    },
  ];

  const onMobileApply = async (pending) => {
    store?.setFilters?.({ category: pending.category, page: 1 });
    await store?.fetchGeneralExpenses?.({ category: pending.category, page: 1 });
  };

  const getLiveCount = useCallback(async ({ filters: f, dateFrom: dFrom, dateTo: dTo }) => {
    try {
      const params = { page: 1, limit: 1 };
      if (f?.category && f.category !== "") params.category = f.category;
      if (searchValue) params.search = searchValue;
      if (dFrom) params.dateFrom = dFrom;
      if (dTo) params.dateTo = dTo;
      const res = await getGeneralExpenses(params);
      const payload = res?.data?.data ?? res?.data;
      return payload?.pagination?.totalResult ?? null;
    } catch {
      return null;
    }
  }, [searchValue]);

  return (
    <>
      <FilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search name or category"
        searchWidth="md:w-[320px]"
        selects={[
          {
            key: "category",
            value: store?.filters?.category || "",
            onChange: onCategoryChange,
            options: categorySelectOptions,
            placeholder: "All Categories",
          },
        ]}
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
      />
      <MobileFilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search name or category"
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
        filters={mobileFilters}
        onApply={onMobileApply}
        resultCount={store?.pagination?.totalResult ?? null}
        getLiveCount={getLiveCount}
      />
    </>
  );
}

export default ExpensesFilters;
