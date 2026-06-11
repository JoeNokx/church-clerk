import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import BudgetingContext, { BudgetingProvider } from "../budgeting.store.js";
import BudgetingFilters from "../components/BudgetingFilters.jsx";
import BudgetingForm from "../components/BudgetingForm.jsx";
import BudgetingTable from "../components/BudgetingTable.jsx";
import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import KpiStatCard from "../../../shared/components/KpiStatCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";

function BudgetingPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(BudgetingContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewBudget, setViewBudget] = useState(null);
  const [viewSummary, setViewSummary] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const canCreate = useMemo(() => (typeof can === "function" ? can("budgeting", "create") : false), [can]);

  const load = useCallback(async () => {
    await store?.fetchBudgets?.();
  }, [store?.fetchBudgets]);

  useEffect(() => {
    if (!store?.activeChurchId) return;
    void load();
  }, [store?.activeChurchId, load]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row || null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const closeView = () => {
    setViewOpen(false);
    setViewBudget(null);
    setViewSummary(null);
    setViewLoading(false);
  };

  const openView = async (row) => {
    const id = row?._id;
    if (!id) return;

    setViewOpen(true);
    setViewBudget(row);
    setViewSummary(null);
    setViewLoading(true);

    try {
      const [budgetRes, summaryRes] = await Promise.all([store?.getBudget?.(id), store?.getBudgetSummary?.(id)]);
      const budgetPayload = budgetRes?.data?.budget || budgetRes?.data?.data?.budget || budgetRes?.data?.data;
      const budget = budgetPayload?.budget || budgetPayload || row;
      const summaryPayload = summaryRes?.data?.data ?? summaryRes?.data;
      const summary = summaryPayload?.data ?? summaryPayload;

      setViewBudget(budget);
      setViewSummary(summary);
    } finally {
      setViewLoading(false);
    }
  };

  const items = Array.isArray(viewBudget?.items) ? viewBudget.items : [];

  return (
    <div className="w-full max-w-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Budgeting</h2>
          <p className="mt-2 text-gray-600 text-sm">Create budgets and compare planned vs actual spending.</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
            >
              <span className="leading-none text-lg">+</span>
              New Budget
            </button>
          ) : null}
        </div>
      </div>

      {viewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div>
                <div className="font-semibold text-gray-900 text-sm">{viewBudget?.name || "Budget"}</div>
                <div className="mt-1 text-gray-500 text-xs">Budget summary and planned items</div>
              </div>
              <button
                type="button"
                onClick={closeView}
                className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="p-4 md:p-6 lg:p-8">
              {viewLoading ? (
                <div className="text-gray-600 text-sm">Loading…</div>
              ) : (
                <div className="space-y-5">
                  <KpiGrid className="gap-4 lg:grid-cols-4">
                    <KpiStatCard label="Planned Income" value={formatMoney(viewSummary?.plannedIncomeTotal || 0, currency)} />
                    <KpiStatCard label="Planned Expenses" value={formatMoney(viewSummary?.plannedExpenseTotal || 0, currency)} />
                    <KpiStatCard label="Actual Expenses" value={formatMoney(viewSummary?.actualExpenseTotal || 0, currency)} />
                    <KpiStatCard label="Variance (Budget Left)" value={formatMoney(viewSummary?.varianceExpense || 0, currency)} />
                  </KpiGrid>

                  <div className="rounded-xl border border-gray-200">
                    <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
                      <div className="font-semibold text-gray-900 text-sm">Planned Items</div>
                      <div className="mt-1 text-gray-500 text-xs">Expense and income breakdown for this budget.</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-slate-100">
                          <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                            <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Type</th>
                            <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Category</th>
                            <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Amount</th>
                            <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {items.length ? (
                            items.map((it, idx) => (
                              <tr key={`it-${idx}`} className="max-md:text-xs text-gray-700 text-sm">
                                <td className="sticky left-0 z-10 bg-white max-md:px-4 py-2 capitalize whitespace-nowrap px-4 md:px-6">{it?.type || "-"}</td>
                                <td className="max-md:px-4 py-2 text-gray-900 font-semibold whitespace-nowrap px-4 md:px-6">{it?.category || "-"}</td>
                                <td className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">{formatMoney(it?.amount || 0, currency)}</td>
                                <td className="max-md:px-4 py-2 text-gray-600 px-4 md:px-6">{it?.notes || "-"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="text-gray-600 text-sm px-4 md:px-6 py-4 md:py-6">
                                No items.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Budgets</div>
            <div className="text-gray-500 text-xs">Create, filter, and manage your budgets.</div>
          </div>

          <BudgetingFilters />
        </div>

        <BudgetingTable onView={openView} onEdit={openEdit} />
      </div>

      <BudgetingForm
        open={formOpen}
        mode={editing ? "edit" : "create"}
        initialData={editing}
        onClose={closeForm}
        onSuccess={() => {
          closeForm();
        }}
      />
    </div>
  );
}

function BudgetingPage() {
  return (
    <BudgetingProvider>
      <BudgetingPageInner />
    </BudgetingProvider>
  );
}

export default BudgetingPage;
