import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";

import ChurchContext from "../../church/church.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";

import {
  getGroup,
  addGroupMember,
  searchGroupMembersToAdd,
  getGroupMembers,
  updateGroupMemberRole,
  removeGroupMember,
  updateGroup
} from "../../group/services/group.api.js";

import { createGroupAttendance, getGroupAttendances, updateGroupAttendance, deleteGroupAttendance } from "../../group/attendance/services/groupAttendance.api.js";
import { createGroupOffering, getGroupOfferings, updateGroupOffering, deleteGroupOffering } from "../../group/offering/services/groupOffering.api.js";

import {
  getDepartment,
  addDepartmentMember,
  searchDepartmentMembersToAdd,
  getDepartmentMembers,
  updateDepartmentMemberRole,
  removeDepartmentMember,
  updateDepartment,
  createDepartmentAttendance,
  getDepartmentAttendances,
  updateDepartmentAttendance,
  deleteDepartmentAttendance,
  createDepartmentOffering,
  getDepartmentOfferings,
  updateDepartmentOffering,
  deleteDepartmentOffering
} from "../../department/services/department.api.js";

import {
  getCell,
  addCellMember,
  searchCellMembersToAdd,
  getCellMembers,
  updateCellMemberRole,
  removeCellMember,
  updateCell,
  createCellAttendance,
  getCellAttendances,
  updateCellAttendance,
  deleteCellAttendance,
  createCellOffering,
  getCellOfferings,
  updateCellOffering,
  deleteCellOffering
} from "../../cell/services/cell.api.js";

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function safeText(value) {
  return typeof value === "string" ? value : "";
}

function MinistryTypeIcon({ type }) {
  if (type === "cell") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <path d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 11a2 2 0 100-4 2 2 0 000 4Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (type === "department") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <path d="M4 20V8l8-4 8 4v12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M8 12a4 4 0 108 0 4 4 0 00-8 0Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Chip({ color = "gray", children }) {
  const styles =
    color === "blue"
      ? "bg-blue-100 text-blue-700"
      : color === "orange"
        ? "bg-orange-100 text-orange-700"
        : color === "purple"
          ? "bg-purple-100 text-purple-700"
          : "bg-gray-100 text-gray-700";

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>{children}</span>;
}

function normalizeMeetingSchedule(item) {
  const ms = item?.meetingSchedule;
  if (Array.isArray(ms)) return ms;

  const day = safeText(item?.mainMeetingDay).trim();
  const time = safeText(item?.meetingTime).trim();
  const venue = safeText(item?.meetingVenue).trim();
  if (day && time && venue) {
    return [{ meetingDay: day, meetingTime: time, meetingVenue: venue }];
  }
  return [];
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function ConfirmDialog({ open, title, message, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
        </div>
        <div className="px-5 py-4 text-sm text-gray-700">{message}</div>
        <div className="flex items-center justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function SimpleModal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function MinistryDetailsPage() {
  const location = useLocation();
  const { toPage } = useDashboardNavigator();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const churchStore = useContext(ChurchContext);
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const id = params.get("id") || "";
  const type = (params.get("type") || "group").toLowerCase();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [entity, setEntity] = useState(null);

  const [activeTab, setActiveTab] = useState("members");

  // members
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [members, setMembers] = useState([]);

  const debouncedMemberSearch = useDebouncedValue(memberSearch, 250);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberValue, setAddMemberValue] = useState("");
  const [addMemberRole, setAddMemberRole] = useState("member");
  const [addMemberSaving, setAddMemberSaving] = useState(false);
  const [addMemberError, setAddMemberError] = useState("");

  const [addMemberCandidatesLoading, setAddMemberCandidatesLoading] = useState(false);
  const [addMemberCandidatesError, setAddMemberCandidatesError] = useState("");
  const [addMemberCandidates, setAddMemberCandidates] = useState([]);
  const [addMemberSelectedIds, setAddMemberSelectedIds] = useState([]);

  const debouncedAddMemberValue = useDebouncedValue(addMemberValue, 250);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalMemberId, setRoleModalMemberId] = useState("");
  const [roleModalValue, setRoleModalValue] = useState("");
  const [roleModalError, setRoleModalError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMeetingSchedule, setEditMeetingSchedule] = useState([{ meetingDay: "", meetingTime: "", meetingVenue: "" }]);
  const [editStatus, setEditStatus] = useState("active");

  const meetingDays = useMemo(
    () => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    []
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMeta, setConfirmMeta] = useState(null); // { kind, payload }

  // attendance
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [attendances, setAttendances] = useState([]);

  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceMode, setAttendanceMode] = useState("create");
  const [attendanceEditing, setAttendanceEditing] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceNumber, setAttendanceNumber] = useState("");
  const [attendanceSpeaker, setAttendanceSpeaker] = useState("");
  const [attendanceActivity, setAttendanceActivity] = useState("");
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceFormError, setAttendanceFormError] = useState("");

  // offerings
  const [offeringLoading, setOfferingLoading] = useState(false);
  const [offeringError, setOfferingError] = useState("");
  const [offerings, setOfferings] = useState([]);

  const [offeringOpen, setOfferingOpen] = useState(false);
  const [offeringMode, setOfferingMode] = useState("create");
  const [offeringEditing, setOfferingEditing] = useState(null);
  const [offeringDate, setOfferingDate] = useState("");
  const [offeringAmount, setOfferingAmount] = useState("");
  const [offeringNote, setOfferingNote] = useState("");
  const [offeringSaving, setOfferingSaving] = useState(false);
  const [offeringFormError, setOfferingFormError] = useState("");

  const title = type === "cell" ? "Cell" : type === "department" ? "Department" : "Group";

  const loadEntity = useCallback(async () => {
    if (!id) {
      setError("Id is missing");
      return;
    }

    setLoading(true);
    setError("");
    setEntity(null);

    try {
      if (type === "department") {
        const res = await getDepartment(id);
        const payload = res?.data?.data ?? res?.data;
        setEntity(payload?.department || payload);
      } else if (type === "cell") {
        const res = await getCell(id);
        const payload = res?.data?.data ?? res?.data;
        setEntity(payload?.cell || payload);
      } else {
        const res = await getGroup(id);
        const payload = res?.data?.data ?? res?.data;
        setEntity(payload?.group || payload);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || `Failed to load ${title}`);
    } finally {
      setLoading(false);
    }
  }, [id, type, title]);

  const loadMembers = useCallback(async () => {
    if (!id) return;
    setMemberLoading(true);
    setMemberError("");

    try {
      if (type === "department") {
        const res = await getDepartmentMembers(id, { search: debouncedMemberSearch });
        const payload = res?.data?.data ?? res?.data;
        setMembers(Array.isArray(payload?.members) ? payload.members : []);
      } else if (type === "cell") {
        const res = await getCellMembers(id, { search: debouncedMemberSearch });
        const payload = res?.data?.data ?? res?.data;
        setMembers(Array.isArray(payload?.members) ? payload.members : []);
      } else {
        const res = await getGroupMembers(id, { search: debouncedMemberSearch });
        const payload = res?.data?.data ?? res?.data;
        setMembers(Array.isArray(payload?.members) ? payload.members : []);
      }
    } catch (e) {
      setMemberError(e?.response?.data?.message || e?.message || "Failed to load members");
      setMembers([]);
    } finally {
      setMemberLoading(false);
    }
  }, [id, type, debouncedMemberSearch]);

  const loadAttendances = useCallback(async () => {
    if (!id) return;
    setAttendanceLoading(true);
    setAttendanceError("");

    try {
      if (type === "department") {
        const res = await getDepartmentAttendances(id);
        const payload = res?.data?.data ?? res?.data;
        setAttendances(Array.isArray(payload?.attendances) ? payload.attendances : []);
      } else if (type === "cell") {
        const res = await getCellAttendances(id);
        const payload = res?.data?.data ?? res?.data;
        setAttendances(Array.isArray(payload?.attendances) ? payload.attendances : []);
      } else {
        const res = await getGroupAttendances(id);
        const payload = res?.data?.data ?? res?.data;
        setAttendances(Array.isArray(payload?.attendances) ? payload.attendances : []);
      }
    } catch (e) {
      setAttendanceError(e?.response?.data?.message || e?.message || "Failed to load attendance");
      setAttendances([]);
    } finally {
      setAttendanceLoading(false);
    }
  }, [id, type]);

  const loadOfferings = useCallback(async () => {
    if (!id) return;
    setOfferingLoading(true);
    setOfferingError("");

    try {
      if (type === "department") {
        const res = await getDepartmentOfferings(id);
        const payload = res?.data?.data ?? res?.data;
        setOfferings(Array.isArray(payload?.offerings) ? payload.offerings : []);
      } else if (type === "cell") {
        const res = await getCellOfferings(id);
        const payload = res?.data?.data ?? res?.data;
        setOfferings(Array.isArray(payload?.offerings) ? payload.offerings : []);
      } else {
        const res = await getGroupOfferings(id);
        const payload = res?.data?.data ?? res?.data;
        setOfferings(Array.isArray(payload?.offerings) ? payload.offerings : []);
      }
    } catch (e) {
      setOfferingError(e?.response?.data?.message || e?.message || "Failed to load offerings");
      setOfferings([]);
    } finally {
      setOfferingLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    loadEntity();
  }, [loadEntity]);

  useEffect(() => {
    if (activeTab === "members") loadMembers();
    if (activeTab === "attendance") loadAttendances();
    if (activeTab === "offerings") loadOfferings();
  }, [activeTab, loadMembers, loadAttendances, loadOfferings]);

  useEffect(() => {
    if (activeTab !== "members") return;
    loadMembers();
  }, [activeTab, loadMembers, debouncedMemberSearch]);

  const mainTabClass = (key) => {
    const isActive = activeTab === key;
    return `flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
      isActive ? "bg-blue-100 text-blue-900" : "text-gray-600 hover:bg-gray-100"
    }`;
  };

  const goBack = () => {
    toPage("ministries");
  };

  const typeColor = type === "group" ? "blue" : type === "cell" ? "orange" : "purple";

  const addMemberSubmit = async (e) => {
    e.preventDefault();
    setAddMemberError("");

    if (!addMemberSelectedIds.length) {
      setAddMemberError("Please select at least one member to add.");
      return;
    }

    setAddMemberSaving(true);
    try {
      const payload = { memberIds: addMemberSelectedIds, role: addMemberRole };

      if (type === "department") {
        await addDepartmentMember(id, payload);
      } else if (type === "cell") {
        await addCellMember(id, payload);
      } else {
        await addGroupMember(id, payload);
      }

      setAddMemberOpen(false);
      setAddMemberValue("");
      setAddMemberRole("member");
      setAddMemberCandidates([]);
      setAddMemberCandidatesError("");
      setAddMemberSelectedIds([]);
      await loadMembers();
    } catch (e2) {
      setAddMemberError(e2?.response?.data?.message || e2?.message || "Failed to add member");
    } finally {
      setAddMemberSaving(false);
    }
  };

  const searchAddMemberCandidates = useCallback(async () => {
    const q = String(debouncedAddMemberValue || "").trim();
    setAddMemberCandidatesError("");
    setAddMemberSelectedIds([]);

    if (!q) {
      setAddMemberCandidates([]);
      return;
    }

    setAddMemberCandidatesLoading(true);
    try {
      let res;
      if (type === "department") res = await searchDepartmentMembersToAdd(id, { search: q });
      else if (type === "cell") res = await searchCellMembersToAdd(id, { search: q });
      else res = await searchGroupMembersToAdd(id, { search: q });

      const payload = res?.data?.data ?? res?.data;
      const rows = Array.isArray(payload?.members) ? payload.members : [];
      setAddMemberCandidates(rows);
    } catch (e2) {
      setAddMemberCandidatesError(e2?.response?.data?.message || e2?.message || "Failed to search members");
      setAddMemberCandidates([]);
    } finally {
      setAddMemberCandidatesLoading(false);
    }
  }, [debouncedAddMemberValue, id, type]);

  useEffect(() => {
    if (!addMemberOpen) return;
    searchAddMemberCandidates();
  }, [addMemberOpen, searchAddMemberCandidates, debouncedAddMemberValue]);

  const openConfirm = (kind, payload) => {
    setConfirmMeta({ kind, payload });
    setConfirmOpen(true);
  };

  const confirmAction = async () => {
    const meta = confirmMeta;
    setConfirmOpen(false);
    setConfirmMeta(null);

    if (!meta?.kind) return;

    try {
      if (meta.kind === "remove-member") {
        const memberId = meta.payload;
        if (type === "department") await removeDepartmentMember(id, memberId);
        else if (type === "cell") await removeCellMember(id, memberId);
        else await removeGroupMember(id, memberId);
        await loadMembers();
      }

      if (meta.kind === "delete-attendance") {
        const attendanceId = meta.payload;
        if (type === "department") await deleteDepartmentAttendance(id, attendanceId);
        else if (type === "cell") await deleteCellAttendance(id, attendanceId);
        else await deleteGroupAttendance(id, attendanceId);
        await loadAttendances();
      }

      if (meta.kind === "delete-offering") {
        const offeringId = meta.payload;
        if (type === "department") await deleteDepartmentOffering(id, offeringId);
        else if (type === "cell") await deleteCellOffering(id, offeringId);
        else await deleteGroupOffering(id, offeringId);
        await loadOfferings();
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Action failed");
    }
  };

  const openEdit = () => {
    if (!entity) return;
    setEditError("");
    setEditName(safeText(entity?.name));
    setEditDescription(safeText(entity?.description));
    const ms = normalizeMeetingSchedule(entity);
    if (Array.isArray(ms) && ms.length) {
      setEditMeetingSchedule(
        ms.map((m) => ({
          meetingDay: safeText(m?.meetingDay),
          meetingTime: safeText(m?.meetingTime),
          meetingVenue: safeText(m?.meetingVenue)
        }))
      );
    } else {
      setEditMeetingSchedule([{ meetingDay: "", meetingTime: "", meetingVenue: "" }]);
    }
    setEditStatus(safeText(entity?.status) || "active");
    setEditOpen(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setEditError("");

    if (!editName.trim()) {
      setEditError("Name is required.");
      return;
    }

    const invalidMeeting = (Array.isArray(editMeetingSchedule) ? editMeetingSchedule : []).find(
      (m) => !String(m?.meetingDay || "").trim() || !String(m?.meetingTime || "").trim() || !String(m?.meetingVenue || "").trim()
    );
    if (invalidMeeting) {
      setEditError("Meeting day, time, and venue are required.");
      return;
    }

    const cleanSchedule = editMeetingSchedule.map((m) => ({
      meetingDay: String(m.meetingDay || "").trim(),
      meetingTime: String(m.meetingTime || "").trim(),
      meetingVenue: String(m.meetingVenue || "").trim()
    }));

    const payload = {
      name: editName.trim(),
      description: editDescription,
      meetingSchedule: cleanSchedule,
      mainMeetingDay: cleanSchedule?.[0]?.meetingDay,
      meetingTime: cleanSchedule?.[0]?.meetingTime,
      meetingVenue: cleanSchedule?.[0]?.meetingVenue
    };
    if (type === "cell" || type === "department") {
      payload.status = editStatus;
    }

    setEditSaving(true);
    try {
      if (type === "department") await updateDepartment(id, payload);
      else if (type === "cell") await updateCell(id, payload);
      else await updateGroup(id, payload);

      setEditOpen(false);
      await loadEntity();
    } catch (e2) {
      setEditError(e2?.response?.data?.message || e2?.message || "Failed to update");
    } finally {
      setEditSaving(false);
    }
  };

  const openRoleModal = (memberId, currentRole) => {
    setRoleModalError("");
    setRoleModalMemberId(String(memberId || ""));
    setRoleModalValue(String(currentRole || ""));
    setRoleModalOpen(true);
  };

  const submitRoleModal = async (e) => {
    e.preventDefault();
    setRoleModalError("");
    const memberId = roleModalMemberId;
    const role = String(roleModalValue || "").trim();
    if (!memberId) return;
    if (!role) {
      setRoleModalError("Role is required.");
      return;
    }

    try {
      if (type === "department") await updateDepartmentMemberRole(id, memberId, { role });
      else if (type === "cell") await updateCellMemberRole(id, memberId, { role });
      else await updateGroupMemberRole(id, memberId, { role });

      await loadMembers();
      setRoleModalOpen(false);
    } catch (e2) {
      setRoleModalError(e2?.response?.data?.message || e2?.message || "Failed to update role");
    }
  };

  const openAttendanceForm = (mode, row) => {
    setAttendanceFormError("");
    setAttendanceMode(mode);
    setAttendanceEditing(row || null);
    setAttendanceDate((row?.date || "").slice(0, 10));
    setAttendanceNumber(row?.numberOfAttendees ?? "");
    setAttendanceSpeaker(safeText(row?.mainSpeaker));
    setAttendanceActivity(safeText(row?.activity));
    setAttendanceOpen(true);
  };

  const submitAttendance = async (e) => {
    e.preventDefault();
    setAttendanceFormError("");

    if (!attendanceDate) {
      setAttendanceFormError("date is required");
      return;
    }

    if (!attendanceNumber || Number(attendanceNumber) <= 0) {
      setAttendanceFormError("number of attendees is required");
      return;
    }

    const payload = {
      date: attendanceDate,
      numberOfAttendees: Number(attendanceNumber),
      mainSpeaker: attendanceSpeaker,
      activity: attendanceActivity
    };

    setAttendanceSaving(true);
    try {
      if (attendanceMode === "edit") {
        const attendanceId = attendanceEditing?._id;
        if (!attendanceId) return;
        if (type === "department") await updateDepartmentAttendance(id, attendanceId, payload);
        else if (type === "cell") await updateCellAttendance(id, attendanceId, payload);
        else await updateGroupAttendance(id, attendanceId, payload);
      } else {
        if (type === "department") await createDepartmentAttendance(id, payload);
        else if (type === "cell") await createCellAttendance(id, payload);
        else await createGroupAttendance(id, payload);
      }

      setAttendanceOpen(false);
      setAttendanceEditing(null);
      await loadAttendances();
    } catch (e2) {
      setAttendanceFormError(e2?.response?.data?.message || e2?.message || "Failed to save attendance");
    } finally {
      setAttendanceSaving(false);
    }
  };

  const openOfferingForm = (mode, row) => {
    setOfferingFormError("");
    setOfferingMode(mode);
    setOfferingEditing(row || null);
    setOfferingDate((row?.date || "").slice(0, 10));
    setOfferingAmount(row?.amount ?? "");
    setOfferingNote(safeText(row?.note));
    setOfferingOpen(true);
  };

  const submitOffering = async (e) => {
    e.preventDefault();
    setOfferingFormError("");

    if (!offeringDate) {
      setOfferingFormError("date is required");
      return;
    }

    if (!offeringAmount || Number(offeringAmount) <= 0) {
      setOfferingFormError("amount is required");
      return;
    }

    const payload = {
      date: offeringDate,
      amount: Number(offeringAmount),
      note: offeringNote
    };

    setOfferingSaving(true);
    try {
      if (offeringMode === "edit") {
        const offeringId = offeringEditing?._id;
        if (!offeringId) return;
        if (type === "department") await updateDepartmentOffering(id, offeringId, payload);
        else if (type === "cell") await updateCellOffering(id, offeringId, payload);
        else await updateGroupOffering(id, offeringId, payload);
      } else {
        if (type === "department") await createDepartmentOffering(id, payload);
        else if (type === "cell") await createCellOffering(id, payload);
        else await createGroupOffering(id, payload);
      }

      setOfferingOpen(false);
      setOfferingEditing(null);
      await loadOfferings();
    } catch (e2) {
      setOfferingFormError(e2?.response?.data?.message || e2?.message || "Failed to save offering");
    } finally {
      setOfferingSaving(false);
    }
  };

  const totalMembersValue = useMemo(() => {
    if (!entity) return 0;
    if (entity?.totalMembers !== undefined && entity?.totalMembers !== null) {
      const n = Number(entity.totalMembers);
      return Number.isFinite(n) ? n : 0;
    }
    return Array.isArray(members) ? members.length : 0;
  }, [entity, members]);

  const meetingRows = useMemo(() => normalizeMeetingSchedule(entity), [entity]);

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:underline"
          >
            <span className="text-base leading-none">←</span>
            Back to Ministries
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        {loading ? (
          <div className="text-sm text-gray-600">Loading...</div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : !entity ? (
          <div className="text-sm text-gray-600">No record found.</div>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <div
                className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ring-1 ${
                  type === "group"
                    ? "bg-blue-50 text-blue-700 ring-blue-100"
                    : type === "cell"
                      ? "bg-orange-50 text-orange-700 ring-orange-100"
                      : "bg-purple-50 text-purple-700 ring-purple-100"
                }`}
              >
                <MinistryTypeIcon type={type} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip color={typeColor}>{title}</Chip>
                  {entity?.status ? <Chip>{entity.status}</Chip> : null}
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900 truncate">{entity?.name || "—"}</div>
                <div className="mt-2 text-sm text-gray-600 max-w-3xl whitespace-pre-wrap">{entity?.description || "—"}</div>

                {meetingRows.length ? (
                  <div className="mt-4 space-y-2">
                    {meetingRows.map((m, idx) => (
                      <div key={m?._id || idx} className="rounded-lg border border-gray-200 bg-white px-4 py-2">
                        <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-3 text-xs">
                          <div className="text-gray-600">
                            <span className="font-semibold text-gray-700">Day:</span> {m?.meetingDay || "—"}
                          </div>
                          <div className="text-gray-600">
                            <span className="font-semibold text-gray-700">Time:</span> {m?.meetingTime || "—"}
                          </div>
                          <div className="text-gray-600 sm:text-right">
                            <span className="font-semibold text-gray-700">Venue:</span> {m?.meetingVenue || "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full lg:w-auto lg:min-w-44">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-xs font-semibold text-gray-500">Total Members</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">{totalMembersValue}</div>
              </div>
              <button
                type="button"
                onClick={openEdit}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-full bg-gray-100 p-1 flex items-center gap-2 max-w-xl">
        <button type="button" onClick={() => setActiveTab("members")} className={mainTabClass("members")}>
          Members
        </button>
        <button type="button" onClick={() => setActiveTab("attendance")} className={mainTabClass("attendance")}>
          Attendance
        </button>
        <button type="button" onClick={() => setActiveTab("offerings")} className={mainTabClass("offerings")}>
          Offerings
        </button>
      </div>

      {activeTab === "members" ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">Members</div>
              <div className="text-xs text-gray-500">Manage members in this {title.toLowerCase()}</div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members..."
                className="h-10 w-full sm:w-64 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
              <button
                type="button"
                onClick={() => {
                  setAddMemberError("");
                  setAddMemberValue("");
                  setAddMemberRole("member");
                  setAddMemberCandidates([]);
                  setAddMemberCandidatesError("");
                  setAddMemberSelectedIds([]);
                  setAddMemberOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <span className="text-lg leading-none">+</span>
                Add Member
              </button>
            </div>
          </div>

          {memberError ? <div className="p-5 text-sm text-red-700">{memberError}</div> : null}

          {memberLoading ? (
            <div className="p-5 text-sm text-gray-600">Loading...</div>
          ) : members.length === 0 ? (
            <div className="p-5 text-sm text-gray-600">No member record found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left text-xs font-semibold text-gray-500">
                    <th className="px-6 py-2">Name</th>
                    <th className="px-6 py-2">Phone</th>
                    <th className="px-6 py-2">Email</th>
                    <th className="px-6 py-2">Role</th>
                    <th className="px-6 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {members.map((m, idx) => {
                    const member = m?.member || {};
                    const name = `${safeText(member?.firstName)} ${safeText(member?.lastName)}`.trim() || "-";
                    return (
                      <tr key={m?._id || idx} className="text-sm text-gray-700">
                        <td className="px-6 py-1.5 text-gray-900">{name}</td>
                        <td className="px-6 py-1.5">{member?.phoneNumber || "-"}</td>
                        <td className="px-6 py-1.5">{member?.email || "-"}</td>
                        <td className="px-6 py-1.5">{m?.role || "member"}</td>
                        <td className="px-6 py-1.5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const memberId = member?._id;
                                if (!memberId) return;
                                toPage("member-details", { id: memberId });
                              }}
                              className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              View
                            </button>

                            <button
                              type="button"
                              onClick={() => openRoleModal(member?._id, m?.role || "member")}
                              className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Edit Role
                            </button>

                            <button
                              type="button"
                              onClick={() => openConfirm("remove-member", member?._id)}
                              className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-gray-50"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <SimpleModal
            open={addMemberOpen}
            title="Add Member"
            onClose={() => {
              setAddMemberOpen(false);
            }}
          >
            <form onSubmit={addMemberSubmit}>
              {addMemberError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{addMemberError}</div>
              ) : null}

              <div>
                <label className="block text-xs font-semibold text-gray-500">Search member (name/email/phone)</label>
                <div className="mt-2">
                  <input
                    value={addMemberValue}
                    onChange={(e) => setAddMemberValue(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                    placeholder="Type to search (auto-search)"
                  />
                </div>
              </div>

              {addMemberCandidatesError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{addMemberCandidatesError}</div>
              ) : null}

              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500">Results</div>
                <div className="mt-2 rounded-xl border border-gray-200 max-h-64 overflow-y-auto">
                  {addMemberCandidatesLoading ? (
                    <div className="px-4 py-3 text-sm text-gray-600">Loading...</div>
                  ) : addMemberCandidates.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-600">No matching members found.</div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {addMemberCandidates.map((m, idx) => {
                        const name = `${safeText(m?.firstName)} ${safeText(m?.lastName)}`.trim() || "-";
                        const phone = m?.phoneNumber || "-";
                        const city = m?.city || "-";
                        const isSelected = addMemberSelectedIds.includes(String(m?._id || ""));
                        return (
                          <label
                            key={m?._id || idx}
                            className={`w-full flex items-start gap-3 px-4 py-3 transition cursor-pointer ${
                              isSelected ? "bg-blue-50" : "bg-white hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const id2 = String(m?._id || "");
                                if (!id2) return;
                                setAddMemberSelectedIds((prev) => {
                                  const list = Array.isArray(prev) ? prev : [];
                                  if (list.includes(id2)) return list.filter((x) => x !== id2);
                                  return [...list, id2];
                                });
                              }}
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">{name}</div>
                                  <div className="mt-1 text-xs text-gray-500 truncate">{phone}</div>
                                </div>
                                <div className="text-xs font-semibold text-gray-600 shrink-0">{city}</div>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500">Selected: {addMemberSelectedIds.length}</div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-500">Role</label>
                <input
                  value={addMemberRole}
                  onChange={(e) => setAddMemberRole(e.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  placeholder="e.g. leader"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddMemberOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMemberSaving || addMemberSelectedIds.length === 0}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </form>
          </SimpleModal>
        </div>
      ) : null}

      <SimpleModal open={roleModalOpen} title="Edit Role" onClose={() => setRoleModalOpen(false)}>
        <form onSubmit={submitRoleModal}>
          {roleModalError ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{roleModalError}</div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-gray-500">Role</label>
            <input
              value={roleModalValue}
              onChange={(e) => setRoleModalValue(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              placeholder="e.g. leader"
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setRoleModalOpen(false)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </SimpleModal>

      <SimpleModal open={editOpen} title={`Edit ${title}`} onClose={() => setEditOpen(false)}>
        <form onSubmit={submitEdit}>
          {editError ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{editError}</div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500">Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-gray-500">Meeting Schedule</div>
                <button
                  type="button"
                  onClick={() =>
                    setEditMeetingSchedule((prev) => [...(Array.isArray(prev) ? prev : []), { meetingDay: "", meetingTime: "", meetingVenue: "" }])
                  }
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  Add another meeting
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {(Array.isArray(editMeetingSchedule) ? editMeetingSchedule : []).map((m, idx) => (
                  <div key={`meeting-${idx}`} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500">Day</label>
                      <select
                        value={m?.meetingDay || ""}
                        onChange={(e) =>
                          setEditMeetingSchedule((prev) => prev.map((row, i) => (i === idx ? { ...row, meetingDay: e.target.value } : row)))
                        }
                        className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                      >
                        <option value="">Select day</option>
                        {meetingDays.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500">Time</label>
                      <input
                        value={m?.meetingTime || ""}
                        onChange={(e) =>
                          setEditMeetingSchedule((prev) => prev.map((row, i) => (i === idx ? { ...row, meetingTime: e.target.value } : row)))
                        }
                        type="time"
                        className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500">Venue</label>
                      <input
                        value={m?.meetingVenue || ""}
                        onChange={(e) =>
                          setEditMeetingSchedule((prev) => prev.map((row, i) => (i === idx ? { ...row, meetingVenue: e.target.value } : row)))
                        }
                        className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                        placeholder="Venue"
                      />
                    </div>

                    {editMeetingSchedule.length > 1 ? (
                      <div className="sm:col-span-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setEditMeetingSchedule((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Remove meeting
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {type === "cell" || type === "department" ? (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      </SimpleModal>

      {activeTab === "attendance" ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
            <div>
              <div className="text-sm font-semibold text-gray-900">Attendance</div>
              <div className="text-xs text-gray-500">Record total attendance</div>
            </div>

            <button
              type="button"
              onClick={() => openAttendanceForm("create", null)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <span className="text-lg leading-none">+</span>
              Add Attendance
            </button>
          </div>

          {attendanceError ? <div className="p-5 text-sm text-red-700">{attendanceError}</div> : null}

          {attendanceLoading ? (
            <div className="p-5 text-sm text-gray-600">Loading...</div>
          ) : attendances.length === 0 ? (
            <div className="p-5 text-sm text-gray-600">No attendance record found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left text-xs font-semibold text-gray-500">
                    <th className="px-6 py-2">Date</th>
                    <th className="px-6 py-2">Attendees</th>
                    <th className="px-6 py-2">Speaker</th>
                    <th className="px-6 py-2">Activity</th>
                    <th className="px-6 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendances.map((r, idx) => (
                    <tr key={r?._id || idx} className="text-sm text-gray-700">
                      <td className="px-6 py-1.5 text-gray-900">{formatDate(r?.date)}</td>
                      <td className="px-6 py-1.5">{Number(r?.numberOfAttendees || 0)}</td>
                      <td className="px-6 py-1.5">{r?.mainSpeaker || "-"}</td>
                      <td className="px-6 py-1.5">{r?.activity || "-"}</td>
                      <td className="px-6 py-1.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openAttendanceForm("edit", r)}
                            className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openConfirm("delete-attendance", r?._id)}
                            className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-gray-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <SimpleModal
            open={attendanceOpen}
            title={attendanceMode === "edit" ? "Edit Attendance" : "Add Attendance"}
            onClose={() => setAttendanceOpen(false)}
          >
            <form onSubmit={submitAttendance}>
              {attendanceFormError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{attendanceFormError}</div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500">Date</label>
                  <input
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    type="date"
                    className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500">Number of attendees</label>
                  <input
                    value={attendanceNumber}
                    onChange={(e) => setAttendanceNumber(e.target.value)}
                    type="number"
                    className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500">Main speaker</label>
                  <input
                    value={attendanceSpeaker}
                    onChange={(e) => setAttendanceSpeaker(e.target.value)}
                    className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500">Activity</label>
                  <input
                    value={attendanceActivity}
                    onChange={(e) => setAttendanceActivity(e.target.value)}
                    className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAttendanceOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={attendanceSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {attendanceMode === "edit" ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </SimpleModal>
        </div>
      ) : null}

      {activeTab === "offerings" ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
            <div>
              <div className="text-sm font-semibold text-gray-900">Offerings</div>
              <div className="text-xs text-gray-500">Record ministry offerings</div>
            </div>

            <button
              type="button"
              onClick={() => openOfferingForm("create", null)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <span className="text-lg leading-none">+</span>
              Add Offering
            </button>
          </div>

          {offeringError ? <div className="p-5 text-sm text-red-700">{offeringError}</div> : null}

          {offeringLoading ? (
            <div className="p-5 text-sm text-gray-600">Loading...</div>
          ) : offerings.length === 0 ? (
            <div className="p-5 text-sm text-gray-600">No offering record found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left text-xs font-semibold text-gray-500">
                    <th className="px-6 py-2">Date</th>
                    <th className="px-6 py-2">Amount</th>
                    <th className="px-6 py-2">Note</th>
                    <th className="px-6 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {offerings.map((r, idx) => (
                    <tr key={r?._id || idx} className="text-sm text-gray-700">
                      <td className="px-6 py-1.5 text-gray-900">{formatDate(r?.date)}</td>
                      <td className="px-6 py-1.5 text-blue-700">{formatMoney(r?.amount || 0, currency)}</td>
                      <td className="px-6 py-1.5 text-gray-600 max-w-[420px] break-words">{r?.note || "-"}</td>
                      <td className="px-6 py-1.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openOfferingForm("edit", r)}
                            className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openConfirm("delete-offering", r?._id)}
                            className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-gray-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <SimpleModal
            open={offeringOpen}
            title={offeringMode === "edit" ? "Edit Offering" : "Add Offering"}
            onClose={() => setOfferingOpen(false)}
          >
            <form onSubmit={submitOffering}>
              {offeringFormError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{offeringFormError}</div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500">Date</label>
                  <input
                    value={offeringDate}
                    onChange={(e) => setOfferingDate(e.target.value)}
                    type="date"
                    className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500">Amount</label>
                  <input
                    value={offeringAmount}
                    onChange={(e) => setOfferingAmount(e.target.value)}
                    type="number"
                    className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500">Note</label>
                  <textarea
                    value={offeringNote}
                    onChange={(e) => setOfferingNote(e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOfferingOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={offeringSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {offeringMode === "edit" ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </SimpleModal>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm"
        message="Are you sure you want to proceed?"
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmMeta(null);
        }}
        onConfirm={confirmAction}
      />
    </div>
  );
}

export default MinistryDetailsPage;
