import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import ExpensesContext, { ExpensesProvider } from "../expenses.store.js";
import ExpensesFilters from "../components/ExpensesFilters.jsx";
import ExpensesForm from "../components/ExpensesForm.jsx";
import ExpensesTable from "../components/ExpensesTable.jsx";
import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";

function ExpensesPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(ExpensesContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [kpi, setKpi] = useState({ thisWeek: 0, thisMonth: 0, lastMonth: 0, thisYear: 0, change: null });

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
        thisYear: Number(data?.thisYear || 0),
        change: data?.change || null
      });
    } catch {
      setKpi({ thisWeek: 0, thisMonth: 0, lastMonth: 0, thisYear: 0, change: null });
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
        <KpiCard
          title="This Week"
          value={formatMoney(kpi.thisWeek || 0, currency)}
          change={kpi.change?.thisWeek}
          compareLabel="last week"
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 9h18M8 2v3M16 2v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M8 13h2M11 13h2M14 13h2M8 16h2M11 16h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          title="This Month"
          value={formatMoney(kpi.thisMonth || 0, currency)}
          change={kpi.change?.thisMonth}
          compareLabel="last month"
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 9h18M8 2v3M16 2v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M7 13h10M7 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          title="Last Month"
          value={formatMoney(kpi.lastMonth || 0, currency)}
          subtitle="Previous month total"
          iconBg="bg-gray-50"
          iconColor="text-gray-400"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3.05 11a9 9 0 1 0 .5-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M3 4v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="This Year"
          value={formatMoney(kpi.thisYear || 0, currency)}
          change={kpi.change?.thisYear}
          compareLabel="last year"
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 9h18M8 2v3M16 2v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M8 13h3v4H8zM13 13h3v4h-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          }
        />
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
