import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import BudgetingContext, { BudgetingProvider } from "../budgeting.store.js";
import BudgetingFilters from "../components/BudgetingFilters.jsx";
import BudgetingForm from "../components/BudgetingForm.jsx";
import BudgetingTable from "../components/BudgetingTable.jsx";

function BudgetingPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(BudgetingContext);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

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

  return (
    <div className="w-full max-w-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Budgeting</h2>
          <p className="mt-2 text-gray-600 text-sm hidden md:block">Create budgets and compare planned vs actual spending.</p>
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

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Budgets</div>
            <div className="text-gray-500 text-xs">Create, filter, and manage your budgets.</div>
          </div>

          <BudgetingFilters />
        </div>

        <BudgetingTable onEdit={openEdit} onCreate={openCreate} />
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
