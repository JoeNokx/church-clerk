import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import BudgetingContext, { BudgetingProvider } from "../budgeting.store.js";
import BudgetingFilters from "../components/BudgetingFilters.jsx";
import BudgetingForm from "../components/BudgetingForm.jsx";
import BudgetingTable from "../components/BudgetingTable.jsx";
import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";

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
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Budgeting</h2>
          <p className="mt-2 text-sm text-gray-600">Create budgets and compare planned vs actual spending.</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <span className="text-lg leading-none">+</span>
              New Budget
            </button>
          ) : null}
        </div>
      </div>

      {viewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">{viewBudget?.name || "Budget"}</div>
                <div className="mt-1 text-xs text-gray-500">Budget summary and planned items</div>
              </div>
              <button
                type="button"
                onClick={closeView}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              {viewLoading ? (
                <div className="text-sm text-gray-600">Loading…</div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                      <div className="text-xs font-semibold text-gray-500">Planned Income</div>
                      <div className="mt-2 text-lg font-semibold text-gray-900">{formatMoney(viewSummary?.plannedIncomeTotal || 0, currency)}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                      <div className="text-xs font-semibold text-gray-500">Planned Expenses</div>
                      <div className="mt-2 text-lg font-semibold text-gray-900">{formatMoney(viewSummary?.plannedExpenseTotal || 0, currency)}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                      <div className="text-xs font-semibold text-gray-500">Actual Expenses</div>
                      <div className="mt-2 text-lg font-semibold text-gray-900">{formatMoney(viewSummary?.actualExpenseTotal || 0, currency)}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                      <div className="text-xs font-semibold text-gray-500">Variance (Budget Left)</div>
                      <div className="mt-2 text-lg font-semibold text-gray-900">{formatMoney(viewSummary?.varianceExpense || 0, currency)}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200">
                    <div className="border-b border-gray-200 px-5 py-4">
                      <div className="text-sm font-semibold text-gray-900">Planned Items</div>
                      <div className="mt-1 text-xs text-gray-500">Expense and income breakdown for this budget.</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-slate-100">
                          <tr className="text-left text-xs font-semibold text-gray-500">
                            <th className="px-6 py-2">Type</th>
                            <th className="px-6 py-2">Category</th>
                            <th className="px-6 py-2">Amount</th>
                            <th className="px-6 py-2">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {items.length ? (
                            items.map((it, idx) => (
                              <tr key={`it-${idx}`} className="text-sm text-gray-700">
                                <td className="px-6 py-2 capitalize">{it?.type || "-"}</td>
                                <td className="px-6 py-2 text-gray-900 font-semibold">{it?.category || "-"}</td>
                                <td className="px-6 py-2">{formatMoney(it?.amount || 0, currency)}</td>
                                <td className="px-6 py-2 text-gray-600">{it?.notes || "-"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-6 py-6 text-sm text-gray-600">
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
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Budgets</div>
            <div className="text-xs text-gray-500">Create, filter, and manage your budgets.</div>
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
