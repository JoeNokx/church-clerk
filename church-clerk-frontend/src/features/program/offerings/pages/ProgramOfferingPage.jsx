import { useContext, useEffect, useMemo, useState } from "react";
import { useGuardedAction } from "../../../../shared/context/SubscriptionLockContext.jsx";
import PermissionContext from "../../../permissions/permission.store.js";
import ProgramOfferingContext, { ProgramOfferingProvider } from "../programOfferings.store.js";
import ProgramOfferingFilters from "../components/ProgramOfferingFilters.jsx";
import ProgramOfferingForm from "../components/ProgramOfferingForm.jsx";
import ProgramOfferingTable from "../components/ProgramOfferingTable.jsx";

export function ProgramOfferingPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(ProgramOfferingContext);
  const guarded = useGuardedAction();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState(null);

  const canCreate = useMemo(() => (typeof can === "function" ? can("programs", "create") : false), [can]);

  useEffect(() => {
    if (!store?.programId) return;
    store?.fetchOfferings?.();
  }, [store?.programId]);

  const openCreate = () => {
    setEditingOffering(null);
    setIsFormOpen(true);
  };

  const openEdit = (offering) => {
    setEditingOffering(offering);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingOffering(null);
  };

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900 md:text-2xl lg:text-3xl text-xl">Program Offerings</h2>
          <p className="mt-1 text-gray-600 text-sm">Record and manage offerings collected for this program.</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              type="button"
              onClick={() => guarded(() => openCreate())}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
            >
              <span className="leading-none text-lg">+</span>
              Add Offering
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Offerings Records</div>
            <div className="text-gray-500 text-xs">All offerings and their details</div>
          </div>

          <ProgramOfferingFilters />
        </div>

        <ProgramOfferingTable onEdit={openEdit} onCreate={openCreate} />
      </div>

      <ProgramOfferingForm
        open={isFormOpen}
        mode={editingOffering ? "edit" : "create"}
        initialData={editingOffering}
        onClose={closeForm}
        onSuccess={() => {
          closeForm();
        }}
      />
    </div>
  );
}

function ProgramOfferingPage({ programId }) {
  return (
    <ProgramOfferingProvider programId={programId}>
      <ProgramOfferingPageInner />
    </ProgramOfferingProvider>
  );
}

export default ProgramOfferingPage;
