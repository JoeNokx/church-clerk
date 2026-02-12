import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getEvent as apiGetEvent } from "../services/event.api.js";
import PermissionContext from "../../permissions/permission.store.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import { createEventAttendee, getEventAttendees } from "../attendees/services/eventAttendees.api.js";
import { createTotalEventAttendance, getAllTotalEventAttendances } from "../attendances/services/eventAttendances.api.js";
import {
  deleteEventAttendanceFile,
  getEventAttendanceFileDownloadUrl,
  getEventAttendanceFiles,
  updateEventAttendanceFile,
  uploadEventAttendanceFile
} from "../attendanceFiles/services/eventAttendanceFiles.api.js";
import FileUploadButton from "../../../shared/components/FileUploadButton.jsx";
import EventCreatePage from "./EventCreatePage.jsx";
import EventOfferingPage from "../offerings/pages/EventOfferingPage.jsx";

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

function EventDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toPage } = useDashboardNavigator();
  const { can } = useContext(PermissionContext) || {};

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const eventId = params.get("id");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [event, setEvent] = useState(null);

  const [activeMainTab, setActiveMainTab] = useState("offering");
  const [activeTab, setActiveTab] = useState("registration");

  const canEdit = useMemo(() => (typeof can === "function" ? can("events", "update") : false), [can]);
  const canDelete = useMemo(() => (typeof can === "function" ? can("events", "delete") : false), [can]);

  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesError, setAttendeesError] = useState(null);
  const [attendees, setAttendees] = useState([]);

  const [totalLoading, setTotalLoading] = useState(false);
  const [totalError, setTotalError] = useState(null);
  const [totals, setTotals] = useState([]);

  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileUploading, setFileUploading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerSaving, setRegisterSaving] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regLocation, setRegLocation] = useState("");
  const [registerQueue, setRegisterQueue] = useState([]);

  const [recordOpen, setRecordOpen] = useState(false);
  const [recordSaving, setRecordSaving] = useState(false);
  const [recordError, setRecordError] = useState(null);
  const [recordDate, setRecordDate] = useState("");
  const [recordNumber, setRecordNumber] = useState("");
  const [recordSpeaker, setRecordSpeaker] = useState("");

  useEffect(() => {
    if (!eventId) {
      setError("Event id is missing");
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setEvent(null);

      try {
        const res = await apiGetEvent(eventId);
        const payload = res?.data?.data ?? res?.data;
        const e = payload?.event ?? payload;
        if (cancelled) return;
        setEvent(e || null);
      } catch (err) {
        if (cancelled) return;
        setError(err?.response?.data?.message || err?.message || "Failed to load event");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const loadAttendees = useCallback(async () => {
    if (!eventId) return;
    setAttendeesLoading(true);
    setAttendeesError(null);
    try {
      const res = await getEventAttendees(eventId, { page: 1, limit: 50 });
      setAttendees(Array.isArray(res?.data?.attendees) ? res.data.attendees : []);
    } catch (err) {
      setAttendees([]);
      setAttendeesError(err?.response?.data?.message || err?.message || "Failed to fetch attendees");
    } finally {
      setAttendeesLoading(false);
    }
  }, [eventId]);

  const loadTotals = useCallback(async () => {
    if (!eventId) return;
    setTotalLoading(true);
    setTotalError(null);
    try {
      const res = await getAllTotalEventAttendances(eventId, { page: 1, limit: 50 });
      setTotals(Array.isArray(res?.data?.attendances) ? res.data.attendances : []);
    } catch (err) {
      setTotals([]);
      setTotalError(err?.response?.data?.message || err?.message || "Failed to fetch attendance records");
    } finally {
      setTotalLoading(false);
    }
  }, [eventId]);

  const loadFiles = useCallback(async () => {
    if (!eventId) return;
    setFilesLoading(true);
    setFilesError(null);
    try {
      const res = await getEventAttendanceFiles(eventId);
      setFiles(Array.isArray(res?.data?.files) ? res.data.files : []);
    } catch (err) {
      setFiles([]);
      setFilesError(err?.response?.data?.message || err?.message || "Failed to fetch uploaded files");
    } finally {
      setFilesLoading(false);
    }
  }, [eventId]);

  const onDeleteFile = async (file) => {
    if (!eventId) return;
    if (!file?._id) return;
    if (!canDelete) return;

    const ok = window.confirm(`Delete file "${file?.originalName || ""}"?`);
    if (!ok) return;

    setFilesLoading(true);
    setFilesError(null);
    try {
      await deleteEventAttendanceFile(eventId, file._id);
      await loadFiles();
    } catch (err) {
      setFilesError(err?.response?.data?.message || err?.message || "Failed to delete file");
    } finally {
      setFilesLoading(false);
    }
  };

  const onAddToRegisterQueue = () => {
    if (!regFullName || !regPhone) {
      setRegisterError("Name and phone number are required.");
      return;
    }

    setRegisterError(null);
    setRegisterQueue((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        fullName: regFullName,
        email: regEmail || "",
        phoneNumber: regPhone,
        location: regLocation || ""
      }
    ]);
    setRegFullName("");
    setRegEmail("");
    setRegPhone("");
    setRegLocation("");
  };

  const onRegisterAll = async () => {
    if (!eventId) return;

    const queue = Array.isArray(registerQueue) ? [...registerQueue] : [];
    const hasCurrent = Boolean(String(regFullName || "").trim() || String(regPhone || "").trim() || String(regEmail || "").trim() || String(regLocation || "").trim());
    if (hasCurrent) {
      if (!regFullName || !regPhone) {
        setRegisterError("Name and phone number are required.");
        return;
      }
      queue.push({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        fullName: regFullName,
        email: regEmail || "",
        phoneNumber: regPhone,
        location: regLocation || ""
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
        await createEventAttendee(eventId, {
          fullName: item.fullName,
          email: item.email || undefined,
          phoneNumber: item.phoneNumber,
          location: item.location || undefined
        });
      }
      setRegisterOpen(false);
      setRegFullName("");
      setRegEmail("");
      setRegPhone("");
      setRegLocation("");
      setRegisterQueue([]);
      await loadAttendees();
    } catch (err) {
      setRegisterError(err?.response?.data?.message || err?.message || "Failed to register attendee(s)");
    } finally {
      setRegisterSaving(false);
    }
  };

  const onRenameFile = async (file) => {
    if (!eventId) return;
    if (!file?._id) return;
    if (!canDelete) return;

    const nextName = window.prompt("Rename file", file?.originalName || "");
    if (nextName === null) return;
    if (!String(nextName || "").trim()) return;

    setFilesLoading(true);
    setFilesError(null);
    try {
      await updateEventAttendanceFile(eventId, file._id, { originalName: String(nextName).trim() });
      await loadFiles();
    } catch (err) {
      setFilesError(err?.response?.data?.message || err?.message || "Failed to update file");
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    if (!eventId) return;
    if (activeMainTab !== "attendance") return;
    if (activeTab === "registration") {
      loadAttendees();
      return;
    }
    if (activeTab === "total") {
      loadTotals();
      return;
    }
    if (activeTab === "files") {
      loadFiles();
    }
  }, [activeMainTab, activeTab, eventId, loadAttendees, loadTotals, loadFiles]);

  const goBack = () => {
    const from = location?.state?.from;
    if (from === "dashboard") {
      toPage("dashboard");
      return;
    }
    if (from === "programs-events") {
      toPage("programs-events");
      return;
    }
    navigate(-1);
  };

  const onExportAttendees = () => {
    const rows = Array.isArray(attendees) ? attendees : [];
    const header = ["Name", "Email", "Phone", "Location"].join(",");
    const csv = [
      header,
      ...rows.map((r) => {
        const values = [r?.fullName || "", r?.email || "", r?.phoneNumber || "", r?.location || ""];
        return values
          .map((v) => {
            const str = String(v ?? "");
            const escaped = str.replaceAll('"', '""');
            return `"${escaped}"`;
          })
          .join(",");
      })
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event_attendees_${eventId || ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onRegister = async () => {
    if (!eventId) return;
    if (!regFullName || !regPhone) {
      setRegisterError("Name and phone number are required.");
      return;
    }

    setRegisterSaving(true);
    setRegisterError(null);
    try {
      await createEventAttendee(eventId, {
        fullName: regFullName,
        email: regEmail || undefined,
        phoneNumber: regPhone,
        location: regLocation || undefined
      });
      setRegisterOpen(false);
      setRegFullName("");
      setRegEmail("");
      setRegPhone("");
      setRegLocation("");
      await loadAttendees();
    } catch (err) {
      setRegisterError(err?.response?.data?.message || err?.message || "Failed to register attendee");
    } finally {
      setRegisterSaving(false);
    }
  };

  const onRecordTotal = async () => {
    if (!eventId) return;
    if (!recordDate || !recordNumber) {
      setRecordError("Date and total attendees are required.");
      return;
    }

    setRecordSaving(true);
    setRecordError(null);
    try {
      await createTotalEventAttendance(eventId, {
        date: recordDate,
        numberOfAttendees: Number(recordNumber),
        mainSpeaker: recordSpeaker || undefined
      });
      setRecordOpen(false);
      setRecordDate("");
      setRecordNumber("");
      setRecordSpeaker("");
      await loadTotals();
    } catch (err) {
      setRecordError(err?.response?.data?.message || err?.message || "Failed to record attendance");
    } finally {
      setRecordSaving(false);
    }
  };

  const onUploadFile = async (file) => {
    if (!eventId) return;
    if (!file) return;
    setFileUploading(true);
    setFilesError(null);
    try {
      await uploadEventAttendanceFile(eventId, file);
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

  const tabClass = (key) => {
    const isActive = activeTab === key;
    return `flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
      isActive ? "bg-blue-100 text-blue-900" : "text-gray-600 hover:bg-gray-100"
    }`;
  };

  const mainTabClass = (key) => {
    const isActive = activeMainTab === key;
    return `flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
      isActive ? "bg-blue-100 text-blue-900" : "text-gray-600 hover:bg-gray-100"
    }`;
  };

  const badge = formatShortMonthDay(event?.dateFrom);
  const organizerText =
    typeof event?.organizers === "string"
      ? event.organizers
      : Array.isArray(event?.organizers) && event.organizers.length
        ? event.organizers[0]
        : "—";

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
            Back to Programs &amp; Events
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        {loading ? (
          <div className="text-sm text-gray-600">Loading...</div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : !event ? (
          <div className="text-sm text-gray-600">No event found.</div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-5">
              <div className="h-20 w-20 rounded-2xl bg-purple-50 flex flex-col items-center justify-center">
                <div className="text-xs font-semibold text-purple-700">{badge.month}</div>
                <div className="text-2xl font-bold text-purple-800">{badge.day}</div>
              </div>

              <div className="min-w-0">
                <div className="text-2xl font-semibold text-blue-900">{event?.title || "—"}</div>
                <div className="mt-2 text-sm text-gray-600 max-w-3xl whitespace-pre-wrap">{event?.description || "—"}</div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">{event?.category || "Conference"}</span>
                  {event?.department?.name ? (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{event.department.name}</span>
                  ) : null}
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">{event?.status || "upcoming"}</span>
                </div>
              </div>
            </div>

            {canEdit ? (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M4 20h4l10.5-10.5a2.1 2.1 0 00-4-1L4 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Edit
              </button>
            ) : null}
          </div>
        )}
      </div>

      <EventCreatePage
        open={editOpen}
        mode="edit"
        eventId={eventId}
        onClose={() => setEditOpen(false)}
        onSuccess={async () => {
          setEditOpen(false);
          if (eventId) {
            try {
              const res = await apiGetEvent(eventId);
              const payload = res?.data?.data ?? res?.data;
              const e = payload?.event ?? payload;
              setEvent(e || null);
            } catch {
              // no-op
            }
          }
        }}
      />

      {!loading && !error && event ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-blue-100 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-700">
                  <path d="M7 3v3M17 3v3M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Date</div>
                <div className="mt-1 text-sm font-semibold text-blue-900">{formatRange(event?.dateFrom, event?.dateTo)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-purple-100 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-purple-700">
                  <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 22a10 10 0 100-20 10 10 0 000 20Z" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Time</div>
                <div className="mt-1 text-sm font-semibold text-blue-900">
                  {formatTimeRange(event?.timeFrom, event?.timeTo, event?.time)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-green-100 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-green-700">
                  <path d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M12 11a2 2 0 100-4 2 2 0 000 4Z" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Location</div>
                <div className="mt-1 text-sm font-semibold text-blue-900">{event?.venue || "—"}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-orange-100 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-orange-600">
                  <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500">Organizer</div>
                <div className="mt-1 text-sm font-semibold text-blue-900">{organizerText}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !error && event ? (
        <div className="mt-6 rounded-full bg-gray-100 p-1 flex items-center gap-2 max-w-md">
          <button type="button" onClick={() => setActiveMainTab("offering")} className={mainTabClass("offering")}>
            Offering
          </button>
          <button type="button" onClick={() => setActiveMainTab("attendance")} className={mainTabClass("attendance")}>
            Record Attendance
          </button>
        </div>
      ) : null}

      {!loading && !error && event && activeMainTab === "offering" ? (
        <div className="mt-6">
          <EventOfferingPage eventId={eventId} />
        </div>
      ) : null}

      {!loading && !error && event && activeMainTab === "attendance" ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-5">
            <div className="text-base font-semibold text-gray-900">Record Attendance</div>
            <div className="mt-1 text-sm text-gray-600">Choose a method to record event attendance</div>
          </div>

          <div className="px-6 py-5">
            <div className="rounded-full bg-gray-100 p-1 flex items-center gap-2">
              <button type="button" onClick={() => setActiveTab("registration")} className={tabClass("registration")}>
                By Registration
              </button>
              <button type="button" onClick={() => setActiveTab("total")} className={tabClass("total")}>
                Total Number
              </button>
              <button type="button" onClick={() => setActiveTab("files")} className={tabClass("files")}>
                File Upload
              </button>
            </div>

            {activeTab === "registration" ? (
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-gray-600">View registered members and add new registrations for this event</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onExportAttendees}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                        <path d="M12 3v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M8 9l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 17v3h16v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRegisterError(null);
                        setRegisterOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                        <path d="M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      Register
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-white">
                      <tr className="text-left text-xs font-semibold text-gray-500">
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Phone</th>
                        <th className="px-6 py-3">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {attendeesLoading ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-sm text-gray-600">
                            Loading...
                          </td>
                        </tr>
                      ) : attendeesError ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-sm text-red-700">
                            {attendeesError}
                          </td>
                        </tr>
                      ) : !attendees.length ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-sm text-gray-600">
                            No attendee found.
                          </td>
                        </tr>
                      ) : (
                        attendees.map((r, idx) => (
                          <tr key={r?._id || `att-${idx}`} className="text-sm text-gray-700">
                            <td className="px-6 py-2">
                              <button type="button" className="text-blue-700 hover:underline">
                                {r?.fullName || "—"}
                              </button>
                            </td>
                            <td className="px-6 py-2 text-gray-600">{r?.email || "—"}</td>
                            <td className="px-6 py-2 text-gray-600">{r?.phoneNumber || "—"}</td>
                            <td className="px-6 py-2 text-gray-600">{r?.location || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === "total" ? (
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-gray-600">Record the total number of attendees without listing individual names</div>
                  <button
                    type="button"
                    onClick={() => {
                      setRecordError(null);
                      setRecordOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                  >
                    <span className="text-lg leading-none">+</span>
                    Record Attendance
                  </button>
                </div>

                <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-white">
                      <tr className="text-left text-xs font-semibold text-gray-500">
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Total Attendees</th>
                        <th className="px-6 py-3">Main Speaker</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {totalLoading ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-sm text-gray-600">
                            Loading...
                          </td>
                        </tr>
                      ) : totalError ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-sm text-red-700">
                            {totalError}
                          </td>
                        </tr>
                      ) : !totals.length ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-sm text-gray-600">
                            No attendance found.
                          </td>
                        </tr>
                      ) : (
                        totals.map((r, idx) => (
                          <tr key={r?._id || `tot-${idx}`} className="text-sm text-gray-700">
                            <td className="px-6 py-2">
                              <button type="button" className="text-blue-700 hover:underline">
                                {formatDate(r?.date)}
                              </button>
                            </td>
                            <td className="px-6 py-2 text-gray-600">{Number(r?.numberOfAttendees || 0) || "—"}</td>
                            <td className="px-6 py-2 text-gray-600">{r?.mainSpeaker || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-gray-600">Upload attendance files from Excel, Word, or image formats</div>
                  <FileUploadButton
                    accept=".xlsx,.xls,.doc,.docx,.pdf,image/*"
                    disabled={fileUploading}
                    onFile={onUploadFile}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path d="M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 17v3h16v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    {fileUploading ? "Uploading..." : "Upload File"}
                  </FileUploadButton>
                </div>

                {filesError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{filesError}</div>
                ) : null}

                <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-white">
                      <tr className="text-left text-xs font-semibold text-gray-500">
                        <th className="px-6 py-3">File Name</th>
                        <th className="px-6 py-3">File Type</th>
                        <th className="px-6 py-3">File Size</th>
                        <th className="px-6 py-3">Uploaded On</th>
                        <th className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filesLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-sm text-gray-600">
                            Loading...
                          </td>
                        </tr>
                      ) : !files.length ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-sm text-gray-600">
                            No uploaded file found.
                          </td>
                        </tr>
                      ) : (
                        files.map((f, idx) => (
                          <tr key={f?._id || `f-${idx}`} className="text-sm text-gray-700">
                            <td className="px-6 py-2">
                              <button
                                type="button"
                                className="text-blue-700 hover:underline"
                                onClick={() => {
                                  if (!f?.url) return;
                                  window.open(f.url, "_blank", "noopener,noreferrer");
                                }}
                              >
                                {f?.originalName || "—"}
                              </button>
                            </td>
                            <td className="px-6 py-2 text-gray-600">{guessFileType(f?.mimeType, f?.originalName)}</td>
                            <td className="px-6 py-2 text-gray-600">{formatBytes(f?.size)}</td>
                            <td className="px-6 py-2 text-gray-600">{formatDate(f?.createdAt)}</td>
                            <td className="px-6 py-2">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!f?.url) return;
                                    window.open(f.url, "_blank", "noopener,noreferrer");
                                  }}
                                  className="text-blue-700 hover:text-blue-900"
                                  aria-label="View"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6Z" stroke="currentColor" strokeWidth="1.8" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!f?.url) return;
                                    const a = document.createElement("a");
                                    a.href = getEventAttendanceFileDownloadUrl(eventId, f._id);
                                    a.download = f.originalName || "attendance_file";
                                    a.target = "_blank";
                                    a.rel = "noopener noreferrer";
                                    a.click();
                                  }}
                                  className="text-green-700 hover:text-green-900"
                                  aria-label="Download"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                                    <path d="M12 3v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    <path d="M8 11l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M4 17v3h16v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                  </svg>
                                </button>

                                {canDelete ? (
                                  <button
                                    type="button"
                                    onClick={() => onRenameFile(f)}
                                    className="text-gray-700 hover:text-gray-900"
                                    aria-label="Edit"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                                      <path
                                        d="M4 20h4l10.5-10.5a2 2 0 000-2.8l-1.2-1.2a2 2 0 00-2.8 0L4 16v4Z"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinejoin="round"
                                      />
                                      <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    </svg>
                                  </button>
                                ) : null}

                                {canDelete ? (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteFile(f)}
                                    className="text-red-600 hover:text-red-800"
                                    aria-label="Delete"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                                      <path d="M6 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                      <path d="M10 11v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                      <path d="M14 11v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                      <path
                                        d="M9 7l1-2h4l1 2m-9 0l1 14h10l1-14"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <SimpleModal
        open={registerOpen}
        title="Register Attendee"
        onClose={() => {
          if (registerSaving) return;
          setRegisterOpen(false);
        }}
      >
        <div className="flex max-h-[75vh] flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {registerError ? (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{registerError}</div>
            ) : null}

            <div className="grid grid-cols-1 gap-3">
              <input
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                placeholder="Full name"
              />
              <input
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                placeholder="Email (optional)"
              />
              <input
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                placeholder="Phone number"
              />
              <input
                value={regLocation}
                onChange={(e) => setRegLocation(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                placeholder="Location (optional)"
              />
            </div>

            {registerQueue?.length ? (
              <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600">Queued Attendees</div>
                <div className="divide-y divide-gray-200">
                  {registerQueue.map((q) => (
                    <div key={q.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{q?.fullName || "—"}</div>
                        <div className="text-xs text-gray-600 truncate">{q?.phoneNumber || ""}</div>
                      </div>
                      <button
                        type="button"
                        disabled={registerSaving}
                        onClick={() => setRegisterQueue((prev) => prev.filter((x) => x.id !== q.id))}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        aria-label="Remove"
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                          <path d="M6 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRegisterOpen(false)}
              disabled={registerSaving}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onAddToRegisterQueue}
              disabled={registerSaving}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
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

      <SimpleModal
        open={recordOpen}
        title="Record Attendance"
        onClose={() => {
          if (recordSaving) return;
          setRecordOpen(false);
        }}
      >
        {recordError ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{recordError}</div>
        ) : null}
        <div className="grid grid-cols-1 gap-3">
          <input
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          />
          <input
            value={recordNumber}
            onChange={(e) => setRecordNumber(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            placeholder="Total attendees"
          />
          <input
            value={recordSpeaker}
            onChange={(e) => setRecordSpeaker(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            placeholder="Main speaker (optional)"
          />
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setRecordOpen(false)}
            disabled={recordSaving}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onRecordTotal}
            disabled={recordSaving}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
          >
            {recordSaving ? "Saving..." : "Record"}
          </button>
        </div>
      </SimpleModal>
    </div>
  );
}

export default EventDetailsPage;
