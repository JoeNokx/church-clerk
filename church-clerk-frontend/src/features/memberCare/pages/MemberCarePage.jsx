import { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import MemberCareContext, { MemberCareProvider } from "../memberCare.store.js";

import OverviewTab from "../components/OverviewTab.jsx";
import FollowUpsTab, { FollowUpFormModal } from "../components/FollowUpsTab.jsx";
import PastoralCareTab from "../components/PastoralCareTab.jsx";
import CareCaseFilters from "../components/CareCaseFilters.jsx";
import CareCaseTable from "../components/CareCaseTable.jsx";
import CareCaseForm from "../components/CareCaseForm.jsx";
import CareCaseDetails from "../components/CareCaseDetails.jsx";
import VisitFilters from "../components/VisitFilters.jsx";
import VisitTable from "../components/VisitTable.jsx";
import VisitForm from "../components/VisitForm.jsx";

import PageTabs from "../../../shared/components/PageTabs/index.jsx";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";
import { getFollowUpsStats } from "../../outreach/services/outreach.api.js";

const VALID_TABS = ["overview", "cases", "followup", "visits", "pastoral"];

function MemberCarePageInner() {
  const store = useContext(MemberCareContext);
  const guarded = useGuardedAction();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(() => {
    const defaultTab = new URLSearchParams(location.search).get("defaultTab");
    return VALID_TABS.includes(defaultTab) ? defaultTab : "overview";
  });

  const [isCaseFormOpen, setIsCaseFormOpen] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [viewingCase, setViewingCase] = useState(null);

  const [isVisitFormOpen, setIsVisitFormOpen] = useState(false);
  const [visitCase, setVisitCase] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);

  const [overdueCount, setOverdueCount] = useState(0);
  const [headerAction, setHeaderAction] = useState(null);
  const [followUpCase, setFollowUpCase] = useState(null);

  // Sync tab when URL defaultTab changes (e.g. navigating back from another
  // page) — adjust state during render rather than in an effect.
  const defaultTabParam = new URLSearchParams(location.search).get("defaultTab");
  const [prevDefaultTab, setPrevDefaultTab] = useState(defaultTabParam);
  if (defaultTabParam !== prevDefaultTab) {
    setPrevDefaultTab(defaultTabParam);
    if (VALID_TABS.includes(defaultTabParam)) setActiveTab(defaultTabParam);
  }

  useEffect(() => {
    if (!store?.activeChurchId) return;
    store?.fetchCases?.();
    store?.fetchVisits?.();
  }, [store?.activeChurchId]);

  useEffect(() => {
    getFollowUpsStats()
      .then((r) => setOverdueCount(r?.data?.data?.overdue || 0))
      .catch(() => {});
  }, []);

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
    }
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

  const createLabel =
    activeTab === "cases" ? "New Care Case" :
    activeTab === "visits" ? "Log Visit" :
    null;

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Followup &amp; Care</h2>
          <p className="mt-1 text-gray-500 text-sm hidden md:block">Follow-ups, visits, and pastoral care for members</p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "followup" || activeTab === "pastoral" ? headerAction : createLabel ? (
            <button
              type="button"
              onClick={() => guarded(openCreate, "memberCare", "create")}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
            >
              <span className="leading-none text-lg">+</span>
              {createLabel}
            </button>
          ) : null}
        </div>
      </div>

      <PageTabs
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "cases", label: "Case Care" },
          { key: "followup", label: "Followup", badge: overdueCount > 0 ? overdueCount : null, badgeColor: "bg-red-500 text-white" },
          { key: "visits", label: "Visits" },
          { key: "pastoral", label: "Pastoral Care" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        sticky={false}
        className="mt-4"
      />

      {activeTab === "overview" ? (
        <OverviewTab goTab={setActiveTab} />
      ) : activeTab === "followup" ? (
        <FollowUpsTab setHeaderAction={setHeaderAction} />
      ) : activeTab === "pastoral" ? (
        <PastoralCareTab setHeaderAction={setHeaderAction} />
      ) : (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  {activeTab === "cases" ? "Care Cases" : "Visit Records"}
                </div>
                <div className="text-gray-500 text-xs">
                  {activeTab === "cases"
                    ? "Open and track pastoral care needs for members"
                    : "Every visit, call, and counseling session logged against a case"}
                </div>
              </div>
              {activeTab === "cases" ? <CareCaseFilters /> : <VisitFilters />}
            </div>
          </div>

          {activeTab === "cases" ? (
            <CareCaseTable
              onView={openViewCase}
              onEdit={openEditCase}
              onLogVisit={openLogVisit}
              onFollowUp={(row) => setFollowUpCase(row)}
              onCreate={openCreate}
            />
          ) : (
            <VisitTable onEdit={openEditVisit} />
          )}
        </div>
      )}

      <CareCaseForm
        open={isCaseFormOpen}
        mode={editingCase ? "edit" : "create"}
        initialData={editingCase}
        onClose={() => { setIsCaseFormOpen(false); setEditingCase(null); }}
        onSuccess={() => {
          setIsCaseFormOpen(false);
          setEditingCase(null);
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
        }}
      />

      <FollowUpFormModal
        open={Boolean(followUpCase)}
        mode="create"
        events={[]}
        defaultValues={followUpCase ? {
          member: followUpCase.member?._id || "",
          memberName: `${followUpCase.member?.firstName || ""} ${followUpCase.member?.lastName || ""}`.trim(),
          scheduledDate: followUpCase.scheduledDate ? String(followUpCase.scheduledDate).slice(0, 10) : "",
          nextFollowUpDate: followUpCase.nextFollowUpDate ? String(followUpCase.nextFollowUpDate).slice(0, 10) : "",
          notes: followUpCase.title ? `Care case: ${followUpCase.title}` : "",
          assignedTo: Array.isArray(followUpCase.assignedTo) ? followUpCase.assignedTo : [],
        } : null}
        onClose={() => setFollowUpCase(null)}
        onSaved={() => setFollowUpCase(null)}
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
