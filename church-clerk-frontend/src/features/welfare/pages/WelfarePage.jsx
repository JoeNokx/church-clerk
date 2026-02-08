import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import WelfareContext, { WelfareProvider } from "../welfare.store.js";

import WelfareContributionFilters from "../components/WelfareContributionFilters.jsx";
import WelfareContributionForm from "../components/WelfareContributionForm.jsx";
import WelfareContributionTable from "../components/WelfareContributionTable.jsx";
import WelfareDisbursementFilters from "../components/WelfareDisbursementFilters.jsx";
import WelfareDisbursementForm from "../components/WelfareDisbursementForm.jsx";
import WelfareDisbursementTable from "../components/WelfareDisbursementTable.jsx";

function WelfarePageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(WelfareContext);

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
          <h2 className="text-2xl font-semibold text-gray-900">Welfare</h2>
          <p className="mt-2 text-sm text-gray-600">Track welfare contributions and disbursements</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <span className="text-lg leading-none">+</span>
              {activeTab === "contributions" ? "Add Contribution" : "Add Disbursement"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-500">Contributions (This Month)</div>
          <div className="mt-2 text-lg font-semibold text-green-700">GHS {Number(kpi.thisMonthContribution || 0).toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-500">Disbursements (This Month)</div>
          <div className="mt-2 text-lg font-semibold text-orange-600">GHS {Number(kpi.thisMonthDisbursement || 0).toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-500">Contributions (This Year)</div>
          <div className="mt-2 text-lg font-semibold text-gray-900">GHS {Number(kpi.thisYearContribution || 0).toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-500">Disbursements (This Year)</div>
          <div className="mt-2 text-lg font-semibold text-gray-900">GHS {Number(kpi.thisYearDisbursement || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">Welfare Records</div>
              <div className="text-xs text-gray-500">View and manage welfare contributions and disbursements</div>
            </div>

            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setActiveTab("contributions")}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md ${
                  activeTab === "contributions" ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Contributions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("disbursements")}
                className={`ml-1 px-4 py-1.5 text-sm font-semibold rounded-md ${
                  activeTab === "disbursements" ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Disbursements
              </button>
            </div>
          </div>

          {activeTab === "contributions" ? <WelfareContributionFilters /> : <WelfareDisbursementFilters />}
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
