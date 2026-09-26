import { useContext, useEffect, useMemo, useState } from "react";
import ProgramContext, { ProgramProvider } from "../program.store.js";
import ProgramsFilters from "../components/ProgramsFilters.jsx";
import ProgramsTable from "../components/ProgramsTable.jsx";
import PermissionContext from "../../permissions/permission.store.js";
import ProgramCreatePage from "./ProgramCreatePage.jsx";
import PageTabs from "../../../shared/components/PageTabs/index.jsx";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";

function ProgramsPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(ProgramContext);

  const [activeTab, setActiveTab] = useState("upcoming");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState(null);

  const canCreate = useMemo(() => (typeof can === "function" ? can("programs", "create") : false), [can]);
  const guarded = useGuardedAction();

  const refreshLists = async () => {
    await store?.fetchProgramStats?.({ force: true });
    await store?.fetchPrograms?.({ status: activeTab, page: store?.pagination?.currentPage || 1, force: true });
  };

  const upcomingBadge = Number(store?.stats?.upcomingPrograms || 0);
  const ongoingBadge = Number(store?.stats?.ongoingPrograms || 0);
  const pastBadge = Number(store?.stats?.pastPrograms || 0);

  useEffect(() => {
    if (!store?.activeChurch) return;
    store?.fetchProgramStats?.();
  }, [store?.activeChurch]);

  useEffect(() => {
    if (!store?.activeChurch) return;
    store?.fetchPrograms?.({ status: activeTab });
  }, [store?.activeChurch, activeTab]);


  return (
    <div className="w-full max-w-6xl overflow-x-hidden">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Programs</h2>
          <div className="shrink-0">
            {canCreate ? (
              <button
                type="button"
                onClick={() => guarded(() => setCreateOpen(true))}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
              >
                <span className="leading-none text-lg">+</span>
                Create Program
              </button>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-gray-600 text-sm hidden md:block">Search and manage church programs</p>

        <PageTabs
          tabs={[
            { key: "upcoming", label: "Upcoming", badge: upcomingBadge, badgeColor: "bg-blue-600 text-white" },
            { key: "ongoing", label: "Ongoing", badge: ongoingBadge, badgeColor: "bg-orange-500 text-white" },
            { key: "past", label: "Past", badge: pastBadge, badgeColor: "bg-gray-600 text-white" },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          sticky={false}
          className="mt-4"
        />
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Program Records</div>
            <div className="text-gray-500 text-xs">All programs and their details</div>
          </div>

          <ProgramsFilters activeStatus={activeTab} />
        </div>

        <ProgramsTable
          status={activeTab}
          onCreate={() => setCreateOpen(true)}
          onEdit={(row) => {
            if (!row?._id) return;
            setEditingProgramId(row._id);
            setEditOpen(true);
          }}
        />
      </div>

      <ProgramCreatePage
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        onSuccess={async () => {
          setCreateOpen(false);
          await refreshLists();
        }}
      />

      <ProgramCreatePage
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingProgramId(null);
        }}
        mode="edit"
        programId={editingProgramId}
        onSuccess={async () => {
          setEditOpen(false);
          setEditingProgramId(null);
          await refreshLists();
        }}
      />
    </div>
  );
}

function ProgramsPage() {
  return (
    <ProgramProvider>
      <ProgramsPageInner />
    </ProgramProvider>
  );
}

export default ProgramsPage;
