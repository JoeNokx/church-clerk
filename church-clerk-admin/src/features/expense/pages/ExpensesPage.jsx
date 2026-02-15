import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../Permissions/permission.store.js";
import ExpensesContext, { ExpensesProvider } from "../expense.store.js";
import ExpensesFilters from "../components/ExpensesFilters.jsx";
import ExpensesForm from "../components/ExpensesForm.jsx";
import ExpensesTable from "../components/ExpensesTable.jsx";
import ChurchContext from "../../Church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";

function ExpensesPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(ExpensesContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [kpi, setKpi] = useState({ thisWeek: 0, thisMonth: 0, lastMonth: 0, thisYear: 0 });

  const canRead = useMemo(() => (typeof can === "function" ? can("expenses", "read") : true), [can]);
  const canCreate = useMemo(() => (typeof can === "function" ? can("expenses", "create") : false), [can]);

  const refreshKpi = useCallback(async () => {
    if (!store?.activeChurchId) return;
    try {
      const res = await store?.getGeneralExpensesKPI?.();
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;

      setKpi({
        thisWeek: Number(data?.thisWeek || 0),
        thisMonth: Number(data?.thisMonth || 0),
        lastMonth: Number(data?.lastMonth || 0),
        thisYear: Number(data?.thisYear || 0)
      });
    } catch {
      setKpi({ thisWeek: 0, thisMonth: 0, lastMonth: 0, thisYear: 0 });
    }
  }, [store?.activeChurchId, store?.getGeneralExpensesKPI]);

  useEffect(() => {
    if (!store?.activeChurchId) return;
    store?.fetchGeneralExpenses?.();
  }, [store?.activeChurchId]);

  useEffect(() => {
    refreshKpi();
  }, [refreshKpi]);

  const openCreate = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };

  const openEdit = (row) => {
    setEditingExpense(row);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingExpense(null);
  };

  if (!canRead) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
        You do not have permission to view expenses.
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Expenses</h2>
          <p className="mt-2 text-sm text-gray-600">Track and manage church general expenses</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <span className="text-lg leading-none">+</span>
              Add Expense
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-500">This Week</div>
          <div className="mt-2 text-lg font-semibold text-gray-900">{formatMoney(kpi.thisWeek || 0, currency)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-500">This Month</div>
          <div className="mt-2 text-lg font-semibold text-gray-900">{formatMoney(kpi.thisMonth || 0, currency)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-500">Last Month</div>
          <div className="mt-2 text-lg font-semibold text-gray-900">{formatMoney(kpi.lastMonth || 0, currency)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-500">This Year</div>
          <div className="mt-2 text-lg font-semibold text-gray-900">{formatMoney(kpi.thisYear || 0, currency)}</div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">General Expenses Records</div>
            <div className="text-xs text-gray-500">All expense records and their details</div>
          </div>

          <ExpensesFilters />
        </div>

        <ExpensesTable onEdit={openEdit} onDeleted={refreshKpi} />
      </div>

      <ExpensesForm
        open={isFormOpen}
        mode={editingExpense ? "edit" : "create"}
        initialData={editingExpense}
        onClose={closeForm}
        onSuccess={() => {
          closeForm();
          refreshKpi();
        }}
      />
    </div>
  );
}

function ExpensesPage() {
  return (
    <ExpensesProvider>
      <ExpensesPageInner />
    </ExpensesProvider>
  );
}

export default ExpensesPage;
