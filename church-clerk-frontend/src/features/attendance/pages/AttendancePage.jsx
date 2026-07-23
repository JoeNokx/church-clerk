import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import AddLookupValueButton from "../../lookups/components/AddLookupValueButton.jsx";
import PermissionContext from "../../permissions/permission.store.js";
import AttendanceContext, { AttendanceProvider } from "../attendance.store.js";
import AttendanceFilters from "../components/AttendanceFilters.jsx";
import AttendanceForm from "../components/AttendanceForm.jsx";
import AttendanceTable from "../components/AttendanceTable.jsx";
import VisitorFilters from "../components/VisitorFilters.jsx";
import VisitorForm from "../components/VisitorForm.jsx";
import VisitorTable from "../components/VisitorTable.jsx";
import ChurchContext from "../../church/church.store.js";
import DateRangeFilter from "../../../shared/components/DateRangeFilter/index.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";
import {
  getServiceIndividualAttendances,
  createServiceIndividualAttendance,
  getServiceIndividualAttendance,
  updateServiceIndividualAttendance,
  deleteServiceIndividualAttendance,
  getAttendanceCheckInLink,
  generateAttendanceCheckInLink,
  revokeAttendanceCheckInLink
} from "../services/attendance.api.js";
import { getMembers } from "../../member/services/member.api.js";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://app.churchclerkapp.com";

const FALLBACK_SERVICE_TYPES = [
  "Sunday Service",
  "Sunday First Service",
  "Sunday Second Service",
  "Sunday Third Service",
  "Sunday Fourth Service",
  "Sunday Fifth Service",
  "Special Program",
  "Worship Service",
  "Bible Study",
  "Children Service",
  "Midweek Service",
  "Prayer Meeting"
];

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDay(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

function SimpleModal({ open, title, children, onClose, size }) {
  if (!open) return null;
  const maxW = size === "lg" ? "max-w-3xl" : "max-w-xl";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className={`w-full ${maxW} rounded-xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
          <div className="font-semibold text-gray-900 text-sm">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}

function AttendancePageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(AttendanceContext);
  const churchStore = useContext(ChurchContext);

  const [activeTab, setActiveTab] = useState("individual");

  // --- total attendance tab ---
  const [isAttendanceFormOpen, setIsAttendanceFormOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);

  // --- visitors tab ---
  const [isVisitorFormOpen, setIsVisitorFormOpen] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState(null);

  // --- individual attendance tab ---
  const [indivLoading, setIndivLoading] = useState(false);
  const [indivError, setIndivError] = useState("");
  const [indivRecords, setIndivRecords] = useState([]);
  const [indivPagination, setIndivPagination] = useState({ currentPage: 1, prevPage: null, nextPage: null });
  const [indivDateFrom, setIndivDateFrom] = useState("");
  const [indivDateTo, setIndivDateTo] = useState("");
  const [indivServiceTypeFilter, setIndivServiceTypeFilter] = useState("");

  const [indivPage, setIndivPage] = useState("list");
  const [indivFormMode, setIndivFormMode] = useState("create");
  const [indivFormEditing, setIndivFormEditing] = useState(null);
  const [indivFormDate, setIndivFormDate] = useState("");
  const [indivFormServiceType, setIndivFormServiceType] = useState("");
  const [indivFormSaving, setIndivFormSaving] = useState(false);
  const [indivFormError, setIndivFormError] = useState("");

  const [indivMembersLoading, setIndivMembersLoading] = useState(false);
  const [indivMembersError, setIndivMembersError] = useState("");
  const [indivMembers, setIndivMembers] = useState([]);

  const [indivViewLoading, setIndivViewLoading] = useState(false);
  const [indivViewing, setIndivViewing] = useState(null);
  const [indivViewError, setIndivViewError] = useState("");
  const [indivViewTab, setIndivViewTab] = useState("present");
  const [indivViewPresentPage, setIndivViewPresentPage] = useState(1);
  const [indivViewAbsentPage, setIndivViewAbsentPage] = useState(1);

  const [indivConfirmOpen, setIndivConfirmOpen] = useState(false);
  const [indivConfirmId, setIndivConfirmId] = useState(null);
  const [indivConfirmLoading, setIndivConfirmLoading] = useState(false);

  const [indivLinkModalOpen, setIndivLinkModalOpen] = useState(false);
  const [indivLinkRecordId, setIndivLinkRecordId] = useState(null);
  const [indivLinkToken, setIndivLinkToken] = useState(null);
  const [indivLinkActive, setIndivLinkActive] = useState(false);
  const [indivLinkLoading, setIndivLinkLoading] = useState(false);
  const [indivLinkError, setIndivLinkError] = useState("");
  const [indivLinkCopied, setIndivLinkCopied] = useState(false);

  const indivCheckInLink = indivLinkToken ? `${BASE_URL}/attend/${indivLinkToken}` : null;

  const [indivMarkingSearch, setIndivMarkingSearch] = useState("");
  const [indivMarkingPage, setIndivMarkingPage] = useState(1);
  const [indivMarkingSelected, setIndivMarkingSelected] = useState([]);
  const [indivMarkingSaving, setIndivMarkingSaving] = useState(false);
  const [indivMarkingError, setIndivMarkingError] = useState("");
  const [indivMarkingSuccess, setIndivMarkingSuccess] = useState("");

  const canCreateAttendance = useMemo(() => (typeof can === "function" ? can("attendance", "create") : false), [can]);
  const canUpdateAttendance = useMemo(() => (typeof can === "function" ? can("attendance", "update") : false), [can]);
  const canDeleteAttendance = useMemo(() => (typeof can === "function" ? can("attendance", "delete") : false), [can]);
  const canCreateVisitor = useMemo(() => (typeof can === "function" ? can("visitors", "create") : false), [can]);

  const activeChurchId = churchStore?.activeChurch?._id || null;
  const { toPage } = useDashboardNavigator();

  const { values: lookupServiceTypes, reload: reloadServiceTypes } = useLookupValues("serviceType");
  const serviceTypeOptions = lookupServiceTypes?.length ? lookupServiceTypes : FALLBACK_SERVICE_TYPES;

  // --- filtered individual records ---
  const filteredIndivRecords = useMemo(() => {
    return indivRecords.filter((r) => {
      const d = (r?.date || "").slice(0, 10);
      if (indivDateFrom && d < indivDateFrom) return false;
      if (indivDateTo && d > indivDateTo) return false;
      if (indivServiceTypeFilter && r?.serviceType !== indivServiceTypeFilter) return false;
      return true;
    });
  }, [indivRecords, indivDateFrom, indivDateTo, indivServiceTypeFilter]);

  const loadIndivRecords = useCallback(async (page = 1) => {
    if (!activeChurchId) return;
    setIndivLoading(true);
    setIndivError("");
    try {
      const res = await getServiceIndividualAttendances({ page, limit: 10 });
      const payload = res?.data?.data ?? res?.data;
      setIndivRecords(Array.isArray(payload?.attendances) ? payload.attendances : []);
      setIndivPagination(payload?.pagination || { currentPage: page, prevPage: null, nextPage: null });
    } catch (e) {
      setIndivError(e?.response?.data?.message || e?.message || "Failed to load attendance");
      setIndivRecords([]);
    } finally {
      setIndivLoading(false);
    }
  }, [activeChurchId]);

  const loadAllMembers = useCallback(async () => {
    if (!activeChurchId) return;
    setIndivMembersLoading(true);
    setIndivMembersError("");
    setIndivMembers([]);
    try {
      const firstRes = await getMembers({ page: 1, limit: 200, status: "active" });
      const firstPayload = firstRes?.data?.data ?? firstRes?.data;
      const totalPages = firstPayload?.pagination?.totalPages || 1;
      let allRows = Array.isArray(firstPayload?.members) ? [...firstPayload.members] : [];

      if (totalPages > 1) {
        const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        const rest = await Promise.all(
          pageNums.map((p) => getMembers({ page: p, limit: 200, status: "active" }))
        );
        rest.forEach((r) => {
          const p = r?.data?.data ?? r?.data;
          if (Array.isArray(p?.members)) allRows = allRows.concat(p.members);
        });
      }

      const mapped = allRows
        .map((m) => {
          const id2 = String(m?._id || "");
          if (!id2) return null;
          const name = `${String(m?.firstName || "")} ${String(m?.lastName || "")}`.trim() || "-";
          return { id: id2, name, phoneNumber: m?.phoneNumber || "", streetAddress: m?.streetAddress || "" };
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
      setIndivMembers(mapped);
      return mapped;
    } catch (e) {
      setIndivMembersError(e?.response?.data?.message || e?.message || "Failed to load members");
      return [];
    } finally {
      setIndivMembersLoading(false);
    }
  }, [activeChurchId]);

  const openIndivForm = (mode, row) => {
    setIndivFormError("");
    setIndivFormMode(mode);
    setIndivFormEditing(row || null);
    setIndivFormDate((row?.date || "").slice(0, 10));
    setIndivFormServiceType(row?.serviceType || "");
    setIndivPage("form");
  };

  const submitIndivForm = async (e) => {
    e.preventDefault();
    setIndivFormError("");
    if (!indivFormDate) { setIndivFormError("Date is required"); return; }
    if (!indivFormServiceType.trim()) { setIndivFormError("Service type is required"); return; }

    const payload = {
      date: indivFormDate,
      serviceType: indivFormServiceType.trim(),
      presentMembers: indivFormMode === "edit"
        ? (Array.isArray(indivFormEditing?.presentMembers)
            ? indivFormEditing.presentMembers.map((x) => String(x?._id || x || "")).filter(Boolean)
            : [])
        : []
    };

    setIndivFormSaving(true);
    try {
      if (indivFormMode === "edit") {
        const attendanceId = indivFormEditing?._id;
        if (!attendanceId) return;
        await updateServiceIndividualAttendance(attendanceId, payload);
        setIndivFormEditing(null);
        setIndivPage("list");
        await loadIndivRecords(1);
      } else {
        const res = await createServiceIndividualAttendance(payload);
        const newRecord = res?.data?.attendance;
        setIndivFormEditing(null);
        await loadIndivRecords(1);
        if (newRecord?._id) {
          await openIndivView(newRecord);
        } else {
          setIndivPage("list");
        }
      }
    } catch (e2) {
      setIndivFormError(e2?.response?.data?.message || e2?.message || "Failed to save attendance");
    } finally {
      setIndivFormSaving(false);
    }
  };

  const openIndivView = async (row) => {
    setIndivViewError("");
    setIndivViewing(null);
    setIndivViewTab("present");
    setIndivViewPresentPage(1);
    setIndivViewAbsentPage(1);
    setIndivMarkingSearch("");
    setIndivMarkingPage(1);
    setIndivMarkingError("");
    setIndivMarkingSuccess("");
    setIndivLinkToken(null);
    setIndivLinkActive(false);
    setIndivLinkError("");
    setIndivLinkCopied(false);
    setIndivLinkRecordId(row?._id || null);
    setIndivPage("view");
    setIndivViewLoading(true);
    try {
      const [res] = await Promise.all([
        getServiceIndividualAttendance(row?._id),
        indivMembers.length === 0 ? loadAllMembers() : Promise.resolve()
      ]);
      const payload = res?.data?.data ?? res?.data;
      const rec = payload?.attendance || payload;
      setIndivViewing(rec);
      const presIds = Array.isArray(rec?.presentMembers)
        ? rec.presentMembers.map((x) => String(x?._id || x || "")).filter(Boolean)
        : [];
      setIndivMarkingSelected(presIds);
      if (row?._id) {
        try {
          const lRes = await getAttendanceCheckInLink(row._id);
          setIndivLinkToken(lRes?.data?.token || null);
          setIndivLinkActive(lRes?.data?.active || false);
        } catch (_) {}
      }
    } catch (e) {
      setIndivViewError(e?.response?.data?.message || e?.message || "Failed to load attendance");
    } finally {
      setIndivViewLoading(false);
    }
  };

  const saveManualMarking = async () => {
    if (!indivViewing?._id) return;
    setIndivMarkingSaving(true);
    setIndivMarkingError("");
    setIndivMarkingSuccess("");
    try {
      await updateServiceIndividualAttendance(indivViewing._id, {
        date: (indivViewing.date || "").slice(0, 10),
        serviceType: indivViewing.serviceType || "",
        presentMembers: indivMarkingSelected
      });
      const res = await getServiceIndividualAttendance(indivViewing._id);
      const payload = res?.data?.data ?? res?.data;
      const rec = payload?.attendance || payload;
      setIndivViewing(rec);
      const presIds = Array.isArray(rec?.presentMembers)
        ? rec.presentMembers.map((x) => String(x?._id || x || "")).filter(Boolean)
        : [];
      setIndivMarkingSelected(presIds);
      setIndivMarkingSuccess("Attendance saved successfully.");
      setTimeout(() => setIndivMarkingSuccess(""), 3000);
    } catch (e) {
      setIndivMarkingError(e?.response?.data?.message || e?.message || "Failed to save.");
    } finally {
      setIndivMarkingSaving(false);
    }
  };

  const confirmDelete = (id) => {
    setIndivConfirmId(id);
    setIndivConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!indivConfirmId) return;
    setIndivConfirmLoading(true);
    try {
      await deleteServiceIndividualAttendance(indivConfirmId);
      setIndivConfirmOpen(false);
      setIndivConfirmId(null);
      await loadIndivRecords(1);
    } catch (e) {
      setIndivError(e?.response?.data?.message || e?.message || "Delete failed");
      setIndivConfirmOpen(false);
    } finally {
      setIndivConfirmLoading(false);
    }
  };

  const refreshAttendances = useCallback(async () => {
    await store?.fetchAttendances?.();
  }, [store]);

  const refreshVisitors = useCallback(async () => {
    await store?.fetchVisitors?.();
  }, [store]);

  useEffect(() => {
    if (!activeChurchId) return;
    refreshAttendances();
    store?.fetchVisitorStats?.();
  }, [activeChurchId]);

  useEffect(() => {
    if (!activeChurchId) return;
    if (activeTab === "individual") loadIndivRecords(1);
    if (activeTab === "visitors") refreshVisitors();
  }, [activeTab, activeChurchId]);

  const closeAttendanceForm = () => { setIsAttendanceFormOpen(false); setEditingAttendance(null); };
  const closeVisitorForm = () => { setIsVisitorFormOpen(false); setEditingVisitor(null); };

  const visitorBadge = Number(store?.visitorStats?.totalVisitors || 0);

  const truncateName = (name) => {
    if (!name) return "-";
    const words = String(name).trim().split(/\s+/).filter(Boolean);
    if (words.length >= 3 && name.length > 20) return name.slice(0, 20) + "\u2026";
    return name;
  };

  return (
    <div className="w-full max-w-6xl overflow-x-hidden lg:overflow-x-visible">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Attendance Records</h2>
          <div className="shrink-0">
            {activeTab === "individual" && indivPage === "list" && canCreateAttendance ? (
              <button
                type="button"
                data-hq-action="true"
                onClick={() => void openIndivForm("create", null)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
              >
                <span className="leading-none text-lg">+</span>
                Start Attendance
              </button>
            ) : activeTab === "total" && canCreateAttendance ? (
              <button
                type="button"
                data-hq-action="true"
                onClick={() => { setEditingAttendance(null); setIsAttendanceFormOpen(true); }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
              >
                <span className="leading-none text-lg">+</span>
                Record Attendance
              </button>
            ) : activeTab === "visitors" && canCreateVisitor ? (
              <button
                type="button"
                data-hq-action="true"
                onClick={() => { setEditingVisitor(null); setIsVisitorFormOpen(true); }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
              >
                <span className="leading-none text-lg">+</span>
                Add Visitor
              </button>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-gray-600 text-sm">Track and manage service attendance</p>

        <div className="cck-tab-bar mt-4 flex w-full overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => { setActiveTab("individual"); setIndivPage("list"); }}
            className={`shrink-0 whitespace-nowrap px-4 py-1.5 font-semibold rounded-md ${activeTab === "individual" ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"} text-sm`}
          >
            Individual Attendance
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("total"); setIndivPage("list"); }}
            className={`ml-1 shrink-0 whitespace-nowrap px-4 py-1.5 font-semibold rounded-md ${activeTab === "total" ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"} text-sm`}
          >
            Total Attendance
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("visitors"); setIndivPage("list"); }}
            className={`ml-1 shrink-0 whitespace-nowrap px-4 py-1.5 font-semibold rounded-md inline-flex items-center gap-2 ${activeTab === "visitors" ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"} text-sm`}
          >
            Visitors
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 font-semibold text-white text-xs">
              {visitorBadge}
            </span>
          </button>
        </div>
      </div>

      {/* ─── INDIVIDUAL ATTENDANCE TAB ─── */}
      {activeTab === "individual" ? (
        <>
          {indivPage === "list" ? (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 p-4 md:p-6 lg:p-8">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Individual Attendance</div>
                  <div className="text-gray-500 text-xs">Record and track member presence per service</div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto md:flex-wrap md:justify-end">
                  <select
                    value={indivServiceTypeFilter}
                    onChange={(e) => setIndivServiceTypeFilter(e.target.value)}
                    className="h-11 flex-1 md:flex-none rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 md:w-auto text-sm"
                  >
                    <option value="">All Services</option>
                    {serviceTypeOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div className="flex-1 md:flex-none">
                    <DateRangeFilter
                      appliedFrom={indivDateFrom}
                      appliedTo={indivDateTo}
                      onApply={(from, to) => { setIndivDateFrom(from); setIndivDateTo(to); }}
                    />
                  </div>
                </div>
              </div>

              {indivError ? (
                <div className="p-4 text-red-700 md:p-6 lg:p-8 text-sm">{indivError}</div>
              ) : indivLoading ? (
                <div className="p-4 space-y-3 animate-pulse md:p-6 lg:p-8">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                      <div className="h-4 w-24 rounded bg-gray-200" />
                      <div className="h-4 w-16 rounded bg-gray-200" />
                      <div className="h-4 w-16 rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
              ) : filteredIndivRecords.length === 0 ? (
                <div className="p-4 text-gray-600 md:p-6 lg:p-8 text-sm">No individual attendance records found.</div>
              ) : (
                <div className="overflow-x-auto px-4 md:px-5 lg:px-6 pb-4">
                  <table className="min-w-full">
                    <thead className="bg-slate-100">
                      <tr className="text-left font-semibold text-gray-500 text-xs">
                        <th className="sticky left-0 z-20 bg-slate-100 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
                        <th className="py-2 whitespace-nowrap px-4 md:px-6">Day</th>
                        <th className="py-2 whitespace-nowrap px-4 md:px-6">Service Type</th>
                        <th className="py-2 whitespace-nowrap px-4 md:px-6">Present</th>
                        <th className="py-2 whitespace-nowrap px-4 md:px-6">Absent</th>
                        <th className="py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredIndivRecords.map((r, idx) => (
                        <tr key={r?._id || idx} className="max-md:text-xs text-gray-700 text-sm">
                          <td className="sticky left-0 z-10 bg-white py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">{formatDate(r?.date)}</td>
                          <td className="py-1.5 whitespace-nowrap px-4 md:px-6">{formatDay(r?.date) || "-"}</td>
                          <td className="py-1.5 whitespace-nowrap px-4 md:px-6">{r?.serviceType || "-"}</td>
                          <td className="py-1.5 whitespace-nowrap px-4 md:px-6">{Number(r?.presentCount ?? 0)}</td>
                          <td className="py-1.5 whitespace-nowrap px-4 md:px-6">{Number(r?.absentCount ?? 0)}</td>
                          <td className="py-1.5 whitespace-nowrap px-4 md:px-6">
                            <div className="flex items-center justify-end gap-2">
                              {canUpdateAttendance ? (
                                <button type="button" onClick={() => void openIndivForm("edit", r)} className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs">Edit</button>
                              ) : null}
                              <button type="button" onClick={() => void openIndivView(r)} className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 text-xs">View</button>
                              {canDeleteAttendance ? (
                                <button type="button" onClick={() => confirmDelete(r?._id)} className="rounded-md border border-gray-200 bg-white px-3 py-1 font-semibold text-red-600 hover:bg-gray-50 text-xs">Delete</button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 px-4 pb-4 md:px-6 lg:px-8">
                <button type="button" onClick={() => loadIndivRecords(indivPagination?.prevPage)} disabled={!indivPagination?.prevPage} className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 disabled:opacity-50 text-sm">Prev</button>
                <div className="text-gray-600 text-sm">Page {indivPagination?.currentPage || 1}</div>
                <button type="button" onClick={() => loadIndivRecords(indivPagination?.nextPage)} disabled={!indivPagination?.nextPage} className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 disabled:opacity-50 text-sm">Next</button>
              </div>
            </div>

          ) : indivPage === "form" ? (
            <div className="mt-6">
              <div className="mb-5 flex items-center gap-3">
                <button type="button" onClick={() => setIndivPage("list")} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Back
                </button>
                <h3 className="font-semibold text-gray-900">{indivFormMode === "edit" ? "Edit Attendance" : "Start Attendance"}</h3>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white">
                <form onSubmit={submitIndivForm} className="p-6 md:p-8">
                  {indivFormError ? (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{indivFormError}</div>
                  ) : null}
                  {indivFormMode === "create" ? (
                    <p className="mb-5 text-gray-500 text-sm">Start a new attendance session. You can mark members and share a check-in link from the session details.</p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block font-semibold text-gray-500 text-xs">Date</label>
                      <input
                        value={indivFormDate}
                        onChange={(e) => setIndivFormDate(e.target.value)}
                        type="date"
                        className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block font-semibold text-gray-500 text-xs">Service Type</label>
                        {(canCreateAttendance || canUpdateAttendance) ? (
                          <AddLookupValueButton label="+ Add" kind="serviceType" onCreated={async (value) => { await reloadServiceTypes(); setIndivFormServiceType(value); }} />
                        ) : null}
                      </div>
                      <select
                        value={indivFormServiceType}
                        onChange={(e) => setIndivFormServiceType(e.target.value)}
                        className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                      >
                        <option value="">Select service type</option>
                        {serviceTypeOptions.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
                    <button type="button" onClick={() => setIndivPage("list")} className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm">Cancel</button>
                    <button type="submit" disabled={indivFormSaving} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 text-sm">
                      {indivFormSaving ? (indivFormMode === "edit" ? "Updating..." : "Starting...") : (indivFormMode === "edit" ? "Update" : "Start Session")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )

          : indivPage === "view" ? (() => {
            const VIEW_PAGE_SIZE = 15;
            const allPresent = Array.isArray(indivViewing?.presentMembers) ? indivViewing.presentMembers : [];
            const presentTotalPages = Math.max(1, Math.ceil(allPresent.length / VIEW_PAGE_SIZE));
            const presentPaged = allPresent.slice((indivViewPresentPage - 1) * VIEW_PAGE_SIZE, indivViewPresentPage * VIEW_PAGE_SIZE);
            const presentIds = new Set(allPresent.map((m) => String(m?._id || "")).filter(Boolean));
            const absentList = indivMembers.filter((m) => !presentIds.has(String(m?.id || "")));
            const absentTotalPages = Math.max(1, Math.ceil(absentList.length / VIEW_PAGE_SIZE));
            const absentPaged = absentList.slice((indivViewAbsentPage - 1) * VIEW_PAGE_SIZE, indivViewAbsentPage * VIEW_PAGE_SIZE);
            return (
              <div className="mt-6">
                <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setIndivPage("list")} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm">
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Back
                    </button>
                    <h3 className="font-semibold text-gray-900">Attendance Details</h3>
                  </div>
                  {!indivViewLoading && indivViewing ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => { setIndivLinkError(""); setIndivLinkModalOpen(true); }}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Generate Link
                      </button>
                      {canUpdateAttendance ? (
                        <button
                          type="button"
                          onClick={() => { setIndivMarkingSearch(""); setIndivMarkingPage(1); setIndivMarkingError(""); setIndivMarkingSuccess(""); setIndivPage("manual-marking"); }}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700 text-sm"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          Manual Marking
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {indivViewError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{indivViewError}</div>
                ) : indivViewLoading ? (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3 animate-pulse">
                    {[0, 1, 2, 3, 4].map((i) => (<div key={i}><div className="h-3 w-16 rounded bg-gray-200" /><div className="mt-1 h-4 w-24 rounded bg-gray-200" /></div>))}
                  </div>
                ) : !indivViewing ? (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600 text-sm">No record found.</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-5 mb-4">
                      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
                        <div className="font-semibold text-gray-500 text-xs">Date</div>
                        <div className="mt-1 font-semibold text-gray-900 text-sm">{formatDate(indivViewing?.date)}</div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
                        <div className="font-semibold text-gray-500 text-xs">Day</div>
                        <div className="mt-1 font-semibold text-gray-900 text-sm">{formatDay(indivViewing?.date) || "-"}</div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
                        <div className="font-semibold text-gray-500 text-xs">Present</div>
                        <div className="mt-1 font-bold text-green-700 text-lg">{Number(indivViewing?.presentCount ?? 0)}</div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
                        <div className="font-semibold text-gray-500 text-xs">Absent</div>
                        <div className="mt-1 font-bold text-red-600 text-lg">{Number(indivViewing?.absentCount ?? 0)}</div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
                        <div className="font-semibold text-gray-500 text-xs">Service Type</div>
                        <div className="mt-1 font-semibold text-gray-900 text-sm">{indivViewing?.serviceType || "-"}</div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <div className="flex gap-1 bg-gray-50 border-b border-gray-200 p-3">
                        {[
                          { key: "present", label: `Present (${Number(indivViewing?.presentCount ?? 0)})` },
                          { key: "absent", label: `Absent (${Number(indivViewing?.absentCount ?? 0)})` }
                        ].map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => { setIndivViewTab(key); setIndivViewPresentPage(1); setIndivViewAbsentPage(1); }}
                            className={`rounded-full px-4 py-1 text-xs font-semibold transition-colors ${indivViewTab === key ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {indivViewTab === "present" ? (
                        allPresent.length === 0 ? (
                          <div className="px-4 py-6 text-gray-600 text-sm">No members marked present.</div>
                        ) : (
                          <>
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead className="bg-slate-100">
                                  <tr className="text-left font-semibold text-gray-500 text-xs">
                                    <th className="sticky left-0 z-10 bg-slate-100 px-4 py-2.5 whitespace-nowrap">Name</th>
                                    <th className="px-4 py-2.5 whitespace-nowrap">Phone</th>
                                    <th className="px-4 py-2.5 whitespace-nowrap">Street Address</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {presentPaged.map((m, idx) => {
                                    const fullN = `${String(m?.firstName || "")} ${String(m?.lastName || "")}`.trim() || "-";
                                    return (
                                      <tr key={m?._id || idx} className="text-sm cursor-pointer hover:bg-gray-50" onClick={() => { setIndivPage("list"); toPage("member-details", { id: m?._id }, { state: { from: "attendance" } }); }}>
                                        <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-blue-700 font-semibold whitespace-nowrap" title={fullN}>{truncateName(fullN)}</td>
                                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{m?.phoneNumber || "-"}</td>
                                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{m?.streetAddress || "-"}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2.5">
                              <button type="button" onClick={() => setIndivViewPresentPage((p) => Math.max(1, p - 1))} disabled={indivViewPresentPage <= 1} className="rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40">Prev</button>
                              <span className="text-xs text-gray-500">Page {indivViewPresentPage} of {presentTotalPages}</span>
                              <button type="button" onClick={() => setIndivViewPresentPage((p) => Math.min(presentTotalPages, p + 1))} disabled={indivViewPresentPage >= presentTotalPages} className="rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40">Next</button>
                            </div>
                          </>
                        )
                      ) : (
                        absentList.length === 0 ? (
                          <div className="px-4 py-6 text-gray-600 text-sm">No members marked absent.</div>
                        ) : (
                          <>
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead className="bg-slate-100">
                                  <tr className="text-left font-semibold text-gray-500 text-xs">
                                    <th className="sticky left-0 z-10 bg-slate-100 px-4 py-2.5 whitespace-nowrap">Name</th>
                                    <th className="px-4 py-2.5 whitespace-nowrap">Phone</th>
                                    <th className="px-4 py-2.5 whitespace-nowrap">Street Address</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {absentPaged.map((m) => (
                                    <tr key={m.id} className="text-sm cursor-pointer hover:bg-gray-50" onClick={() => { setIndivPage("list"); toPage("member-details", { id: m.id }, { state: { from: "attendance" } }); }}>
                                      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-blue-700 font-semibold whitespace-nowrap" title={m.name}>{truncateName(m.name)}</td>
                                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{m.phoneNumber || "-"}</td>
                                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{m.streetAddress || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2.5">
                              <button type="button" onClick={() => setIndivViewAbsentPage((p) => Math.max(1, p - 1))} disabled={indivViewAbsentPage <= 1} className="rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40">Prev</button>
                              <span className="text-xs text-gray-500">Page {indivViewAbsentPage} of {absentTotalPages}</span>
                              <button type="button" onClick={() => setIndivViewAbsentPage((p) => Math.min(absentTotalPages, p + 1))} disabled={indivViewAbsentPage >= absentTotalPages} className="rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40">Next</button>
                            </div>
                          </>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })()

          : indivPage === "manual-marking" ? (() => {
            const MARK_PAGE_SIZE = 15;
            const filteredMarkMembers = indivMembers.filter((m) => {
              const q = String(indivMarkingSearch || "").trim().toLowerCase();
              return !q || String(m?.name || "").toLowerCase().includes(q);
            });
            const markTotalPages = Math.max(1, Math.ceil(filteredMarkMembers.length / MARK_PAGE_SIZE));
            const markPaged = filteredMarkMembers.slice((indivMarkingPage - 1) * MARK_PAGE_SIZE, indivMarkingPage * MARK_PAGE_SIZE);
            const allIds = indivMembers.map((m) => String(m.id));
            const allChecked = allIds.length > 0 && allIds.every((id) => indivMarkingSelected.includes(id));
            return (
              <div className="mt-6">
                <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setIndivPage("view")} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm">
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Back
                    </button>
                    <h3 className="font-semibold text-gray-900">Manual Marking</h3>
                  </div>
                  {canUpdateAttendance ? (
                    <button type="button" onClick={saveManualMarking} disabled={indivMarkingSaving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 text-sm shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {indivMarkingSaving ? "Saving..." : "Mark Attendance"}
                    </button>
                  ) : null}
                </div>

                {indivMarkingError && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{indivMarkingError}</div>
                )}
                {indivMarkingSuccess && (
                  <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700 text-sm">{indivMarkingSuccess}</div>
                )}

                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
                    <input
                      value={indivMarkingSearch}
                      onChange={(e) => { setIndivMarkingSearch(e.target.value); setIndivMarkingPage(1); }}
                      placeholder="Search members..."
                      className="h-9 flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm"
                    />
                    <label className="flex items-center gap-2 cursor-pointer shrink-0 text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={() => {
                          if (allChecked) {
                            setIndivMarkingSelected([]);
                          } else {
                            setIndivMarkingSelected(allIds);
                          }
                        }}
                      />
                      Check All Present
                    </label>
                    <span className="text-xs text-gray-500 shrink-0">Present: {indivMarkingSelected.length} / {indivMembers.length}</span>
                  </div>

                  {indivMembersLoading ? (
                    <div className="px-4 py-4 space-y-2 animate-pulse">
                      {[0,1,2,3,4].map((i) => (
                        <div key={i} className="flex items-center gap-3 py-1">
                          <div className="h-4 w-4 rounded bg-gray-200" />
                          <div className="h-4 w-40 rounded bg-gray-200" />
                        </div>
                      ))}
                    </div>
                  ) : indivMembers.length === 0 ? (
                    <div className="px-4 py-4 text-gray-600 text-sm">No members found.</div>
                  ) : (
                    <>
                      <div className="divide-y divide-gray-200">
                        {markPaged.map((m) => {
                          const isPresent = indivMarkingSelected.includes(String(m.id));
                          return (
                            <label key={m.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 text-sm">
                              <input
                                type="checkbox"
                                checked={isPresent}
                                onChange={() => {
                                  const mid = String(m.id);
                                  setIndivMarkingSelected((prev) => {
                                    if (prev.includes(mid)) return prev.filter((x) => x !== mid);
                                    return [...prev, mid];
                                  });
                                }}
                              />
                              <span className="text-gray-900">{m.name}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2.5">
                        <button type="button" onClick={() => setIndivMarkingPage((p) => Math.max(1, p - 1))} disabled={indivMarkingPage <= 1} className="rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40">Prev</button>
                        <span className="text-xs text-gray-500">Page {indivMarkingPage} of {markTotalPages}</span>
                        <button type="button" onClick={() => setIndivMarkingPage((p) => Math.min(markTotalPages, p + 1))} disabled={indivMarkingPage >= markTotalPages} className="rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40">Next</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })() : null}

          {/* Generate Link modal */}
          {indivLinkModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="w-full max-w-lg rounded-xl bg-white shadow-xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Attendance Check-In Link</div>
                    <div className="mt-0.5 text-gray-500 text-xs">Share this link so members can mark themselves present.</div>
                  </div>
                  <button type="button" onClick={() => setIndivLinkModalOpen(false)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shrink-0" aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {indivLinkError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{indivLinkError}</div>
                  )}
                  {indivLinkLoading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 w-32 rounded bg-gray-200" />
                      <div className="h-11 rounded-lg bg-gray-200" />
                    </div>
                  ) : indivLinkToken && indivLinkActive ? (
                    <>
                      <div>
                        <div className="font-semibold text-gray-600 text-xs mb-1.5">Shareable Link</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-700 text-xs font-mono break-all">{indivCheckInLink}</div>
                          <button type="button" onClick={() => { if (!indivCheckInLink) return; navigator.clipboard.writeText(indivCheckInLink).then(() => { setIndivLinkCopied(true); setTimeout(() => setIndivLinkCopied(false), 2000); }); }} className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 text-sm">{indivLinkCopied ? "Copied!" : "Copy"}</button>
                        </div>
                      </div>
                      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-xs">Link is <span className="font-semibold">active</span>. Members can use this link to mark themselves as present.</div>
                      <div className="flex flex-col gap-2 md:flex-row">
                        <button type="button" onClick={async () => { setIndivLinkError(""); setIndivLinkLoading(true); try { const r = await generateAttendanceCheckInLink(indivLinkRecordId); setIndivLinkToken(r?.data?.token || null); setIndivLinkActive(true); } catch (e) { setIndivLinkError(e?.response?.data?.message || "Failed to generate link."); } finally { setIndivLinkLoading(false); } }} disabled={indivLinkLoading} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm">Generate New Link</button>
                        <button type="button" onClick={async () => { setIndivLinkError(""); setIndivLinkLoading(true); try { await revokeAttendanceCheckInLink(indivLinkRecordId); setIndivLinkToken(null); setIndivLinkActive(false); } catch (e) { setIndivLinkError(e?.response?.data?.message || "Failed to revoke link."); } finally { setIndivLinkLoading(false); } }} disabled={indivLinkLoading} className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 text-sm">Revoke Link</button>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-6 text-center">
                      <div className="text-gray-500 text-sm mb-3">No active check-in link. Generate one to share with members.</div>
                      <button type="button" onClick={async () => { setIndivLinkError(""); setIndivLinkLoading(true); try { const r = await generateAttendanceCheckInLink(indivLinkRecordId); setIndivLinkToken(r?.data?.token || null); setIndivLinkActive(true); } catch (e) { setIndivLinkError(e?.response?.data?.message || "Failed to generate link."); } finally { setIndivLinkLoading(false); } }} disabled={indivLinkLoading} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 text-sm">Generate Link</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Delete confirm modal */}
          <SimpleModal open={indivConfirmOpen} title="Confirm Delete" onClose={() => { setIndivConfirmOpen(false); setIndivConfirmId(null); }}>
            <div className="text-gray-700 text-sm">Are you sure you want to delete this attendance record?</div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button type="button" onClick={() => { setIndivConfirmOpen(false); setIndivConfirmId(null); }} className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
              <button type="button" onClick={doDelete} disabled={indivConfirmLoading} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50 text-sm">
                {indivConfirmLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </SimpleModal>
        </>
      ) : null}

      {/* ─── TOTAL ATTENDANCE TAB ─── */}
      {activeTab === "total" ? (
        <>
          <div className="mt-6 rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Total Attendance Records</div>
                <div className="text-gray-500 text-xs">All services and their details</div>
              </div>
              <AttendanceFilters />
            </div>
            <AttendanceTable onEdit={(row) => { setEditingAttendance(row); setIsAttendanceFormOpen(true); }} onDeleted={refreshAttendances} />
          </div>

          <AttendanceForm
            open={isAttendanceFormOpen}
            mode={editingAttendance ? "edit" : "create"}
            initialData={editingAttendance}
            onClose={closeAttendanceForm}
            onSuccess={() => { closeAttendanceForm(); refreshAttendances(); }}
          />
        </>
      ) : null}

      {/* ─── VISITORS TAB ─── */}
      {activeTab === "visitors" ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Total Visitors</div>
                  <div className="mt-2 font-semibold text-gray-900 text-lg">{Number(store?.visitorStats?.totalVisitors || 0).toLocaleString()}</div>
                </div>
                <div className="h-11 w-11 rounded-lg bg-blue-50 hidden md:flex items-center justify-center md:h-12 md:w-12">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-600">
                    <path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11Z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M3 20c0-3 2-5 5-5h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M21 20c0-3-2-5-5-5h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-500 text-xs">This Week Visitors</div>
                  <div className="mt-2 font-semibold text-gray-900 text-lg">{Number(store?.visitorStats?.thisWeekVisitors || 0).toLocaleString()}</div>
                </div>
                <div className="h-11 w-11 rounded-lg bg-purple-50 hidden md:flex items-center justify-center md:h-12 md:w-12">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-purple-700">
                    <path d="M7 3v3M17 3v3M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 13h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-500 text-xs">This Month Visitors</div>
                  <div className="mt-2 font-semibold text-gray-900 text-lg">{Number(store?.visitorStats?.thisMonthVisitors || 0).toLocaleString()}</div>
                </div>
                <div className="h-11 w-11 rounded-lg bg-orange-50 hidden md:flex items-center justify-center md:h-12 md:w-12">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-orange-500">
                    <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Converted to Members</div>
                  <div className="mt-2 font-semibold text-gray-900 text-lg">{Number(store?.visitorStats?.convertedVisitors || 0).toLocaleString()}</div>
                </div>
                <div className="h-11 w-11 rounded-lg bg-green-50 hidden md:flex items-center justify-center md:h-12 md:w-12">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-green-600">
                    <path d="M4 17l6-6 4 4 6-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20 7v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Visitors Records</div>
                <div className="text-gray-500 text-xs">All visitors and their details</div>
              </div>
              <VisitorFilters />
            </div>
            <VisitorTable onEdit={(row) => { setEditingVisitor(row); setIsVisitorFormOpen(true); }} onDeleted={refreshVisitors} />
          </div>

          <VisitorForm
            open={isVisitorFormOpen}
            mode={editingVisitor ? "edit" : "create"}
            initialData={editingVisitor}
            onClose={closeVisitorForm}
            onSuccess={() => { closeVisitorForm(); refreshVisitors(); }}
          />
        </>
      ) : null}
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
