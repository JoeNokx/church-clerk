import { useContext, useEffect, useMemo, useRef, useState } from "react";
import debounce from "../../../shared/utils/debounce.js";
import WelfareContext from "../welfare.store.js";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";

const CATEGORY_OPTIONS = ["Birthday", "Wedding", "Funeral", "Hospital", "Emergency", "School", "Other"];

function WelfareDisbursementFilters() {
  const store = useContext(WelfareContext);

  const { values: lookupCategories } = useLookupValues("welfareDisbursementCategory");
  const categoryOptions = lookupCategories?.length ? lookupCategories : CATEGORY_OPTIONS;

  const [searchValue, setSearchValue] = useState(store?.disbursementFilters?.search || "");

  const fetchRef = useRef(store?.fetchDisbursements);
  useEffect(() => { fetchRef.current = store?.fetchDisbursements; });

  const debouncedSearch = useMemo(() => {
    return debounce((next) => {
      fetchRef.current?.({ search: next, page: 1 });
    }, 400);
  }, []);

  const appliedDateFrom = store?.disbursementFilters?.dateFrom || "";
  const appliedDateTo = store?.disbursementFilters?.dateTo || "";

  useEffect(() => {
    setSearchValue(store?.disbursementFilters?.search || "");
  }, [store?.disbursementFilters?.search]);

  useEffect(() => {
    return () => { debouncedSearch.cancel(); };
  }, [debouncedSearch]);

  const onCategoryChange = async (v) => {
    store?.setDisbursementFilters?.({ category: v, page: 1 });
    await store?.fetchDisbursements?.({ category: v, page: 1 });
  };

  const onSearchChange = (next) => {
    setSearchValue(next);
    store?.setDisbursementFilters?.({ search: next, page: 1 });
    debouncedSearch(next);
  };

  const applyDates = async (from, to) => {
    store?.setDisbursementFilters?.({ dateFrom: from, dateTo: to, page: 1 });
    await store?.fetchDisbursements?.({ dateFrom: from, dateTo: to, page: 1 });
  };

  const categorySelectOptions = useMemo(
    () => categoryOptions.map((c) => ({ label: c, value: c })),
    [categoryOptions]
  );

  const mobileFilters = [
    {
      key: "category",
      label: "Category",
      value: store?.disbursementFilters?.category || "",
      defaultValue: "",
      options: [{ label: "All Categories", value: "" }, ...categorySelectOptions],
    },
  ];

  const onMobileApply = async (pending) => {
    store?.setDisbursementFilters?.({ category: pending.category, page: 1 });
    await store?.fetchDisbursements?.({ category: pending.category, page: 1 });
  };

  return (
    <>
      <FilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search name or recorded by"
        searchWidth="md:w-[320px]"
        selects={[
          {
            key: "category",
            value: store?.disbursementFilters?.category || "",
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
        searchPlaceholder="Search name or recorded by"
        dateFrom={appliedDateFrom}
        dateTo={appliedDateTo}
        onDateApply={applyDates}
        filters={mobileFilters}
        onApply={onMobileApply}
      />
    </>
  );
}

export default WelfareDisbursementFilters;
