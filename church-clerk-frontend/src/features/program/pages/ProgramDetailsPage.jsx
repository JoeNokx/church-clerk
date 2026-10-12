import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getProgram as apiGetProgram } from "../services/program.api.js";
import PermissionContext from "../../permissions/permission.store.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import { createProgramAttendee, deleteProgramAttendee, getProgramAttendees, updateProgramAttendee } from "../attendees/services/programAttendees.api.js";
import { getMembers } from "../../member/services/member.api.js";
import { getVisitors } from "../../attendance/services/attendance.api.js";
import {
  deleteProgramAttendanceFile,
  getProgramAttendanceFileDownloadUrl,
  getProgramAttendanceFiles,
  updateProgramAttendanceFile,
  uploadProgramAttendanceFile
} from "../attendanceFiles/services/programAttendanceFiles.api.js";
import FileUploadButton from "../../../shared/components/FileUploadButton.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import ProgramCreatePage from "./ProgramCreatePage.jsx";
import ProgramOfferingPage from "../offerings/pages/ProgramOfferingPage.jsx";
import ScopedExpensesTab from "../../../shared/components/ScopedExpensesTab/index.jsx";
import ProgramPledgesTab from "../pledges/ProgramPledgesTab.jsx";
import PhoneNumberInput from "../../../components/common/PhoneNumberInput.jsx";
import { isValidPhoneNumber } from "react-phone-number-input";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import PageTabs from "../../../shared/components/PageTabs/index.jsx";
import Pagination from "../../../shared/components/Pagination/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import BackButton from "../../../shared/components/BackButton/index.jsx";
import { resolveEmptyReason, buildRecoveryActions } from "../../../shared/utils/emptyState.js";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import { exportToExcel } from "../../../shared/utils/exportExcel.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatRange(from, to) {
  const start = formatDate(from);
  const end = formatDate(to);
  if (start === "—" && end === "—") return "—";
  if (start !== "—" && end !== "—") return `${start} - ${end}`;
  return start !== "—" ? start : end;
}

function formatShortMonthDay(value) {
  if (!value) return { month: "", day: "" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { month: "", day: "" };
  const month = d.toLocaleDateString(undefined, { month: "short" });
  const day = d.toLocaleDateString(undefined, { day: "2-digit" });
  return { month, day };
}

function formatTimeRange(from, to, legacy) {
  const f = String(from || "").trim();
  const t = String(to || "").trim();
  if (f && t) return `${f} - ${t}`;
  if (f) return f;
  if (t) return t;
  if (legacy) return String(legacy);
  return "—";
}

function guessFileType(mimeType, name) {
  const mt = String(mimeType || "").toLowerCase();
  const n = String(name || "").toLowerCase();
  if (mt.includes("spreadsheet") || n.endsWith(".xlsx") || n.endsWith(".xls")) return "Excel";
  if (mt.includes("word") || n.endsWith(".doc") || n.endsWith(".docx")) return "Word";
  if (mt.startsWith("image/") || n.match(/\.(png|jpg|jpeg|webp|gif)$/)) return "Image";
  if (mt.includes("pdf") || n.endsWith(".pdf")) return "PDF";
  return "File";
}

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs || 250);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb * 10) / 10} KB`;
  const mb = kb / 1024;
  return `${Math.round(mb * 10) / 10} MB`;
}

function SimpleModal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
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

function ProgramDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toPage } = useDashboardNavigator();
  const { can } = useContext(PermissionContext) || {};
  const guarded = useGuardedAction();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const programId = params.get("id");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [program, setProgram] = useState(null);

  const [activeMainTab, setActiveMainTab] = useState("offering");
  const [activeTab, setActiveTab] = useState("registration");

  const canEdit = useMemo(() => (typeof can === "function" ? can("programs", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("programs", "delete") : false), [can]);

  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesError, setAttendeesError] = useState(null);
  const [attendees, setAttendees] = useState([]);


  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileUploading, setFileUploading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);

  const [editAttendeeOpen, setEditAttendeeOpen] = useState(false);
  const [editAttendeeSaving, setEditAttendeeSaving] = useState(false);
  const [editAttendeeError, setEditAttendeeError] = useState(null);
  const [editAttendeeRow, setEditAttendeeRow] = useState(null);
  const [editAttendeeFullName, setEditAttendeeFullName] = useState("");
  const [editAttendeeEmail, setEditAttendeeEmail] = useState("");
  const [editAttendeePhone, setEditAttendeePhone] = useState("");
  const [editAttendeeLocation, setEditAttendeeLocation] = useState("");
  const [editAttendeeRegDate, setEditAttendeeRegDate] = useState("");


  const [editFileOpen, setEditFileOpen] = useState(false);
  const [editFileSaving, setEditFileSaving] = useState(false);
  const [editFileError, setEditFileError] = useState(null);
  const [editFileRow, setEditFileRow] = useState(null);
  const [editFileName, setEditFileName] = useState("");
  const [editFileReplacement, setEditFileReplacement] = useState(null);

  const [regSearch, setRegSearch] = useState("");
  const [regDateFrom, setRegDateFrom] = useState("");
  const [regDateTo, setRegDateTo] = useState("");


  const [filesSearch, setFilesSearch] = useState("");
  const [filesDateFrom, setFilesDateFrom] = useState("");
  const [filesDateTo, setFilesDateTo] = useState("");
  const [regPage, setRegPage] = useState(1);
  const [regLimit, setRegLimit] = useState(20);
  const [filesPage, setFilesPage] = useState(1);
  const [filesLimit, setFilesLimit] = useState(20);
  const [previewFile, setPreviewFile] = useState(null);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerSaving, setRegisterSaving] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regLocation, setRegLocation] = useState("");
  const [regDate, setRegDate] = useState("");
  const [registerQueue, setRegisterQueue] = useState([]);
  const [regMemberQuery, setRegMemberQuery] = useState("");
  const [regMemberOptions, setRegMemberOptions] = useState([]);
  const [regMemberSearching, setRegMemberSearching] = useState(false);
  const [regSelectedMember, setRegSelectedMember] = useState(null);


  useEffect(() => {
    if (!programId) {
      setError("Program id is missing");
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setProgram(null);

      try {
        const res = await apiGetProgram(programId);
        const payload = res?.data?.data ?? res?.data;
        const e = payload?.program ?? payload;
        if (cancelled) return;
        setProgram(e || null);
      } catch (err) {
        if (cancelled) return;
        setError(err?.response?.data?.message || err?.message || "Failed to load program");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [programId]);

  const loadAttendees = useCallback(async () => {
    if (!programId) return;
    setAttendeesLoading(true);
    setAttendeesError(null);
    try {
      const limit = 200;
      const all = [];
      for (let page = 1; page <= 50; page += 1) {
        const res = await getProgramAttendees(programId, { page, limit });
        const batch = Array.isArray(res?.data?.attendees) ? res.data.attendees : [];
        all.push(...batch);
        if (!res?.data?.pagination?.hasNext || batch.length < limit) break;
      }
      setAttendees(all);
    } catch (err) {
      setAttendees([]);
      setAttendeesError(err?.response?.data?.message || err?.message || "Failed to fetch attendees");
    } finally {
      setAttendeesLoading(false);
    }
  }, [programId]);


  const loadFiles = useCallback(async () => {
    if (!programId) return;
    setFilesLoading(true);
    setFilesError(null);
    try {
      const res = await getProgramAttendanceFiles(programId);
      setFiles(Array.isArray(res?.data?.files) ? res.data.files : []);
    } catch (err) {
      setFiles([]);
      setFilesError(err?.response?.data?.message || err?.message || "Failed to fetch uploaded files");
    } finally {
      setFilesLoading(false);
    }
  }, [programId]);

  const openEditAttendee = (row) => {
    setEditAttendeeRow(row || null);
    setEditAttendeeError(null);
    setEditAttendeeFullName(row?.fullName || "");
    setEditAttendeeEmail(row?.email || "");
    setEditAttendeePhone(row?.phoneNumber || "");
    setEditAttendeeLocation(row?.location || "");
    setEditAttendeeRegDate(String(row?.registrationDate || row?.createdAt || "").slice(0, 10));
    setEditAttendeeOpen(true);
  };

  const closeEditAttendee = () => {
    if (editAttendeeSaving) return;
    setEditAttendeeOpen(false);
    setEditAttendeeRow(null);
    setEditAttendeeError(null);
  };

  const onSaveEditAttendee = async () => {
    if (!programId) return;
    if (!editAttendeeRow?._id) return;
    if (!canEdit) return;

    if (!String(editAttendeeFullName || "").trim() || !String(editAttendeePhone || "").trim()) {
      setEditAttendeeError("Name and phone number are required.");
      return;
    }

    if (!isValidPhoneNumber(editAttendeePhone)) {
      setEditAttendeeError("Invalid phone number");
      return;
    }

    setEditAttendeeSaving(true);
    setEditAttendeeError(null);
    try {
      await updateProgramAttendee(programId, editAttendeeRow._id, {
        fullName: String(editAttendeeFullName || "").trim(),
        email: String(editAttendeeEmail || "").trim() || undefined,
        phoneNumber: String(editAttendeePhone || "").trim(),
        location: String(editAttendeeLocation || "").trim() || undefined,
        registrationDate: editAttendeeRegDate || undefined
      });
      setEditAttendeeOpen(false);
      setEditAttendeeRow(null);
      await loadAttendees();
    } catch (err) {
      setEditAttendeeError(err?.response?.data?.message || err?.message || "Failed to update attendee");
    } finally {
      setEditAttendeeSaving(false);
    }
  };

  const onDeleteAttendee = async (row) => {
    if (!programId) return;
    if (!row?._id) return;
    if (!canDelete) return;
    const ok = window.confirm(`Delete attendee "${row?.fullName || ""}"?`);
    if (!ok) return;
    setAttendeesLoading(true);
    setAttendeesError(null);
    try {
      await deleteProgramAttendee(programId, row._id);
      await loadAttendees();
    } catch (err) {
      setAttendeesError(err?.response?.data?.message || err?.message || "Failed to delete attendee");
    } finally {
      setAttendeesLoading(false);
    }
  };


  const openEditFile = (file) => {
    setEditFileRow(file || null);
    setEditFileError(null);
    setEditFileName(file?.originalName || "");
    setEditFileReplacement(null);
    setEditFileOpen(true);
  };

  const closeEditFile = () => {
    if (editFileSaving) return;
    setEditFileOpen(false);
    setEditFileRow(null);
    setEditFileError(null);
    setEditFileReplacement(null);
  };

  const onSaveEditFile = async () => {
    if (!programId) return;
    if (!editFileRow?._id) return;
    if (!canDelete) return;

    const nextName = String(editFileName || "").trim();
    if (!nextName) {
      setEditFileError("File name is required.");
      return;
    }

    setEditFileSaving(true);
    setEditFileError(null);
    setFilesError(null);

    try {
      if (!editFileReplacement) {
        await updateProgramAttendanceFile(programId, editFileRow._id, { originalName: nextName });
        setEditFileOpen(false);
        setEditFileRow(null);
        await loadFiles();
        return;
      }

      const uploadRes = await uploadProgramAttendanceFile(programId, editFileReplacement);
      const created = uploadRes?.data?.file ?? uploadRes?.data?.data?.file;
      const createdId = created?._id;
      if (createdId && nextName) {
        await updateProgramAttendanceFile(programId, createdId, { originalName: nextName });
      }

      await deleteProgramAttendanceFile(programId, editFileRow._id);

      setEditFileOpen(false);
      setEditFileRow(null);
      await loadFiles();
    } catch (err) {
      setEditFileError(err?.response?.data?.message || err?.message || "Failed to update file");
    } finally {
      setEditFileSaving(false);
    }
  };

  const debouncedRegMemberQuery = useDebouncedValue(regMemberQuery, 300);

  useEffect(() => {
    if (!registerOpen || regSelectedMember) return;
    const q = String(debouncedRegMemberQuery || "").trim();
    if (!q) {
      setRegMemberOptions([]);
      return;
    }

    let cancelled = false;
    setRegMemberSearching(true);
    Promise.all([
      getMembers({ search: q, page: 1, limit: 8 }).catch(() => null),
      getVisitors({ search: q, page: 1, limit: 8 }).catch(() => null),
    ])
      .then(([membersRes, visitorsRes]) => {
        if (cancelled) return;
        const mPayload = membersRes?.data?.data ?? membersRes?.data;
        const vPayload = visitorsRes?.data?.data ?? visitorsRes?.data;
        const members = (Array.isArray(mPayload?.members) ? mPayload.members : []).map((m) => ({ ...m, _source: "member" }));
        const visitors = (Array.isArray(vPayload?.visitors) ? vPayload.visitors : []).map((v) => ({ ...v, _source: "visitor" }));
        setRegMemberOptions([...members, ...visitors].slice(0, 8));
      })
      .catch(() => {
        if (!cancelled) setRegMemberOptions([]);
      })
      .finally(() => {
        if (!cancelled) setRegMemberSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedRegMemberQuery, registerOpen, regSelectedMember]);

  const selectRegisterMember = (m) => {
    if (!m) return;
    const isVisitor = m?._source === "visitor";
    const fullName = isVisitor
      ? (m?.fullName || "")
      : (`${String(m?.firstName || "").trim()} ${String(m?.lastName || "").trim()}`.trim() || m?.fullName || "");
    setRegSelectedMember(m);
    setRegMemberQuery(fullName);
    setRegMemberOptions([]);
    setRegFullName(fullName);
    setRegEmail(m?.email || "");
    setRegPhone(m?.phoneNumber || "");
    setRegLocation(isVisitor ? (m?.location || "") : [m?.streetAddress, m?.city].filter(Boolean).join(", "));
    setRegisterError(null);
  };

  const clearRegisterMember = () => {
    setRegSelectedMember(null);
    setRegMemberQuery("");
    setRegMemberOptions([]);
  };

  const onEditQueuedAttendee = (q) => {
    if (!q) return;
    setRegisterQueue((prev) => prev.filter((x) => x.id !== q.id));
    setRegFullName(q.fullName || "");
    setRegEmail(q.email || "");
    setRegPhone(q.phoneNumber || "");
    setRegLocation(q.location || "");
    setRegDate(q.registrationDate || "");
    clearRegisterMember();
  };

  const resetRegisterMemberSearch = () => {
    setRegMemberQuery("");
    setRegMemberOptions([]);
    setRegMemberSearching(false);
    setRegSelectedMember(null);
  };

  const regMemberKey = (m) => String(m?._id || "");
  const phoneDigits = (v) => String(v || "").replace(/\D/g, "");

  const takenMemberIds = useMemo(
    () => new Set((registerQueue || []).map((q) => q?.memberId).filter(Boolean)),
    [registerQueue]
  );

  const takenPhones = useMemo(
    () => new Set([
      ...(registerQueue || []).map((q) => phoneDigits(q?.phoneNumber)),
      ...(attendees || []).map((a) => phoneDigits(a?.phoneNumber)),
    ].filter(Boolean)),
    [registerQueue, attendees]
  );

  const isMemberTaken = (m) => {
    const mid = regMemberKey(m);
    if (mid && takenMemberIds.has(mid)) return true;
    const p = phoneDigits(m?.phoneNumber);
    return Boolean(p && takenPhones.has(p));
  };

  const onAddToRegisterQueue = () => {
    if (!regFullName || !regPhone) {
      setRegisterError("Name and phone number are required.");
      return;
    }

    if (!isValidPhoneNumber(regPhone)) {
      setRegisterError("Invalid phone number");
      return;
    }

    if (regSelectedMember && isMemberTaken(regSelectedMember)) {
      setRegisterError("This member is already added or registered.");
      return;
    }

    setRegisterError(null);
    setRegisterQueue((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        memberId: regSelectedMember?._id || null,
        fullName: regFullName,
        email: regEmail || "",
        phoneNumber: regPhone,
        location: regLocation || "",
        registrationDate: regDate || ""
      }
    ]);
    setRegFullName("");
    setRegEmail("");
    setRegPhone("");
    setRegLocation("");
    resetRegisterMemberSearch();
  };

  const onRegisterAll = async () => {
    if (!programId) return;

    const queue = Array.isArray(registerQueue) ? [...registerQueue] : [];
    const hasCurrent = Boolean(String(regFullName || "").trim() || String(regPhone || "").trim() || String(regEmail || "").trim() || String(regLocation || "").trim());
    if (hasCurrent) {
      if (!regFullName || !regPhone) {
        setRegisterError("Name and phone number are required.");
        return;
      }

      if (!isValidPhoneNumber(regPhone)) {
        setRegisterError("Invalid phone number");
        return;
      }
      if (regSelectedMember && isMemberTaken(regSelectedMember)) {
        setRegisterError("This member is already added or registered.");
        return;
      }
      queue.push({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        memberId: regSelectedMember?._id || null,
        fullName: regFullName,
        email: regEmail || "",
        phoneNumber: regPhone,
        location: regLocation || "",
        registrationDate: regDate || ""
      });
    }

    if (!queue.length) {
      setRegisterError("Add at least one attendee to register.");
      return;
    }

    setRegisterSaving(true);
    setRegisterError(null);
    try {
      for (const item of queue) {
        await createProgramAttendee(programId, {
          fullName: item.fullName,
          email: item.email || undefined,
          phoneNumber: item.phoneNumber,
          location: item.location || undefined,
          registrationDate: item.registrationDate || undefined
        });
      }
      setRegisterOpen(false);
      setRegFullName("");
      setRegEmail("");
      setRegPhone("");
      setRegLocation("");
      setRegDate("");
      setRegisterQueue([]);
      resetRegisterMemberSearch();
      await loadAttendees();
    } catch (err) {
      setRegisterError(err?.response?.data?.message || err?.message || "Failed to register attendee(s)");
    } finally {
      setRegisterSaving(false);
    }
  };

  useEffect(() => {
    if (!programId) return;
    if (activeMainTab !== "attendance") return;
    if (activeTab === "registration") {
      loadAttendees();
      return;
    }
    if (activeTab === "files") {
      loadFiles();
    }
  }, [activeMainTab, activeTab, programId, loadAttendees, loadFiles]);

  const goBack = () => {
    const from = location?.state?.from;
    if (from === "dashboard") {
      toPage("dashboard");
      return;
    }
    if (from === "programs") {
      const t = String(location?.state?.tab || program?.status || "").trim();
      toPage("programs", ["upcoming", "ongoing", "past"].includes(t) ? { tab: t } : undefined);
      return;
    }
    navigate(-1);
  };

  const onExportAttendees = () => {
    const rows = Array.isArray(attendees) ? attendees : [];
    const headers = ["Name", "Email", "Phone", "Location"];
    const data = rows.map((r) => [
      r?.fullName || "",
      r?.email || "",
      r?.phoneNumber || "",
      r?.location || "",
    ]);
    exportToExcel(`program_attendees_${programId || ""}.xlsx`, headers, data, "Attendees");
  };

  const onRegister = async () => {
    if (!programId) return;
    if (!regFullName || !regPhone) {
      setRegisterError("Name and phone number are required.");
      return;
    }

    if (!isValidPhoneNumber(regPhone)) {
      setRegisterError("Invalid phone number");
      return;
    }

    if (regSelectedMember && isMemberTaken(regSelectedMember)) {
      setRegisterError("This member is already added or registered.");
      return;
    }

    setRegisterSaving(true);
    setRegisterError(null);
    try {
      await createProgramAttendee(programId, {
        fullName: regFullName,
        email: regEmail || undefined,
        phoneNumber: regPhone,
        location: regLocation || undefined,
        registrationDate: regDate || undefined
      });
      setRegisterOpen(false);
      setRegFullName("");
      setRegEmail("");
      setRegPhone("");
      setRegLocation("");
      setRegDate("");
      resetRegisterMemberSearch();
      await loadAttendees();
    } catch (err) {
      setRegisterError(err?.response?.data?.message || err?.message || "Failed to register attendee");
    } finally {
      setRegisterSaving(false);
    }
  };


  const onUploadFile = async (file) => {
    if (!programId) return;
    if (!file) return;
    setFileUploading(true);
    setFilesError(null);
    try {
      await uploadProgramAttendanceFile(programId, file);
      await loadFiles();
    } catch (err) {
      const data = err?.response?.data;
      const baseMessage = data?.error || data?.message || err?.message || "Failed to upload file";
      const meta = [data?.code, data?.http_code, data?.name].filter(Boolean).join(" / ");
      setFilesError(meta ? `${baseMessage} (${meta})` : baseMessage);
    } finally {
      setFileUploading(false);
    }
  };

  const filterByDateRange = (dateStr, from, to) => {
    if (!from && !to) return true;
    if (!dateStr) return false;
    const d = dateStr.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const filteredAttendees = useMemo(() => {
    const q = regSearch.toLowerCase();
    return attendees.filter((r) => {
      const matchSearch = !q ||
        (r?.fullName || "").toLowerCase().includes(q) ||
        (r?.email || "").toLowerCase().includes(q) ||
        (r?.phoneNumber || "").toLowerCase().includes(q);
      const matchDate = filterByDateRange(String(r?.registrationDate || r?.createdAt || ""), regDateFrom, regDateTo);
      return matchSearch && matchDate;
    });
  }, [attendees, regSearch, regDateFrom, regDateTo]);


  const filteredFiles = useMemo(() => {
    const q = filesSearch.toLowerCase();
    return files.filter((f) => {
      const matchSearch = !q || (f?.originalName || "").toLowerCase().includes(q);
      const matchDate = filterByDateRange(f?.createdAt, filesDateFrom, filesDateTo);
      return matchSearch && matchDate;
    });
  }, [files, filesSearch, filesDateFrom, filesDateTo]);

  useEffect(() => { setRegPage(1); }, [regSearch, regDateFrom, regDateTo]);
  useEffect(() => { setFilesPage(1); }, [filesSearch, filesDateFrom, filesDateTo]);

  const attendeesTotalPages = Math.max(1, Math.ceil(filteredAttendees.length / regLimit));
  const attendeesCurrentPage = Math.min(regPage, attendeesTotalPages);
  const paginatedAttendees = useMemo(
    () => filteredAttendees.slice((attendeesCurrentPage - 1) * regLimit, attendeesCurrentPage * regLimit),
    [filteredAttendees, attendeesCurrentPage, regLimit]
  );
  const attendeesPagination = useMemo(() => ({
    totalResult: filteredAttendees.length,
    totalPages: attendeesTotalPages,
    currentPage: attendeesCurrentPage,
    hasPrev: attendeesCurrentPage > 1,
    hasNext: attendeesCurrentPage < attendeesTotalPages,
    prevPage: attendeesCurrentPage > 1 ? attendeesCurrentPage - 1 : null,
    nextPage: attendeesCurrentPage < attendeesTotalPages ? attendeesCurrentPage + 1 : null
  }), [filteredAttendees.length, attendeesTotalPages, attendeesCurrentPage]);

  const filesTotalPages = Math.max(1, Math.ceil(filteredFiles.length / filesLimit));
  const filesCurrentPage = Math.min(filesPage, filesTotalPages);
  const paginatedFiles = useMemo(
    () => filteredFiles.slice((filesCurrentPage - 1) * filesLimit, filesCurrentPage * filesLimit),
    [filteredFiles, filesCurrentPage, filesLimit]
  );
  const filesPagination = useMemo(() => ({
    totalResult: filteredFiles.length,
    totalPages: filesTotalPages,
    currentPage: filesCurrentPage,
    hasPrev: filesCurrentPage > 1,
    hasNext: filesCurrentPage < filesTotalPages,
    prevPage: filesCurrentPage > 1 ? filesCurrentPage - 1 : null,
    nextPage: filesCurrentPage < filesTotalPages ? filesCurrentPage + 1 : null
  }), [filteredFiles.length, filesTotalPages, filesCurrentPage]);

  const badge = formatShortMonthDay(program?.dateFrom);
  const organizerText =
    typeof program?.organizers === "string"
      ? program.organizers
      : Array.isArray(program?.organizers) && program.organizers.length
        ? program.organizers[0]
        : "—";

  return (
    <div className="max-w-6xl">
      <BackButton onClick={goBack} />

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 pb-4 md:p-6 md:pb-5 lg:p-8 lg:pb-6">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="h-7 w-56 rounded bg-gray-200" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i}>
                  <div className="h-3 w-16 rounded bg-gray-200" />
                  <div className="mt-1 h-4 w-24 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
        ) : !program ? (
          <div className="text-gray-600 text-sm">No program found.</div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 md:gap-5">
              <div className="h-20 w-20 rounded-2xl bg-purple-50 flex flex-col items-center justify-center">
                <div className="font-semibold text-purple-700 text-xs">{badge.month}</div>
                <div className="font-bold text-purple-800 md:text-3xl lg:text-4xl text-xl md:text-2xl">{badge.day}</div>
              </div>

              <div className="min-w-0">
                <div className="font-semibold text-blue-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">{program?.title || "—"}</div>
                <div className="mt-2 text-gray-600 max-w-3xl whitespace-pre-wrap text-sm">{program?.description || "—"}</div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-purple-100 px-3 py-1 font-semibold text-purple-700 text-xs">{program?.category || "Conference"}</span>
                  {program?.department?.name ? (
                    <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700 text-xs">{program.department.name}</span>
                  ) : null}
                  <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700 text-xs">{program?.status || "upcoming"}</span>
                </div>
              </div>
            </div>

            {canEdit ? (
              <button
                type="button"
                onClick={() => guarded(() => setEditOpen(true))}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-100 text-sm"
              >
                Edit
              </button>
            ) : null}
          </div>
        )}

        {!loading && !error && program ? (
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 pt-3 md:pt-4 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center md:h-10 md:w-10">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-blue-700">
                  <path d="M7 3v3M17 3v3M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-500 text-xs">Program Date</div>
                <div className="mt-1 font-semibold text-blue-900 text-sm">{formatRange(program?.dateFrom, program?.dateTo)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center md:h-10 md:w-10">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-purple-700">
                  <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 22a10 10 0 100-20 10 10 0 000 20Z" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-500 text-xs">Time</div>
                <div className="mt-1 font-semibold text-blue-900 text-sm">
                  {formatTimeRange(program?.timeFrom, program?.timeTo, program?.time)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center md:h-10 md:w-10">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-green-700">
                  <path d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M12 11a2 2 0 100-4 2 2 0 000 4Z" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-500 text-xs">Location</div>
                <div className="mt-1 font-semibold text-blue-900 text-sm">{program?.venue || "—"}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center md:h-10 md:w-10">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-orange-600">
                  <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-500 text-xs">Organizer</div>
                <div className="mt-1 font-semibold text-blue-900 text-sm">{organizerText}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <ProgramCreatePage
        open={editOpen}
        mode="edit"
        programId={programId}
        onClose={() => setEditOpen(false)}
        onSuccess={async () => {
          setEditOpen(false);
          if (programId) {
            try {
              const res = await apiGetProgram(programId);
              const payload = res?.data?.data ?? res?.data;
              const e = payload?.program ?? payload;
              setProgram(e || null);
            } catch {
              // no-op
            }
          }
        }}
      />

      {!loading && !error && program ? (
        <PageTabs
          tabs={[
            { key: "offering", label: "Offerings & Seeds" },
            { key: "attendance", label: "Record Attendance" },
            { key: "expenses", label: "Expenses" },
            { key: "pledge", label: "Pledges" },
          ]}
          activeTab={activeMainTab}
          onChange={setActiveMainTab}
          sticky={false}
          className="mt-6"
        />
      ) : null}

      {!loading && !error && program && activeMainTab === "offering" ? (
        <div className="mt-6">
          <ProgramOfferingPage programId={programId} />
        </div>
      ) : null}

      {!loading && !error && program && activeMainTab === "expenses" ? (
        <div className="mt-6">
          <ScopedExpensesTab scope="program" entityId={programId} entityLabel="program" />
        </div>
      ) : null}

      {!loading && !error && program && activeMainTab === "pledge" ? (
        <div className="mt-6">
          <ProgramPledgesTab programId={programId} programTitle={program?.title} />
        </div>
      ) : null}

      {!loading && !error && program && activeMainTab === "attendance" ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white">
          <div className="py-4 md:py-5 lg:py-6 px-4 md:px-6">
            <PageTabs
              tabs={[
                { key: "registration", label: "By Registration" },
                { key: "files", label: "File Upload" },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
              sticky={false}
            />

            {activeTab === "registration" ? (
              <div className="mt-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center justify-between gap-3 w-full md:w-auto md:block">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">By Registration</div>
                      <div className="text-gray-500 text-xs mt-0.5">Record and manage attendance collected for this program.</div>
                    </div>
                    {canEdit ? (
                    <button
                      type="button"
                      onClick={() => guarded(() => { setRegisterError(null); setRegisterOpen(true); })}
                      className="md:hidden inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 text-sm h-10"
                    >
                      Register
                    </button>
                    ) : null}
                  </div>
                  <FilterBar
                    searchValue={regSearch}
                    onSearchChange={(v) => setRegSearch(v)}
                    searchPlaceholder="Search name, email, phone"
                    searchWidth="md:w-[160px]"
                    selects={[]}
                    dateFrom={regDateFrom}
                    dateTo={regDateTo}
                    onDateApply={(from, to) => { setRegDateFrom(from); setRegDateTo(to); }}
                  >
                    {canEdit ? (
                    <button
                      type="button"
                      onClick={() => guarded(() => { setRegisterError(null); setRegisterOpen(true); })}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 text-sm h-10"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                        <path d="M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      Register
                    </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={onExportAttendees}
                      className="hidden md:inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm h-10"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                        <path d="M12 3v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M8 9l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 17v3h16v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      Export
                    </button>
                  </FilterBar>
                  <MobileFilterBar
                    searchValue={regSearch}
                    onSearchChange={(v) => setRegSearch(v)}
                    searchPlaceholder="Search name, email, phone"
                    dateFrom={regDateFrom}
                    dateTo={regDateTo}
                    onDateApply={(from, to) => { setRegDateFrom(from); setRegDateTo(to); }}
                    className="w-full"
                  />
                </div>

                <div className="mt-4 rounded-lg border border-gray-200 overflow-x-auto">
                  {attendeesLoading ? (
                    <table className="min-w-full">
                      <thead className="bg-white">
                        <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                          <th className="sticky left-0 z-20 bg-white max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">Name</th>
                          <th className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">Email</th>
                          <th className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">Phone</th>
                          <th className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">Location</th>
                          <th className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">Registration Date</th>
                          <th className="max-md:px-4 py-3 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {[0, 1, 2, 3].map((i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                            <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                            <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                            <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                            <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                            <td className="max-md:px-4 py-3 px-4 md:px-6"><div className="h-4 w-12 rounded bg-gray-200" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : attendeesError ? (
                    <div className="py-4 text-red-700 text-sm px-4 md:px-6">{attendeesError}</div>
                  ) : !filteredAttendees.length ? (
                    (() => {
                      const reason = resolveEmptyReason({ search: regSearch, dateFrom: regDateFrom, dateTo: regDateTo });
                      const isZero = reason === "zero";
                      const recovery = buildRecoveryActions(reason, {
                        onClearSearch: () => setRegSearch(""),
                        onClearDate: () => { setRegDateFrom(""); setRegDateTo(""); },
                      });
                      return (
                        <EmptyState
                          compact
                          illustration={isZero ? "attendees" : "search"}
                          title={isZero ? "No attendees yet" : "No attendees found"}
                          description={isZero
                            ? "People who register for this program will appear here."
                            : "We couldn't find any attendees matching your search or date range."}
                          actionLabel={recovery?.actionLabel}
                          onAction={recovery?.onAction}
                          secondaryLabel={recovery?.secondaryLabel}
                          onSecondary={recovery?.onSecondary}
                        />
                      );
                    })()
                  ) : (
                    <table className="min-w-full">
                      <thead className="bg-white">
                        <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                          <th className="sticky left-0 z-20 bg-white max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">Name</th>
                          <th className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">Email</th>
                          <th className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">Phone</th>
                          <th className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">Location</th>
                          <th className="max-md:px-4 py-3 whitespace-nowrap px-4 md:px-6">Registration Date</th>
                          <th className="max-md:px-4 py-3 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedAttendees.map((r, idx) => (
                          <tr key={r?._id || `att-${idx}`} className="max-md:text-xs text-gray-700 text-sm">
                            <td className="sticky left-0 z-10 bg-white max-md:px-4 py-2 text-gray-900 whitespace-nowrap px-4 md:px-6" title={r?.fullName || "—"}>
                              <span className="md:hidden">{truncateMobileName(r?.fullName)}</span>
                              <span className="hidden md:inline">{truncateDesktopName(r?.fullName)}</span>
                            </td>
                            <td className="max-md:px-4 py-2 text-gray-600 whitespace-nowrap px-4 md:px-6" title={r?.email || "—"}>
                              <span className="sm:hidden">{truncateMobileName(r?.email || "—")}</span>
                              <span className="hidden sm:inline">{truncateDesktopName(r?.email || "—")}</span>
                            </td>
                            <td className="max-md:px-4 py-2 text-gray-600 whitespace-nowrap px-4 md:px-6">{r?.phoneNumber || "—"}</td>
                            <td className="max-md:px-4 py-2 text-gray-600 whitespace-nowrap px-4 md:px-6" title={r?.location || "—"}>
                              <span className="sm:hidden">{truncateMobileName(r?.location || "—")}</span>
                              <span className="hidden sm:inline">{truncateDesktopName(r?.location || "—")}</span>
                            </td>
                            <td className="max-md:px-4 py-2 text-gray-600 whitespace-nowrap px-4 md:px-6">{formatDate(r?.registrationDate || r?.createdAt)}</td>
                            <td className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">
                              <TableKebabMenu items={[
                                canEdit && { label: "Edit", onClick: () => guarded(() => openEditAttendee(r)) },
                                canDelete && { label: "Delete", onClick: () => guarded(() => onDeleteAttendee(r)), danger: true }
                              ]} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <Pagination
                  pagination={attendeesPagination}
                  rowsCount={paginatedAttendees.length}
                  limit={regLimit}
                  onLimitChange={(n) => { setRegLimit(n); setRegPage(1); }}
                  onPageChange={setRegPage}
                  itemName="attendees"
                  filtered={Boolean(regSearch || regDateFrom || regDateTo)}
                  disabled={attendeesLoading}
                  className="border-t border-gray-100"
                />
              </div>
            ) : (
              <div className="mt-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center justify-between gap-3 w-full md:w-auto md:block">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">File Upload</div>
                      <div className="text-gray-500 text-xs mt-0.5">Upload attendance files from Excel, Word, PDF, or image formats.</div>
                    </div>
                    {canEdit ? (
                    <FileUploadButton
                      accept=".xlsx,.xls,.doc,.docx,.pdf,image/*"
                      disabled={fileUploading}
                      onFile={onUploadFile}
                      onClickIntercept={(open) => guarded(open)}
                      className="md:hidden inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60 text-sm h-10"
                    >
                      {fileUploading ? "Uploading..." : "Upload File"}
                    </FileUploadButton>
                    ) : null}
                  </div>
                  <FilterBar
                    searchValue={filesSearch}
                    onSearchChange={(v) => setFilesSearch(v)}
                    searchPlaceholder="Search file name"
                    searchWidth="md:w-[160px]"
                    selects={[]}
                    dateFrom={filesDateFrom}
                    dateTo={filesDateTo}
                    onDateApply={(from, to) => { setFilesDateFrom(from); setFilesDateTo(to); }}
                  >
                    {canEdit ? (
                    <FileUploadButton
                      accept=".xlsx,.xls,.doc,.docx,.pdf,image/*"
                      disabled={fileUploading}
                      onFile={onUploadFile}
                      onClickIntercept={(open) => guarded(open)}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60 text-sm h-10"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                        <path d="M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 17v3h16v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      {fileUploading ? "Uploading..." : "Upload File"}
                    </FileUploadButton>
                    ) : null}
                  </FilterBar>
                  <MobileFilterBar
                    searchValue={filesSearch}
                    onSearchChange={(v) => setFilesSearch(v)}
                    searchPlaceholder="Search file name"
                    dateFrom={filesDateFrom}
                    dateTo={filesDateTo}
                    onDateApply={(from, to) => { setFilesDateFrom(from); setFilesDateTo(to); }}
                    className="w-full"
                  />
                </div>

                {filesError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{filesError}</div>
                ) : null}

                <div className="mt-4 rounded-lg border border-gray-200">
                  {filesLoading ? (
                    <div className="divide-y divide-gray-200 animate-pulse">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="px-4 py-3 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-gray-200 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="h-4 w-40 rounded bg-gray-200" />
                            <div className="mt-1 h-3 w-28 rounded bg-gray-200" />
                          </div>
                          <div className="h-8 w-24 rounded bg-gray-200" />
                        </div>
                      ))}
                    </div>
                  ) : !filteredFiles.length ? (
                    (() => {
                      const reason = resolveEmptyReason({ search: filesSearch, dateFrom: filesDateFrom, dateTo: filesDateTo });
                      const isZero = reason === "zero";
                      const recovery = buildRecoveryActions(reason, {
                        onClearSearch: () => setFilesSearch(""),
                        onClearDate: () => { setFilesDateFrom(""); setFilesDateTo(""); },
                      });
                      return (
                        <EmptyState
                          compact
                          illustration={isZero ? "files" : "search"}
                          title={isZero ? "No uploaded files yet" : "No files found"}
                          description={isZero
                            ? "Files uploaded for this program will appear here."
                            : "We couldn't find any files matching your search or date range."}
                          actionLabel={recovery?.actionLabel}
                          onAction={recovery?.onAction}
                          secondaryLabel={recovery?.secondaryLabel}
                          onSecondary={recovery?.onSecondary}
                        />
                      );
                    })()
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {paginatedFiles.map((f, idx) => (
                        <div key={f?._id || `f-${idx}`} className="w-full px-3 py-2.5 hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-gray-900 truncate text-xs" title={f?.originalName || "—"}>{f?.originalName || "—"}</div>
                              <div className="text-gray-500 text-xs">
                                {guessFileType(f?.mimeType, f?.originalName)} · {formatBytes(f?.size)} · {formatDate(f?.createdAt)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                title="Preview"
                                onClick={() => setPreviewFile(f)}
                                className="cck-allow-icons h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                              >
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" /></svg>
                              </button>
                              {canEdit ? (
                                <button
                                  type="button"
                                  onClick={() => guarded(() => openEditFile(f))}
                                  className="rounded-lg bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 hover:bg-blue-100 text-xs"
                                >
                                  Edit
                                </button>
                              ) : null}
                              <button
                                type="button"
                                title="Download"
                                onClick={() => { if (!f?._id) return; const a = document.createElement("a"); a.href = getProgramAttendanceFileDownloadUrl(programId, f._id); a.download = f.originalName || "attendance_file"; a.target = "_blank"; a.rel = "noopener noreferrer"; a.click(); }}
                                className="cck-allow-icons h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                              >
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Pagination
                  pagination={filesPagination}
                  rowsCount={paginatedFiles.length}
                  limit={filesLimit}
                  onLimitChange={(n) => { setFilesLimit(n); setFilesPage(1); }}
                  onPageChange={setFilesPage}
                  itemName="files"
                  filtered={Boolean(filesSearch || filesDateFrom || filesDateTo)}
                  disabled={filesLoading}
                  className="border-t border-gray-100"
                />
              </div>
            )}
          </div>
        </div>
      ) : null}

      {previewFile ? (() => {
        const mime = String(previewFile?.mimeType || "").toLowerCase();
        const fname = String(previewFile?.originalName || "").toLowerCase();
        const isImage = mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(fname);
        const isPdf = mime === "application/pdf" || fname.endsWith(".pdf");
        const isText = mime.startsWith("text/") || /\.(csv|txt|log)$/.test(fname);
        const canEmbed = Boolean(previewFile?.url) && (isImage || isPdf || isText);
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => setPreviewFile(null)}>
            <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate text-sm" title={previewFile?.originalName || "—"}>{previewFile?.originalName || "File Preview"}</div>
                  <div className="mt-0.5 text-gray-500 text-xs">{guessFileType(previewFile?.mimeType, previewFile?.originalName)} · {formatBytes(previewFile?.size)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shrink-0"
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                {isImage && previewFile?.url ? (
                  <img src={previewFile.url} alt={previewFile?.originalName || "File preview"} className="mx-auto max-h-[65vh] rounded-lg" />
                ) : canEmbed ? (
                  <iframe src={previewFile.url} title={previewFile?.originalName || "File preview"} className="h-[65vh] w-full rounded-lg border border-gray-200 bg-gray-50" />
                ) : (
                  <div className="flex h-[40vh] flex-col items-center justify-center gap-3 text-center">
                    <div className="text-gray-600 text-sm">Preview is not available for this file type.</div>
                    {previewFile?._id ? (
                      <button
                        type="button"
                        onClick={() => { const a = document.createElement("a"); a.href = getProgramAttendanceFileDownloadUrl(programId, previewFile._id); a.download = previewFile.originalName || "attendance_file"; a.target = "_blank"; a.rel = "noopener noreferrer"; a.click(); }}
                        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 text-sm"
                      >
                        Download File
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })() : null}

      <SimpleModal
        open={editAttendeeOpen}
        title="Edit Attendee"
        onClose={closeEditAttendee}
      >
        <div className="flex max-h-[75vh] flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {editAttendeeError ? (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{editAttendeeError}</div>
            ) : null}

            <div className="grid grid-cols-1 gap-3">
              <input
                value={editAttendeeFullName}
                onChange={(e) => setEditAttendeeFullName(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="Full name"
              />
              <input
                value={editAttendeeEmail}
                onChange={(e) => setEditAttendeeEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="Email (optional)"
              />
              <PhoneNumberInput
                value={editAttendeePhone}
                onChange={setEditAttendeePhone}
                error={Boolean(editAttendeeError && String(editAttendeeError).toLowerCase().includes("invalid phone"))}
              />
              <input
                value={editAttendeeLocation}
                onChange={(e) => setEditAttendeeLocation(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="Location (optional)"
              />
              <div>
                <label className="block font-semibold text-gray-500 text-xs">Registration Date</label>
                <input
                  type="date"
                  value={editAttendeeRegDate}
                  onChange={(e) => setEditAttendeeRegDate(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeEditAttendee}
              disabled={editAttendeeSaving}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveEditAttendee}
              disabled={editAttendeeSaving}
              className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60 text-sm"
            >
              {editAttendeeSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </SimpleModal>


      <SimpleModal
        open={editFileOpen}
        title="Edit File"
        onClose={closeEditFile}
      >
        {editFileError ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{editFileError}</div>
        ) : null}

        <div className="grid grid-cols-1 gap-3">
          <input
            value={editFileName}
            onChange={(e) => setEditFileName(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            placeholder="File name"
          />

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="font-semibold text-gray-600 text-xs">Replace file (optional)</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="text-gray-600 truncate text-xs">{editFileReplacement?.name || "No file selected"}</div>
              <FileUploadButton
                accept=".xlsx,.xls,.doc,.docx,.pdf,image/*"
                disabled={editFileSaving}
                onFile={(f) => {
                  setEditFileReplacement(f || null);
                  if (!f) return;
                  const old = editFileRow?.originalName || "";
                  const current = String(editFileName || "");
                  if (!current.trim() || current === old) {
                    setEditFileName(f.name);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-xs"
              >
                Choose File
              </FileUploadButton>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeEditFile}
            disabled={editFileSaving}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSaveEditFile}
            disabled={editFileSaving}
            className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60 text-sm"
          >
            {editFileSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </SimpleModal>

      <SimpleModal
        open={registerOpen}
        title="Register Attendee"
        onClose={() => {
          if (registerSaving) return;
          setRegisterOpen(false);
          resetRegisterMemberSearch();
        }}
      >
        <div className="flex max-h-[75vh] flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {registerError ? (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{registerError}</div>
            ) : null}

            <div className="mb-4">
              <label className="block font-semibold text-gray-500 text-xs">Find a member or visitor</label>
              <div className="mt-0.5 text-gray-400 text-xs">Search for an existing member or visitor to autofill the details, or type the attendee's info manually below.</div>
              {regSelectedMember ? (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-blue-900 truncate text-sm">{regFullName || "—"}</div>
                    <div className="text-blue-700 truncate text-xs">
                      {`${regSelectedMember?._source === "visitor" ? "Visitor" : "Member"}${regSelectedMember?.phoneNumber || regSelectedMember?.email ? ` • ${regSelectedMember?.phoneNumber || regSelectedMember?.email}` : ""}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearRegisterMember}
                    className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-50 text-xs"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={regMemberQuery}
                    onChange={(e) => setRegMemberQuery(e.target.value)}
                    type="text"
                    className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                    placeholder="Search member or visitor by name, phone, email"
                  />
                  {String(regMemberQuery || "").trim() ? (
                    <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-gray-200">
                      {regMemberSearching ? (
                        <div className="px-4 py-3 text-gray-600 text-sm">Searching...</div>
                      ) : regMemberOptions.length ? (
                        <div className="divide-y divide-gray-200">
                          {regMemberOptions.map((m, idx) => {
                            const isVisitor = m?._source === "visitor";
                            const name = isVisitor
                              ? (m?.fullName || "—")
                              : (`${String(m?.firstName || "").trim()} ${String(m?.lastName || "").trim()}`.trim() || m?.fullName || "—");
                            const taken = isMemberTaken(m);
                            return (
                              <button
                                key={`${m?._source || "p"}-${m?._id ?? idx}`}
                                type="button"
                                disabled={taken}
                                onClick={() => selectRegisterMember(m)}
                                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 disabled:opacity-60 disabled:hover:bg-white disabled:cursor-not-allowed"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-semibold text-gray-900 truncate text-sm">{name}</div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`rounded-full px-2 py-0.5 font-semibold text-xs ${isVisitor ? "bg-yellow-50 text-yellow-700" : "bg-blue-50 text-blue-700"}`}>
                                      {isVisitor ? "Visitor" : "Member"}
                                    </span>
                                    {taken ? (
                                      <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-500 text-xs">Already added</span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="text-gray-500 truncate text-xs">{[m?.phoneNumber, m?.email].filter(Boolean).join(" • ")}</div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-gray-600 text-sm">No members or visitors found — fill the fields below to register them manually.</div>
                      )}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <input
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="Full name"
              />
              <input
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="Email (optional)"
              />
              <PhoneNumberInput
                value={regPhone}
                onChange={setRegPhone}
                error={Boolean(registerError && String(registerError).toLowerCase().includes("invalid phone"))}
              />
              <input
                value={regLocation}
                onChange={(e) => setRegLocation(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                placeholder="Location (optional)"
              />
              <div>
                <label className="block font-semibold text-gray-500 text-xs">Registration Date</label>
                <input
                  type="date"
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                />
              </div>
            </div>

            {registerQueue?.length ? (
              <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 font-semibold text-gray-600 text-xs">Queued Attendees</div>
                <div className="max-h-36 overflow-y-auto divide-y divide-gray-200">
                  {registerQueue.map((q) => (
                    <div key={q.id} className="flex items-center justify-between gap-3 px-4 py-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate text-sm">{q?.fullName || "—"}</div>
                        <div className="text-gray-600 truncate text-xs">{q?.phoneNumber || ""}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={registerSaving}
                          onClick={() => onEditQueuedAttendee(q)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                          aria-label="Edit"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                            <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                            <path d="M13 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          disabled={registerSaving}
                          onClick={() => setRegisterQueue((prev) => prev.filter((x) => x.id !== q.id))}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-60"
                          aria-label="Remove"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                            <path d="M4 7h16M9 7V5h6v2m-9 0 1 13h10l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setRegisterOpen(false); resetRegisterMemberSearch(); }}
              disabled={registerSaving}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onAddToRegisterQueue}
              disabled={registerSaving}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-sm"
            >
              Add Another
            </button>
            <button
              type="button"
              onClick={registerQueue?.length ? onRegisterAll : onRegister}
              disabled={registerSaving}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                registerQueue?.length ? "bg-blue-700 hover:bg-blue-800" : "bg-green-700 hover:bg-green-800"
              }`}
            >
              {registerSaving ? "Saving..." : registerQueue?.length ? "Register All" : "Register"}
            </button>
          </div>
        </div>
      </SimpleModal>

    </div>
  );
}

export default ProgramDetailsPage;
