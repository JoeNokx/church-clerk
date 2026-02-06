import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import EventContext, { EventProvider } from "../event.store.js";
import ProgramsEventsFilters from "../components/ProgramsEventsFilters.jsx";
import ProgramsEventsTable from "../components/ProgramsEventsTable.jsx";
import PermissionContext from "../../permissions/permission.store.js";
import EventCreatePage from "./EventCreatePage.jsx";

function ProgramsEventsPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(EventContext);

  const [activeTab, setActiveTab] = useState("upcoming");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  const canCreate = useMemo(() => (typeof can === "function" ? can("events", "create") : false), [can]);

  const refreshLists = useCallback(async () => {
    await store?.fetchEventStats?.({ force: true });
    await store?.fetchEvents?.({ status: activeTab, page: store?.pagination?.currentPage || 1, force: true });
  }, [store, activeTab]);

  const upcomingBadge = Number(store?.stats?.upcomingEvents || 0);
  const ongoingBadge = Number(store?.stats?.ongoingEvents || 0);
  const pastBadge = Number(store?.stats?.pastEvents || 0);

  useEffect(() => {
    if (!store?.activeChurch) return;
    store?.fetchEventStats?.();
  }, [store?.activeChurch]);

  useEffect(() => {
    if (!store?.activeChurch) return;
    store?.fetchEvents?.({ status: activeTab });
  }, [store?.activeChurch, activeTab]);

  const tabClass = useCallback(
    (value) => {
      const isActive = activeTab === value;
      return `px-4 py-1.5 text-sm font-semibold rounded-md inline-flex items-center gap-2 ${
        isActive ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"
      }`;
    },
    [activeTab]
  );

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Programs &amp; Events</h2>
          <p className="mt-2 text-sm text-gray-600">Search and manage church events</p>

          <div className="mt-4 inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button type="button" onClick={() => setActiveTab("upcoming")} className={tabClass("upcoming")}>
              Upcoming
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                {upcomingBadge}
              </span>
            </button>
            <button type="button" onClick={() => setActiveTab("ongoing")} className={`ml-1 ${tabClass("ongoing")}`}>
              Ongoing
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-semibold text-white">
                {ongoingBadge}
              </span>
            </button>
            <button type="button" onClick={() => setActiveTab("past")} className={`ml-1 ${tabClass("past")}`}>
              Past
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-600 px-1.5 text-xs font-semibold text-white">
                {pastBadge}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canCreate ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <span className="text-lg leading-none">+</span>
              Create Event
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Event Records</div>
            <div className="text-xs text-gray-500">All events and their details</div>
          </div>

          <ProgramsEventsFilters activeStatus={activeTab} />
        </div>

        <ProgramsEventsTable
          status={activeTab}
          onEdit={(row) => {
            if (!row?._id) return;
            setEditingEventId(row._id);
            setEditOpen(true);
          }}
        />
      </div>

      <EventCreatePage
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        onSuccess={async () => {
          setCreateOpen(false);
          await refreshLists();
        }}
      />

      <EventCreatePage
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingEventId(null);
        }}
        mode="edit"
        eventId={editingEventId}
        onSuccess={async () => {
          setEditOpen(false);
          setEditingEventId(null);
          await refreshLists();
        }}
      />
    </div>
  );
}

function ProgramsEventsPage() {
  return (
    <EventProvider>
      <ProgramsEventsPageInner />
    </EventProvider>
  );
}

export default ProgramsEventsPage;
