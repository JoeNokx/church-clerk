import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import ExpensesContext, { ExpensesProvider } from "../expenses.store.js";
import ExpensesFilters from "../components/ExpensesFilters.jsx";
import ExpensesForm from "../components/ExpensesForm.jsx";
import ExpensesTable from "../components/ExpensesTable.jsx";
import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import KpiStatCard from "../../../shared/components/KpiStatCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";

function ExpensesPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(ExpensesContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [kpi, setKpi] = useState({ thisWeek: 0, thisMonth: 0, lastMonth: 0, thisYear: 0 });

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

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Expenses</h2>
          <p className="mt-2 text-gray-600 text-sm">Track and manage church general expenses</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
            >
              <span className="leading-none text-lg">+</span>
              Add Expense
            </button>
          )}
        </div>
      </div>

      <KpiGrid className="mt-4 gap-3 lg:grid-cols-4">
        <KpiStatCard label="This Week" value={formatMoney(kpi.thisWeek || 0, currency)} />
        <KpiStatCard label="This Month" value={formatMoney(kpi.thisMonth || 0, currency)} />
        <KpiStatCard label="Last Month" value={formatMoney(kpi.lastMonth || 0, currency)} />
        <KpiStatCard label="This Year" value={formatMoney(kpi.thisYear || 0, currency)} />
      </KpiGrid>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
          <div>
            <div className="font-semibold text-gray-900 text-sm">General Expenses Records</div>
            <div className="text-gray-500 text-xs">All expense records and their details</div>
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
