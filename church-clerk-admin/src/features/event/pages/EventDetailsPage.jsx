import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PermissionContext from "../../Permissions/permission.store.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import { getEvent as apiGetEvent } from "../services/event.api.js";
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

  const [totalsLoading, setTotalsLoading] = useState(false);
  const [totalsError, setTotalsError] = useState(null);
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
      const payload = res?.data?.data ?? res?.data;
      setAttendees(Array.isArray(payload?.attendees) ? payload.attendees : Array.isArray(res?.data?.attendees) ? res.data.attendees : []);
    } catch (err) {
      setAttendees([]);
      setAttendeesError(err?.response?.data?.message || err?.message || "Failed to fetch attendees");
    } finally {
      setAttendeesLoading(false);
    }
  }, [eventId]);

  const loadTotals = useCallback(async () => {
    if (!eventId) return;
    setTotalsLoading(true);
    setTotalsError(null);
    try {
      const res = await getAllTotalEventAttendances(eventId, { page: 1, limit: 50 });
      const payload = res?.data?.data ?? res?.data;
      setTotals(Array.isArray(payload?.attendances) ? payload.attendances : Array.isArray(res?.data?.attendances) ? res.data.attendances : []);
    } catch (err) {
      setTotals([]);
      setTotalsError(err?.response?.data?.message || err?.message || "Failed to fetch attendance records");
    } finally {
      setTotalsLoading(false);
    }
  }, [eventId]);

  const loadFiles = useCallback(async () => {
    if (!eventId) return;
    setFilesLoading(true);
    setFilesError(null);
    try {
      const res = await getEventAttendanceFiles(eventId);
      const payload = res?.data?.data ?? res?.data;
      setFiles(Array.isArray(payload?.files) ? payload.files : Array.isArray(res?.data?.files) ? res.data.files : []);
    } catch (err) {
      setFiles([]);
      setFilesError(err?.response?.data?.message || err?.message || "Failed to fetch uploaded files");
    } finally {
      setFilesLoading(false);
    }
  }, [eventId]);

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
  }, [eventId, activeMainTab, activeTab, loadAttendees, loadTotals, loadFiles]);

  const goBack = () => {
    const from = location?.state?.from;
    if (from === "programs-events") {
      toPage("programs-events");
      return;
    }
    navigate(-1);
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

  const tabClass = (key, isMain = false) => {
    const isActive = (isMain ? activeMainTab : activeTab) === key;
    return `flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
      isActive ? "bg-blue-100 text-blue-900" : "text-gray-600 hover:bg-gray-100"
    }`;
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:underline"
        >
          <span className="text-base leading-none">←</span>
          Back to Programs &amp; Events
        </button>
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
            <div>
              <div className="text-2xl font-semibold text-blue-900">{event?.title || "—"}</div>
              <div className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{event?.description || "—"}</div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-500">Date</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{formatRange(event?.dateFrom, event?.dateTo)}</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-500">Time</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{formatTimeRange(event?.timeFrom, event?.timeTo, event?.time)}</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-500">Venue</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{event?.venue || "—"}</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-500">Category</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{event?.category || "—"}</div>
                </div>
              </div>
            </div>

            {canEdit ? (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
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
          if (!eventId) return;
          try {
            const res = await apiGetEvent(eventId);
            const payload = res?.data?.data ?? res?.data;
            const e = payload?.event ?? payload;
            setEvent(e || null);
          } catch {
            // no-op
          }
        }}
      />

      {!loading && !error && event ? (
        <div className="mt-6 rounded-full bg-gray-100 p-1 flex items-center gap-2 max-w-md">
          <button type="button" onClick={() => setActiveMainTab("offering")} className={tabClass("offering", true)}>
            Offering
          </button>
          <button type="button" onClick={() => setActiveMainTab("attendance")} className={tabClass("attendance", true)}>
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
                  <div className="text-sm text-gray-600">View registered attendees and add new registrations</div>
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterError(null);
                      setRegisterOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                  >
                    <span className="text-lg leading-none">+</span>
                    Register
                  </button>
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
                            <td className="px-6 py-2 text-gray-900">{r?.fullName || "—"}</td>
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
                  <div className="text-sm text-gray-600">Record the total number of attendees without listing names</div>
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
                      {totalsLoading ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-sm text-gray-600">
                            Loading...
                          </td>
                        </tr>
                      ) : totalsError ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-sm text-red-700">
                            {totalsError}
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
                            <td className="px-6 py-2 text-gray-900">{formatDate(r?.date)}</td>
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
                  <div className="text-sm text-gray-600">Upload attendance files (Excel, Word, PDF, images)</div>
                  <FileUploadButton
                    accept=".xlsx,.xls,.doc,.docx,.pdf,image/*"
                    disabled={fileUploading}
                    onFile={onUploadFile}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                  >
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
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Size</th>
                        <th className="px-6 py-3">Uploaded</th>
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
                            <td className="px-6 py-2 text-gray-900">{f?.originalName || "—"}</td>
                            <td className="px-6 py-2 text-gray-600">{guessFileType(f?.mimeType, f?.originalName)}</td>
                            <td className="px-6 py-2 text-gray-600">{formatBytes(f?.size)}</td>
                            <td className="px-6 py-2 text-gray-600">{formatDate(f?.createdAt)}</td>
                            <td className="px-6 py-2">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!f?._id) return;
                                    window.open(getEventAttendanceFileDownloadUrl(eventId, f._id), "_blank", "noopener,noreferrer");
                                  }}
                                  className="text-green-700 hover:text-green-900"
                                >
                                  Download
                                </button>

                                {canDelete ? (
                                  <button
                                    type="button"
                                    onClick={() => onRenameFile(f)}
                                    className="text-gray-700 hover:text-gray-900"
                                  >
                                    Rename
                                  </button>
                                ) : null}

                                {canDelete ? (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteFile(f)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    Delete
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
            onClick={onRegister}
            disabled={registerSaving}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
          >
            {registerSaving ? "Saving..." : "Register"}
          </button>
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
