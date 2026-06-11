import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import { SpecialFundProvider } from "../specialFund.store.js";
import SpecialFundContext from "../specialFund.store.js";
import SpecialFundFilters from "../components/SpecialFundFilters.jsx";
import SpecialFundForm from "../components/SpecialFundForm.jsx";
import SpecialFundTable from "../components/SpecialFundTable.jsx";
import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";

function SpecialFundPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(SpecialFundContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFund, setEditingFund] = useState(null);
  const [kpi, setKpi] = useState({ thisWeek: 0, thisMonth: 0, thisYear: 0 });

  const canCreate = useMemo(() => (typeof can === "function" ? can("specialFunds", "create") : false), [can]);
  // const canCreate = true;

  const refreshKpi = useCallback(async () => {
    if (!store?.activeChurch) return;
    try {
      const res = await store?.getSpecialFundKPI?.();
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;

      setKpi({
        thisWeek: data?.thisWeek || 0,
        thisMonth: data?.thisMonth || 0,
        thisYear: data?.thisYear || 0
      });
    } catch {
      setKpi({ thisWeek: 0, thisMonth: 0, thisYear: 0 });
    }
  }, [store?.activeChurch, store?.getSpecialFundKPI]);

  useEffect(() => {
    if (!store?.activeChurch) return;
    store?.fetchSpecialFunds?.();
  }, [store?.activeChurch]);

  useEffect(() => {
    refreshKpi();
  }, [refreshKpi]);

  const openCreate = () => {
    setEditingFund(null);
    setIsFormOpen(true);
  };

  const openEdit = (fund) => {
    setEditingFund(fund);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingFund(null);
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Special Funds</h2>
          <p className="mt-1 text-gray-500 text-sm">Track and manage special church funds</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
            >
              <span className="leading-none text-lg">+</span>
              Add Fund
            </button>
          )}
        </div>
      </div>

      <KpiGrid className="mt-6 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-gray-500 text-xs">This Week</div>
              <div className="mt-2 font-semibold text-gray-900 text-lg">{formatMoney(kpi.thisWeek || 0, currency)}</div>
            </div>
            <div className="h-11 w-11 rounded-lg bg-blue-50 hidden md:flex items-center justify-center md:h-12 md:w-12">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-600">
                <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-gray-500 text-xs">This Month</div>
              <div className="mt-2 font-semibold text-gray-900 text-lg">{formatMoney(kpi.thisMonth || 0, currency)}</div>
            </div>
            <div className="h-11 w-11 rounded-lg bg-orange-50 hidden md:flex items-center justify-center md:h-12 md:w-12">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-orange-500">
                <path d="M4 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M8 17v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M12 17v-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M16 17v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-gray-500 text-xs">This Year</div>
              <div className="mt-2 font-semibold text-gray-900 text-lg">{formatMoney(kpi.thisYear || 0, currency)}</div>
            </div>
            <div className="h-11 w-11 rounded-lg bg-green-50 hidden md:flex items-center justify-center md:h-12 md:w-12">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-green-600">
                <path d="M4 17l6-6 4 4 6-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 7v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </KpiGrid>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Special Funds Records</div>
            <div className="text-gray-500 text-xs">All special funds and their details</div>
          </div>

          <SpecialFundFilters />
        </div>

        <SpecialFundTable onEdit={openEdit} onDeleted={refreshKpi} />
      </div>

      <SpecialFundForm
        open={isFormOpen}
        mode={editingFund ? "edit" : "create"}
        initialData={editingFund}
        onClose={closeForm}
        onSuccess={() => {
          closeForm();
          refreshKpi();
        }}
      />
    </div>
  );
}

function SpecialFundPage() {
  return (
    <SpecialFundProvider>
      <SpecialFundPageInner />
    </SpecialFundProvider>
  );
}

export default SpecialFundPage;
