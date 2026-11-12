import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import MemberCareContext, { MemberCareProvider } from "../memberCare.store.js";

import CareCaseFilters from "../components/CareCaseFilters.jsx";
import CareCaseTable from "../components/CareCaseTable.jsx";
import CareCaseForm from "../components/CareCaseForm.jsx";
import CareCaseDetails from "../components/CareCaseDetails.jsx";
import VisitFilters from "../components/VisitFilters.jsx";
import VisitTable from "../components/VisitTable.jsx";
import VisitForm from "../components/VisitForm.jsx";
import PrayerRequestFilters from "../components/PrayerRequestFilters.jsx";
import PrayerRequestTable from "../components/PrayerRequestTable.jsx";
import PrayerRequestForm from "../components/PrayerRequestForm.jsx";

import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import PageTabs from "../../../shared/components/PageTabs/index.jsx";
import { kpiTrendText } from "../../../shared/utils/kpiTrendText.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";

function MemberCarePageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberCareContext);
  const guarded = useGuardedAction();

  const [activeTab, setActiveTab] = useState("cases");

  const [isCaseFormOpen, setIsCaseFormOpen] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [viewingCase, setViewingCase] = useState(null);

  const [isVisitFormOpen, setIsVisitFormOpen] = useState(false);
  const [visitCase, setVisitCase] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);

  const [isPrayerFormOpen, setIsPrayerFormOpen] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState(null);

  const [kpi, setKpi] = useState({
    openCases: 0,
    inProgress: 0,
    overdueFollowUps: 0,
    visitsThisMonth: 0,
    activePrayerRequests: 0,
    answeredThisMonth: 0,
    change: null,
    diff: null
  });

  const canCreate = useMemo(() => (typeof can === "function" ? can("memberCare", "create") : false), [can]);

  const refreshKpi = useCallback(async () => {
    if (!store?.activeChurchId) return;
    try {
      const res = await store?.getKPI?.();
      const payload = res?.data?.data ?? res?.data;
      const data = payload?.data ?? payload;
      setKpi({
        openCases: Number(data?.openCases || 0),
        inProgress: Number(data?.inProgress || 0),
        overdueFollowUps: Number(data?.overdueFollowUps || 0),
        visitsThisMonth: Number(data?.visitsThisMonth || 0),
        activePrayerRequests: Number(data?.activePrayerRequests || 0),
        answeredThisMonth: Number(data?.answeredThisMonth || 0),
        change: data?.change || null,
        diff: data?.diff || null
      });
    } catch {
      setKpi({
        openCases: 0,
        inProgress: 0,
        overdueFollowUps: 0,
        visitsThisMonth: 0,
        activePrayerRequests: 0,
        answeredThisMonth: 0,
        change: null,
        diff: null
      });
    }
  }, [store?.activeChurchId, store?.getKPI]);

  useEffect(() => {
    if (!store?.activeChurchId) return;
    store?.fetchCases?.();
    store?.fetchVisits?.();
    store?.fetchPrayerRequests?.();
  }, [store?.activeChurchId]);

  useEffect(() => {
    refreshKpi();
  }, [refreshKpi]);

  const openCreate = () => {
    if (activeTab === "cases") {
      setEditingCase(null);
      setIsCaseFormOpen(true);
      return;
    }
    if (activeTab === "visits") {
      setVisitCase(null);
      setEditingVisit(null);
      setIsVisitFormOpen(true);
      return;
    }
    setEditingPrayer(null);
    setIsPrayerFormOpen(true);
  };

  const openEditCase = (row) => {
    setViewingCase(null);
    setEditingCase(row);
    setIsCaseFormOpen(true);
  };

  const openViewCase = (row) => setViewingCase(row);

  const openLogVisit = (row) => {
    setViewingCase(null);
    setVisitCase(row);
    setEditingVisit(null);
    setIsVisitFormOpen(true);
  };

  const openEditVisit = (row) => {
    setVisitCase(null);
    setEditingVisit(row);
    setIsVisitFormOpen(true);
  };

  const openEditPrayer = (row) => {
    setEditingPrayer(row);
    setIsPrayerFormOpen(true);
  };

  const createLabel =
    activeTab === "cases" ? "New Care Case" :
    activeTab === "visits" ? "Log Visit" :
    "New Prayer Request";

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Member Care</h2>
          <p className="mt-1 text-gray-500 text-sm hidden md:block">Pastoral care cases, visits, and prayer requests</p>
        </div>

        <div className="flex items-center gap-3">
          {<button
              type="button"
              onClick={() => guarded(openCreate, "memberCare", "create")}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
            >
              <span className="leading-none text-lg">+</span>
              {createLabel}
            </button>
          }
        </div>
      </div>

      <PageTabs
        tabs={[
          { key: "cases", label: "Care Cases" },
          { key: "visits", label: "Visits" },
          { key: "prayer", label: "Prayer Requests" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        sticky={false}
        className="mt-4"
      />

      <KpiGrid className="mt-4 gap-3 lg:grid-cols-5">
        <KpiCard
          title="Open Cases"
          value={kpi.openCases}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 21s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="In Progress"
          value={kpi.inProgress}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          title="Overdue Follow-ups"
          value={kpi.overdueFollowUps}
          upIsGood={false}
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 9v4M12 17h.01M10.3 3.9 2.6 17a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="Visits (This Month)"
          value={kpi.visitsThisMonth}
          change={kpi.change?.visitsThisMonth}
          diff={kpi.diff?.visitsThisMonth}
          diffText={kpiTrendText(kpi.diff?.visitsThisMonth, kpi.change?.visitsThisMonth)}
          compareLabel="last month"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1V10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          title="Active Prayer Requests"
          value={kpi.activePrayerRequests}
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 3v18M7 8l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </KpiGrid>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:p-6 lg:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold text-gray-900 text-sm">
                {activeTab === "cases" ? "Care Cases" : activeTab === "visits" ? "Visit Records" : "Prayer Requests"}
              </div>
              <div className="text-gray-500 text-xs">
                {activeTab === "cases"
                  ? "Open and track pastoral care needs for members"
                  : activeTab === "visits"
                    ? "Every visit, call, and counseling session logged against a case"
                    : "Prayer requests from members and the wider congregation"}
              </div>
            </div>
            {activeTab === "cases" ? <CareCaseFilters /> : activeTab === "visits" ? <VisitFilters /> : <PrayerRequestFilters />}
          </div>
        </div>

        {activeTab === "cases" ? (
          <CareCaseTable
            onView={openViewCase}
            onEdit={openEditCase}
            onLogVisit={openLogVisit}
            onCreate={openCreate}
            onDeleted={refreshKpi}
          />
        ) : activeTab === "visits" ? (
          <VisitTable onEdit={openEditVisit} />
        ) : (
          <PrayerRequestTable onEdit={openEditPrayer} onCreate={openCreate} />
        )}
      </div>

      <CareCaseForm
        open={isCaseFormOpen}
        mode={editingCase ? "edit" : "create"}
        initialData={editingCase}
        onClose={() => { setIsCaseFormOpen(false); setEditingCase(null); }}
        onSuccess={() => {
          setIsCaseFormOpen(false);
          setEditingCase(null);
          refreshKpi();
        }}
      />

      <CareCaseDetails
        open={Boolean(viewingCase)}
        careCase={viewingCase}
        onClose={() => setViewingCase(null)}
        onEdit={openEditCase}
        onLogVisit={openLogVisit}
      />

      <VisitForm
        open={isVisitFormOpen}
        mode={editingVisit ? "edit" : "create"}
        careCase={visitCase}
        initialData={editingVisit}
        onClose={() => { setIsVisitFormOpen(false); setVisitCase(null); setEditingVisit(null); }}
        onSuccess={() => {
          setIsVisitFormOpen(false);
          setVisitCase(null);
          setEditingVisit(null);
          refreshKpi();
        }}
      />

      <PrayerRequestForm
        open={isPrayerFormOpen}
        mode={editingPrayer ? "edit" : "create"}
        initialData={editingPrayer}
        onClose={() => { setIsPrayerFormOpen(false); setEditingPrayer(null); }}
        onSuccess={() => {
          setIsPrayerFormOpen(false);
          setEditingPrayer(null);
          refreshKpi();
        }}
      />
    </div>
  );
}

function MemberCarePage() {
  return (
    <MemberCareProvider>
      <MemberCarePageInner />
    </MemberCareProvider>
  );
}

export default MemberCarePage;
