import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import { OfferingProvider } from "../offering.store.js";
import OfferingContext from "../offering.store.js";
import OfferingFilters from "../components/OfferingFilters.jsx";
import OfferingForm from "../components/OfferingForm.jsx";
import OfferingTable from "../components/OfferingTable.jsx";
import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";

export function OfferingPageInner({ hideKpi = false, embedded = false, noHeader = false, openCreateRef = null }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(OfferingContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState(null);
  const [kpi, setKpi] = useState({ thisWeek: 0, thisMonth: 0, thisYear: 0, change: {} });

  const canCreate = useMemo(() => (typeof can === "function" ? can("offerings", "create") : false), [can]);

  const refreshKpi = useCallback(async () => {
    if (!store?.activeChurch) return;
    try {
      const res = await store?.getOfferingKPI?.();
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;

      setKpi({
        thisWeek: data?.thisWeek || 0,
        thisMonth: data?.thisMonth || 0,
        thisYear: data?.thisYear || 0,
        change: data?.change || {}
      });
    } catch {
      setKpi({ thisWeek: 0, thisMonth: 0, thisYear: 0, change: {} });
    }
  }, [store?.activeChurch, store?.getOfferingKPI]);

  useEffect(() => {
    if (!store?.activeChurch) return;
    store?.fetchOfferings?.();
  }, [store?.activeChurch]);

  useEffect(() => {
    if (hideKpi) return;
    refreshKpi();
  }, [refreshKpi, hideKpi]);

  const openCreate = () => {
    setEditingOffering(null);
    setIsFormOpen(true);
  };

  if (openCreateRef) openCreateRef.current = openCreate;

  const openEdit = (offering) => {
    setEditingOffering(offering);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingOffering(null);
  };

  return (
    <div className={embedded ? "w-full" : "max-w-6xl"}>
      {!noHeader && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Offerings</h2>
            <p className="mt-1 text-gray-500 text-sm">Record and manage church offerings</p>
          </div>

          <div className="flex items-center gap-3">
            {canCreate && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
              >
                <span className="leading-none text-lg">+</span>
                Add Offering
              </button>
            )}
          </div>
        </div>
      )}

      {!hideKpi ? (
        <KpiGrid className="mt-6 gap-4 md:grid-cols-3">
          <KpiCard
            title="This Week"
            value={formatMoney(kpi.thisWeek || 0, currency)}
            change={kpi.change?.thisWeek}
            compareLabel="last week"
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
            icon={
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
                <path d="M4 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M8 17v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M12 17v-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M16 17v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            }
          />
          <KpiCard
            title="This Year"
            value={formatMoney(kpi.thisYear || 0, currency)}
            change={kpi.change?.thisYear}
            compareLabel="last year"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-500"
            icon={
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M4 17l6-6 4 4 6-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 7v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
        </KpiGrid>
      ) : null}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Offerings Records</div>
            <div className="text-gray-500 text-xs">All offerings and their details</div>
          </div>

          <OfferingFilters />
        </div>

        <OfferingTable onEdit={openEdit} onDeleted={hideKpi ? undefined : refreshKpi} onCreate={openCreate} />
      </div>

      <OfferingForm
        open={isFormOpen}
        mode={editingOffering ? "edit" : "create"}
        initialData={editingOffering}
        onClose={closeForm}
        onSuccess={() => {
          closeForm();
          if (!hideKpi) {
            refreshKpi();
          }
        }}
      />
    </div>
  );
}

function OfferingPage() {
  return (
    <OfferingProvider>
      <OfferingPageInner />
    </OfferingProvider>
  );
}

export default OfferingPage;
