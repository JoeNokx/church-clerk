import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import SpecialFundContext from "../specialFund.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";
import { getSpecialFunds } from "../services/specialFund.api.js";

const CATEGORY_OPTIONS = [
  "Prophetic Seed",
  "Pastor Appreciation",
  "Thanksgiving Offering",
  "Missionary Support",
  "Donation",
  "Retreat",
  "Scholarship Fund"
];

function SpecialFundFilters() {
  const store = useContext(SpecialFundContext);

  const { values: lookupCategories } = useLookupValues("specialFundCategory");
  const categoryOptions = lookupCategories?.length ? lookupCategories : CATEGORY_OPTIONS;

  const [searchValue, setSearchValue] = useState(store?.filters?.search || "");

  const fetchRef = useRef(store?.fetchSpecialFunds);
  useEffect(() => {
    fetchRef.current = store?.fetchSpecialFunds;
  });

  const debouncedSearch = useMemo(() => debounce((next) => {
    fetchRef.current?.({ search: next, page: 1 });
  }, 400), []);

  const appliedDateFrom = store?.filters?.dateFrom || "";
  const appliedDateTo = store?.filters?.dateTo || "";

  useEffect(() => {
    setSearchValue(store?.filters?.search || "");
  }, [store?.filters?.search]);

  useEffect(() => {
    return () => { debouncedSearch.cancel(); };
  }, [debouncedSearch]);

  const onCategoryChange = async (e) => {
    const value = e.target.value;
    store?.setFilters({ category: value, page: 1 });
    await store?.fetchSpecialFunds({ category: value, page: 1 });
  };

  const onSearchChange = (next) => {
    setSearchValue(next);
    store?.setFilters({ search: next, page: 1 });
    debouncedSearch(next);
  };

  const applyDates = async (from, to) => {
    store?.setFilters({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchSpecialFunds({ dateFrom: from, dateTo: to, page: 1 });
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
    store?.setFilters({ category: pending.category, page: 1 });
    await store?.fetchSpecialFunds({ category: pending.category, page: 1 });
  };

  const getLiveCount = useCallback(async ({ filters: f, dateFrom: dFrom, dateTo: dTo }) => {
    try {
      const params = { page: 1, limit: 1 };
      if (f?.category && f.category !== "") params.category = f.category;
      if (searchValue) params.search = searchValue;
      if (dFrom) params.dateFrom = dFrom;
      if (dTo) params.dateTo = dTo;
      const res = await getSpecialFunds(params, store?.activeChurch);
      const payload = res?.data?.data ?? res?.data;
      return payload?.pagination?.totalResult ?? null;
    } catch {
      return null;
    }
  }, [searchValue, store?.activeChurch]);

  return (
    <>
      <FilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search giver name or recorded by"
        searchWidth="md:w-[320px]"
        selects={[
          {
            key: "category",
            value: store?.filters?.category || "",
            onChange: (v) => onCategoryChange({ target: { value: v } }),
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
        searchPlaceholder="Search giver name or recorded by"
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

export default SpecialFundFilters;
