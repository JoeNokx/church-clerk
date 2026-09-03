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

  const onRecordedByChange = (next) => {
    setRecordedByValue(next);
    store?.setFilters?.({ recordedBy: next, page: 1 });
    debouncedRecordedBy(next);
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
      if (recordedByValue) params.recordedBy = recordedByValue;
      if (dFrom) params.dateFrom = dFrom;
      if (dTo) params.dateTo = dTo;
      const res = await getGeneralExpenses(params);
      const payload = res?.data?.data ?? res?.data;
      return payload?.pagination?.totalResult ?? null;
    } catch {
      return null;
    }
  }, [recordedByValue]);

  return (
    <>
      <FilterBar
        searchValue={recordedByValue}
        onSearchChange={onRecordedByChange}
        searchPlaceholder="Search recorded by"
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
        searchValue={recordedByValue}
        onSearchChange={onRecordedByChange}
        searchPlaceholder="Search recorded by"
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
