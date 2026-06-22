import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import WelfareContext, { WelfareProvider } from "../welfare.store.js";

import WelfareContributionFilters from "../components/WelfareContributionFilters.jsx";
import WelfareContributionForm from "../components/WelfareContributionForm.jsx";
import WelfareContributionTable from "../components/WelfareContributionTable.jsx";
import WelfareDisbursementFilters from "../components/WelfareDisbursementFilters.jsx";
import WelfareDisbursementForm from "../components/WelfareDisbursementForm.jsx";
import WelfareDisbursementTable from "../components/WelfareDisbursementTable.jsx";
import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import KpiStatCard from "../../../shared/components/KpiStatCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";

function WelfarePageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(WelfareContext);
  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const [activeTab, setActiveTab] = useState("contributions");

  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [editingContribution, setEditingContribution] = useState(null);

  const [isDisbursementFormOpen, setIsDisbursementFormOpen] = useState(false);
  const [editingDisbursement, setEditingDisbursement] = useState(null);

  const [kpi, setKpi] = useState({
    thisMonthContribution: 0,
    thisMonthDisbursement: 0,
    thisYearContribution: 0,
    thisYearDisbursement: 0
  });

  const canCreate = useMemo(() => (typeof can === "function" ? can("welfare", "create") : false), [can]);

  const refreshKpi = useCallback(async () => {
    if (!store?.activeChurchId) return;
    try {
      const res = await store?.getWelfareKPI?.();
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;

      setKpi({
        thisMonthContribution: Number(data?.thisMonthContribution || 0),
        thisMonthDisbursement: Number(data?.thisMonthDisbursement || 0),
        thisYearContribution: Number(data?.thisYearContribution || 0),
        thisYearDisbursement: Number(data?.thisYearDisbursement || 0)
      });
    } catch {
      setKpi({
        thisMonthContribution: 0,
        thisMonthDisbursement: 0,
        thisYearContribution: 0,
        thisYearDisbursement: 0
      });
    }
  }, [store?.activeChurchId, store?.getWelfareKPI]);

  useEffect(() => {
    if (!store?.activeChurchId) return;
    store?.fetchContributions?.();
    store?.fetchDisbursements?.();
  }, [store?.activeChurchId]);

  useEffect(() => {
    refreshKpi();
  }, [refreshKpi]);

  const openCreate = () => {
    if (activeTab === "contributions") {
      setEditingContribution(null);
      setIsContributionFormOpen(true);
      return;
    }

    setEditingDisbursement(null);
    setIsDisbursementFormOpen(true);
  };

  const openEditContribution = (row) => {
    setEditingContribution(row);
    setIsContributionFormOpen(true);
  };

  const openEditDisbursement = (row) => {
    setEditingDisbursement(row);
    setIsDisbursementFormOpen(true);
  };

  const closeContributionForm = () => {
    setIsContributionFormOpen(false);
    setEditingContribution(null);
  };

  const closeDisbursementForm = () => {
    setIsDisbursementFormOpen(false);
    setEditingDisbursement(null);
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Welfare</h2>
          <p className="mt-1 text-gray-500 text-sm">Track welfare contributions and disbursements</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
            >
              <span className="leading-none text-lg">+</span>
              {activeTab === "contributions" ? "Add Contribution" : "Add Disbursement"}
            </button>
          )}
        </div>
      </div>

      <div className="cck-tab-bar mt-4 flex flex-wrap w-full rounded-lg border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setActiveTab("contributions")}
          className={`px-4 py-1.5 text-sm font-semibold rounded-md inline-flex items-center gap-2 ${
            activeTab === "contributions" ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          Contributions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("disbursements")}
          className={`ml-1 px-4 py-1.5 text-sm font-semibold rounded-md inline-flex items-center gap-2 ${
            activeTab === "disbursements" ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          Disbursements
        </button>
      </div>

      <KpiGrid className="mt-4 gap-3 lg:grid-cols-4">
        <KpiStatCard label="Contributions (This Month)" value={formatMoney(kpi.thisMonthContribution || 0, currency)} valueClassName="text-green-700 text-lg" />
        <KpiStatCard label="Disbursements (This Month)" value={formatMoney(kpi.thisMonthDisbursement || 0, currency)} valueClassName="text-orange-600 text-lg" />
        <KpiStatCard label="Contributions (This Year)" value={formatMoney(kpi.thisYearContribution || 0, currency)} />
        <KpiStatCard label="Disbursements (This Year)" value={formatMoney(kpi.thisYearDisbursement || 0, currency)} />
      </KpiGrid>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:p-6 lg:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold text-gray-900 text-sm">
                {activeTab === "contributions" ? "Contribution Records" : "Disbursement Records"}
              </div>
              <div className="text-gray-500 text-xs">
                {activeTab === "contributions" ? "View and manage welfare contributions" : "View and manage welfare disbursements"}
              </div>
            </div>
            {activeTab === "contributions" ? <WelfareContributionFilters /> : <WelfareDisbursementFilters />}
          </div>
        </div>

        {activeTab === "contributions" ? (
          <WelfareContributionTable onEdit={openEditContribution} onDeleted={refreshKpi} />
        ) : (
          <WelfareDisbursementTable onEdit={openEditDisbursement} onDeleted={refreshKpi} />
        )}
      </div>

      <WelfareContributionForm
        open={isContributionFormOpen}
        mode={editingContribution ? "edit" : "create"}
        initialData={editingContribution}
        onClose={closeContributionForm}
        onSuccess={() => {
          closeContributionForm();
          refreshKpi();
        }}
      />

      <WelfareDisbursementForm
        open={isDisbursementFormOpen}
        mode={editingDisbursement ? "edit" : "create"}
        initialData={editingDisbursement}
        onClose={closeDisbursementForm}
        onSuccess={() => {
          closeDisbursementForm();
          refreshKpi();
        }}
      />
    </div>
  );
}

function WelfarePage() {
  return (
    <WelfareProvider>
      <WelfarePageInner />
    </WelfareProvider>
  );
}

export default WelfarePage;
