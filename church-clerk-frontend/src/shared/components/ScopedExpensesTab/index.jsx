import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import ChurchContext from "../../../features/church/church.store.js";
import FilterBar from "../FilterBar/index.jsx";
import MobileFilterBar from "../MobileFilterBar/index.jsx";
import TableKebabMenu from "../TableKebabMenu/index.jsx";
import Pagination from "../Pagination/index.jsx";
import EmptyState from "../EmptyState/index.jsx";
import Button from "../Button/index.jsx";
import { formatMoney } from "../../utils/formatMoney.js";
import { truncateMobileName, truncateDesktopName } from "../../utils/truncateTableText.js";
import { useGuardedAction } from "../../context/SubscriptionLockContext.jsx";
import AddLookupValueButton from "../../../features/lookups/components/AddLookupValueButton.jsx";
import { useLookupValues } from "../../../features/lookups/hooks/useLookupValues.js";
import {
  getScopedExpenses,
  createScopedExpense,
  updateScopedExpense
} from "../../services/scopedExpenses.api.js";

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

const PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank Transfer", "Cheque"];

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function ScopedExpensesTab({ scope, entityId, entityLabel = "record" }) {
  const guarded = useGuardedAction();
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 0, prevPage: null, nextPage: null });
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const debouncedSearch = useDebouncedValue(search, 400);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formEditing, setFormEditing] = useState(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewRow, setViewRow] = useState(null);

  // form fields
  const [title, setTitle] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [description, setDescription] = useState("");

  const { values: lookupCategories, reload: reloadCategories } = useLookupValues("expenseCategory");
  const categoryOptions = lookupCategories?.length ? lookupCategories : CATEGORY_OPTIONS;
  const categorySelectOptions = useMemo(
    () => categoryOptions.map((c) => ({ label: c, value: c })),
    [categoryOptions]
  );

  const fetchExpenses = useCallback(async (overrides = {}) => {
    if (!scope || !entityId) return;
    const params = {
      page: overrides.page || 1,
      limit: overrides.limit || limit
    };
    const nextCategory = overrides.category !== undefined ? overrides.category : category;
    const nextFrom = overrides.dateFrom !== undefined ? overrides.dateFrom : dateFrom;
    const nextTo = overrides.dateTo !== undefined ? overrides.dateTo : dateTo;
    const nextSearch = overrides.search !== undefined ? overrides.search : debouncedSearch;
    if (nextCategory) params.category = nextCategory;
    if (nextFrom) params.dateFrom = nextFrom;
    if (nextTo) params.dateTo = nextTo;
    if (nextSearch) params.search = nextSearch;

    setLoading(true);
    setError("");
    try {
      const res = await getScopedExpenses(scope, entityId, params);
      const payload = res?.data?.data ?? res?.data;
      setExpenses(Array.isArray(payload?.expenses) ? payload.expenses : []);
      setPagination(payload?.pagination || { currentPage: 1, totalPages: 0, prevPage: null, nextPage: null });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load expenses");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [scope, entityId, category, dateFrom, dateTo, debouncedSearch, limit]);

  useEffect(() => {
    fetchExpenses({ page: 1 });
  }, [scope, entityId, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = Boolean(search || category || dateFrom || dateTo);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setDateFrom("");
    setDateTo("");
    fetchExpenses({ page: 1, search: "", category: "", dateFrom: "", dateTo: "" });
  };

  const openCreate = () => {
    setFormMode("create");
    setFormEditing(null);
    setTitle("");
    setFormCategory("");
    setAmount("");
    setDate("");
    setPaymentMethod("Cash");
    setDescription("");
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setFormMode("edit");
    setFormEditing(row);
    setTitle(String(row?.title || ""));
    setFormCategory(String(row?.category || ""));
    setAmount(row?.amount ?? "");
    setDate(String(row?.date || "").slice(0, 10));
    setPaymentMethod(String(row?.paymentMethod || "Cash"));
    setDescription(String(row?.description || ""));
    setFormError("");
    setFormOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError("");

    if (!title.trim()) { setFormError("Expense name is required."); setIsSubmitting(false); return; }
    if (!formCategory) { setFormError("Please select a category."); setIsSubmitting(false); return; }
    if (!amount || Number(amount) <= 0) { setFormError("Amount is required."); setIsSubmitting(false); return; }
    if (!date) { setFormError("Date is required."); setIsSubmitting(false); return; }

    const payload = {
      title: title.trim(),
      category: formCategory,
      amount: Number(amount),
      date,
      paymentMethod,
      description: String(description || "").trim()
    };

    try {
      if (formMode === "edit") {
        await updateScopedExpense(scope, entityId, formEditing?._id, payload);
      } else {
        await createScopedExpense(scope, entityId, payload);
      }
      setFormOpen(false);
      setFormEditing(null);
      await fetchExpenses({ page: 1 });
    } catch (e2) {
      setFormError(e2?.response?.data?.message || e2?.message || "Request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPageChange = (page) => { if (page) fetchExpenses({ page }); };
  const onLimitChange = (n) => { setLimit(n); fetchExpenses({ page: 1, limit: n }); };

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-3 justify-between w-full md:w-auto md:block">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Expenses</div>
            <div className="text-gray-500 text-xs">Expense records for this {entityLabel}</div>
          </div>
          <button
            type="button"
            onClick={() => guarded(openCreate)}
            className="md:hidden inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm h-10"
          >
            <span className="leading-none text-lg">+</span>
            Add Expense
          </button>
        </div>

        <div className="flex flex-col gap-2 items-end w-full md:w-auto">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name or category"
            searchWidth="md:w-[320px]"
            selects={[
              {
                key: "category",
                value: category,
                onChange: (v) => { setCategory(v); fetchExpenses({ page: 1, category: v }); },
                options: categorySelectOptions,
                placeholder: "All Categories"
              }
            ]}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateApply={(from, to) => { setDateFrom(from); setDateTo(to); fetchExpenses({ page: 1, dateFrom: from, dateTo: to }); }}
          >
            <button
              type="button"
              onClick={() => guarded(openCreate)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm h-10"
            >
              <span className="leading-none text-lg">+</span>
              Add Expense
            </button>
          </FilterBar>
          <MobileFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name or category"
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateApply={(from, to) => { setDateFrom(from); setDateTo(to); fetchExpenses({ page: 1, dateFrom: from, dateTo: to }); }}
            filters={[
              {
                key: "category",
                label: "Category",
                value: category,
                defaultValue: "",
                options: [{ label: "All Categories", value: "" }, ...categorySelectOptions]
              }
            ]}
            onApply={(pending) => { setCategory(pending?.category || ""); fetchExpenses({ page: 1, category: pending?.category || "" }); }}
            className="w-full"
          />
        </div>
      </div>

      {error ? <div className="p-4 text-red-700 md:p-6 lg:p-8 text-sm">{error}</div> : null}

      {loading ? (
        <div className="p-4 space-y-3 animate-pulse md:p-6 lg:p-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-1.5">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="h-4 w-16 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          compact
          illustration={hasFilters ? "search" : "expenses"}
          title={hasFilters ? "No expenses found" : "No expenses yet"}
          description={hasFilters
            ? "We couldn't find any expenses matching your current filters or date range."
            : `Record your first expense for this ${entityLabel} to start tracking spending.`}
          actionLabel={hasFilters ? "Clear Filters" : null}
          onAction={hasFilters ? clearFilters : undefined}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                  <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Expense Name</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Category</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Amount</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date Spent</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Payment Method</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Ref ID</th>
                  <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.map((row, index) => (
                  <tr key={row?._id ?? `row-${index}`} className="max-md:text-xs text-gray-700 text-sm">
                    <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={row?.title || "-"}>
                      <span className="sm:hidden">{truncateMobileName(row?.title || "-")}</span>
                      <span className="hidden sm:inline">{truncateDesktopName(row?.title || "-")}</span>
                    </td>
                    <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6" title={row?.category || "-"}>
                      <span className="sm:hidden">{truncateMobileName(row?.category || "-")}</span>
                      <span className="hidden sm:inline">{truncateDesktopName(row?.category || "-")}</span>
                    </td>
                    <td className="max-md:px-4 py-1.5 text-orange-600 whitespace-nowrap px-4 md:px-6">{formatMoney(row?.amount || 0, currency)}</td>
                    <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{formatDate(row?.date)}</td>
                    <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6">{row?.paymentMethod || "-"}</td>
                    <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                      {row?.referenceId ? (
                        <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{row.referenceId}</span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                      <TableKebabMenu items={[
                        { label: "View", onClick: () => { setViewRow(row); setViewOpen(true); } },
                        { label: "Edit", onClick: () => guarded(() => openEdit(row)) }
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            pagination={pagination}
            rowsCount={expenses.length}
            limit={limit}
            onLimitChange={onLimitChange}
            onPageChange={onPageChange}
            itemName="expenses"
            filtered={hasFilters}
          />
        </>
      )}

      {viewOpen && viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 md:px-6 py-4">
              <div>
                <div className="font-semibold text-gray-900 text-sm">{viewRow?.title || "Expense"}</div>
                <div className="mt-0.5 font-mono text-xs text-gray-500">{viewRow?.referenceId || ""}</div>
              </div>
              <button type="button" onClick={() => setViewOpen(false)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="font-semibold text-gray-500 text-xs">Category</div><div className="mt-1 text-gray-900">{viewRow?.category || "-"}</div></div>
                <div><div className="font-semibold text-gray-500 text-xs">Amount</div><div className="mt-1 text-orange-600 font-semibold">{formatMoney(viewRow?.amount || 0, currency)}</div></div>
                <div><div className="font-semibold text-gray-500 text-xs">Date Spent</div><div className="mt-1 text-gray-900">{formatDate(viewRow?.date)}</div></div>
                <div><div className="font-semibold text-gray-500 text-xs">Date Recorded</div><div className="mt-1 text-gray-900">{formatDate(viewRow?.createdAt)}</div></div>
                <div><div className="font-semibold text-gray-500 text-xs">Payment Method</div><div className="mt-1 text-gray-900">{viewRow?.paymentMethod || "-"}</div></div>
                <div><div className="font-semibold text-gray-500 text-xs">Recorded By</div><div className="mt-1 text-gray-900">{viewRow?.createdBy?.fullName || "-"}</div></div>
              </div>
              <div><div className="font-semibold text-gray-500 text-xs">Description</div><div className="mt-1 text-gray-700">{viewRow?.description || "-"}</div></div>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div className="font-semibold text-gray-900 text-sm">{formMode === "edit" ? "Edit Expense" : "Add Expense"}</div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form onSubmit={submit} className="p-4 md:p-6 lg:p-8">
              {formError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-gray-500 text-xs">Expense Name</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                    placeholder="e.g. Generator fuel for Sunday service"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-gray-500 text-xs">Category</label>
                    <AddLookupValueButton
                      label="Add category"
                      kind="expenseCategory"
                      onCreated={async (value) => {
                        await reloadCategories();
                        setFormCategory(value);
                      }}
                    />
                  </div>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-500 text-xs">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-500 text-xs">Amount</label>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-500 text-xs">Date Spent</label>
                  <input
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    type="date"
                    className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-gray-500 text-xs">Description (optional)</label>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                    maxLength={500}
                    className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                    placeholder="e.g. Extra details about this expense (max 500 chars)"
                  />
                  <div className="mt-1 text-right text-gray-400 text-xs">
                    {description.length}/500 chars
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  loadingText={formMode === "edit" ? "Updating..." : "Saving..."}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {formMode === "edit" ? "Update" : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScopedExpensesTab;
