import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import AttendanceContext, { AttendanceProvider } from "../attendance.store.js";
import AttendanceFilters from "../components/AttendanceFilters.jsx";
import AttendanceForm from "../components/AttendanceForm.jsx";
import AttendanceTable from "../components/AttendanceTable.jsx";
import VisitorFilters from "../components/VisitorFilters.jsx";
import VisitorForm from "../components/VisitorForm.jsx";
import VisitorTable from "../components/VisitorTable.jsx";

function AttendancePageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(AttendanceContext);

  const [activeTab, setActiveTab] = useState("service");

  const [isAttendanceFormOpen, setIsAttendanceFormOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);

  const [isVisitorFormOpen, setIsVisitorFormOpen] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState(null);

  const canCreateAttendance = useMemo(() => (typeof can === "function" ? can("attendance", "create") : false), [can]);
  const canCreateVisitor = useMemo(() => (typeof can === "function" ? can("visitors", "create") : false), [can]);

  const refreshAttendances = useCallback(async () => {
    await store?.fetchAttendances?.();
  }, [store]);

  const refreshVisitors = useCallback(async () => {
    await store?.fetchVisitors?.();
  }, [store]);

  useEffect(() => {
    if (!store?.activeChurch) return;
    refreshAttendances();
    store?.fetchVisitorStats?.();
  }, [store?.activeChurch]);

  useEffect(() => {
    if (!store?.activeChurch) return;
    if (activeTab !== "visitors") return;
    refreshVisitors();
  }, [activeTab, store?.activeChurch]);

  const openCreateAttendance = () => {
    setEditingAttendance(null);
    setIsAttendanceFormOpen(true);
  };

  const openEditAttendance = (row) => {
    setEditingAttendance(row);
    setIsAttendanceFormOpen(true);
  };

  const closeAttendanceForm = () => {
    setIsAttendanceFormOpen(false);
    setEditingAttendance(null);
  };

  const openCreateVisitor = () => {
    setEditingVisitor(null);
    setIsVisitorFormOpen(true);
  };

  const openEditVisitor = (row) => {
    setEditingVisitor(row);
    setIsVisitorFormOpen(true);
  };

  const closeVisitorForm = () => {
    setIsVisitorFormOpen(false);
    setEditingVisitor(null);
  };

  const isService = activeTab === "service";
  const visitorBadge = Number(store?.visitorStats?.thisMonthVisitors || 0);

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Attendance Records</h2>
          <p className="mt-2 text-sm text-gray-600">Track and manage service attendance</p>

          <div className="mt-4 inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveTab("service")}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md ${isService ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"}`}
            >
              Service Attendance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("visitors")}
              className={`ml-1 px-4 py-1.5 text-sm font-semibold rounded-md inline-flex items-center gap-2 ${!isService ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"}`}
            >
              Visitors
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-semibold text-white">
                {visitorBadge}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isService ? (
            canCreateAttendance ? (
              <button
                type="button"
                onClick={openCreateAttendance}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <span className="text-lg leading-none">+</span>
                Record Attendance
              </button>
            ) : null
          ) : canCreateVisitor ? (
            <button
              type="button"
              onClick={openCreateVisitor}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <span className="text-lg leading-none">+</span>
              Add Visitor
            </button>
          ) : null}
        </div>
      </div>

      {isService ? (
        <>
          <div className="mt-6 rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">Attendance Records</div>
                <div className="text-xs text-gray-500">All services and their details</div>
              </div>

              <AttendanceFilters />
            </div>

            <AttendanceTable onEdit={openEditAttendance} onDeleted={refreshAttendances} />
          </div>

          <AttendanceForm
            open={isAttendanceFormOpen}
            mode={editingAttendance ? "edit" : "create"}
            initialData={editingAttendance}
            onClose={closeAttendanceForm}
            onSuccess={() => {
              closeAttendanceForm();
              refreshAttendances();
            }}
          />
        </>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500">Total Visitors</div>
                  <div className="mt-2 text-lg font-semibold text-gray-900">{Number(store?.visitorStats?.totalVisitors || 0).toLocaleString()}</div>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-600">
                    <path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11Z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M3 20c0-3 2-5 5-5h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M21 20c0-3-2-5-5-5h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500">This Month Visitors</div>
                  <div className="mt-2 text-lg font-semibold text-gray-900">{Number(store?.visitorStats?.thisMonthVisitors || 0).toLocaleString()}</div>
                </div>
                <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-orange-500">
                    <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-500">Converted to Members</div>
                  <div className="mt-2 text-lg font-semibold text-gray-900">{Number(store?.visitorStats?.convertedVisitors || 0).toLocaleString()}</div>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-green-600">
                    <path d="M4 17l6-6 4 4 6-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20 7v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">Visitors Records</div>
                <div className="text-xs text-gray-500">All visitors and their details</div>
              </div>

              <VisitorFilters />
            </div>

            <VisitorTable onEdit={openEditVisitor} onDeleted={refreshVisitors} />
          </div>

          <VisitorForm
            open={isVisitorFormOpen}
            mode={editingVisitor ? "edit" : "create"}
            initialData={editingVisitor}
            onClose={closeVisitorForm}
            onSuccess={() => {
              closeVisitorForm();
              refreshVisitors();
            }}
          />
        </>
      )}
    </div>
  );
}

function AttendancePage() {
  return (
    <AttendanceProvider>
      <AttendancePageInner />
    </AttendanceProvider>
  );
}

export default AttendancePage;
