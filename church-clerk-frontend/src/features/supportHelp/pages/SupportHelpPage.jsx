import React, { useEffect, useMemo, useCallback, useState, useContext } from "react";
import { useLocation } from "react-router-dom";
import http from "../../../shared/services/http.js";
import { useAuth } from "../../auth/useAuth.js";
import ChurchContext from "../../church/church.store.js";
import Button from "../../../shared/components/Button/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";

function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return "—";
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }) {
  const map = {
    open: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-600"
  };
  const label = { open: "Open", in_progress: "In Progress", resolved: "Resolved", closed: "Closed" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {label[status] || status}
    </span>
  );
}

function HistoryTimeline({ history }) {
  if (!Array.isArray(history) || !history.length) return null;
  const typeLabel = {
    created: "Ticket Created",
    status_change: "Status Changed",
    user_response: "User Message",
    admin_response: "Admin Response",
    resolved: "Marked Resolved",
    closed: "Ticket Closed",
    reopened: "Ticket Reopened",
    rated: "Rated"
  };
  const typeColor = {
    created: "bg-blue-500",
    status_change: "bg-amber-500",
    user_response: "bg-indigo-500",
    admin_response: "bg-emerald-500",
    resolved: "bg-green-500",
    closed: "bg-gray-400",
    reopened: "bg-orange-500",
    rated: "bg-purple-500"
  };
  return (
    <div className="mt-4 space-y-3">
      {history.map((entry, idx) => (
        <div key={idx} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1.5 ${typeColor[entry.type] || "bg-gray-400"}`} />
            {idx < history.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
          </div>
          <div className="pb-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800 text-xs">{typeLabel[entry.type] || entry.type}</span>
              {entry.actorName && <span className="text-gray-500 text-xs">by {entry.actorName}</span>}
              <span className="text-gray-400 text-xs ml-auto">{formatDateTime(entry.createdAt)}</span>
            </div>
            {entry.content && (
              <div className="mt-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</div>
            )}
            {(entry.fromStatus || entry.toStatus) && !entry.content && (
              <div className="mt-1 text-xs text-gray-500">
                {entry.fromStatus && <span className="capitalize">{entry.fromStatus.replace("_", " ")}</span>}
                {entry.fromStatus && entry.toStatus && <span> → </span>}
                {entry.toStatus && <span className="capitalize">{entry.toStatus.replace("_", " ")}</span>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="cck-allow-icons text-2xl focus:outline-none transition-colors"
          aria-label={`Rate ${star} stars`}
        >
          <span className={(hover || value) >= star ? "text-amber-400" : "text-gray-300"}>★</span>
        </button>
      ))}
    </div>
  );
}

function TicketDetailView({ ticket, onBack, onUpdate }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");
  const [rating, setRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [reopenNote, setReopenNote] = useState("");
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isResolved = ticket.status === "resolved";
  const isClosed = ticket.status === "closed";

  const handleYes = async () => {
    if (!rating) { setConfirmMsg("Please select a star rating before closing."); return; }
    setSubmitting(true);
    setConfirmMsg("");
    try {
      const res = await http.post(`/support-requests/my/${ticket._id}/confirm`, {
        answer: "yes",
        rating,
        ratingFeedback: ratingFeedback.trim() || undefined
      }, { toastSuccess: false });
      onUpdate(res?.data?.supportRequest);
    } catch (e) {
      setConfirmMsg(e?.response?.data?.message || e?.message || "Failed to close ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNo = () => {
    setShowReopenForm(true);
    setConfirmMsg("");
  };

  const handleReopen = async () => {
    if (!reopenNote.trim()) { setConfirmMsg("Please describe what still needs help."); return; }
    setSubmitting(true);
    setConfirmMsg("");
    try {
      const res = await http.post(`/support-requests/my/${ticket._id}/confirm`, {
        answer: "no",
        reopenNote: reopenNote.trim()
      }, { toastSuccess: false });
      onUpdate(res?.data?.supportRequest);
      setShowReopenForm(false);
      setReopenNote("");
    } catch (e) {
      setConfirmMsg(e?.response?.data?.message || e?.message || "Failed to reopen ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
      <div className="flex items-start gap-3 justify-between flex-wrap">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1 text-blue-700 hover:underline text-sm font-medium"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back to My Tickets
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs bg-gray-100 rounded px-2 py-0.5 text-gray-600">{ticket.ticketNumber || "—"}</span>
            <StatusBadge status={ticket.status} />
          </div>
          <div className="mt-1 font-bold text-gray-900 text-base md:text-lg">{ticket.subject}</div>
          <div className="mt-0.5 text-xs text-gray-500">{ticket.category} · Submitted {formatDate(ticket.createdAt)}</div>
        </div>
      </div>

      {ticket.adminNote && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="font-semibold text-emerald-800 text-xs mb-1">Admin Note</div>
          <div className="text-sm text-emerald-900">{ticket.adminNote}</div>
        </div>
      )}

      {isResolved && !showReopenForm && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="font-semibold text-green-800 text-sm mb-1">Did this resolve your issue?</div>
          <div className="text-xs text-green-700 mb-3">Your feedback helps us improve support quality.</div>
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-700 mb-1">Rate your experience <span className="text-red-500">*</span></div>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <textarea
            value={ratingFeedback}
            onChange={(e) => setRatingFeedback(e.target.value)}
            placeholder="Optional feedback…"
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-200"
          />
          {confirmMsg && <div className="mt-2 text-sm text-red-600">{confirmMsg}</div>}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={submitting}
              onClick={handleYes}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-green-700"
            >
              {submitting ? "Closing…" : "Yes, Close Request"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleNo}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              No, Still Need Help
            </button>
          </div>
        </div>
      )}

      {isResolved && showReopenForm && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="font-semibold text-amber-800 text-sm mb-1">What still needs help?</div>
          <div className="text-xs text-amber-700 mb-2">Describe what wasn't resolved. Your original ticket will be reopened.</div>
          <textarea
            value={reopenNote}
            onChange={(e) => setReopenNote(e.target.value)}
            placeholder="Describe what still needs to be resolved…"
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
          />
          {confirmMsg && <div className="mt-2 text-sm text-red-600">{confirmMsg}</div>}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={handleReopen}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-amber-700"
            >
              {submitting ? "Reopening…" : "Reopen Request"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => { setShowReopenForm(false); setReopenNote(""); setConfirmMsg(""); }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isClosed && ticket.rating && (
        <div className="mt-4 rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 flex items-center gap-3">
          <div className="text-amber-400 text-xl">{"★".repeat(ticket.rating)}{"☆".repeat(5 - ticket.rating)}</div>
          {ticket.ratingFeedback && <div className="text-sm text-purple-800 italic">"{ticket.ratingFeedback}"</div>}
        </div>
      )}

      <div className="mt-6">
        <div className="font-semibold text-gray-900 text-sm mb-1">Activity Timeline</div>
        <div className="text-xs text-gray-500 mb-2">Chronological history of this ticket</div>
        <HistoryTimeline history={ticket.history} />
      </div>
    </div>
  );
}

function MyTicketsTab({ onViewTicket, focusTicketId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ totalResult: 0, totalPages: 1, currentPage: 1 });
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async ({ page = 1, status = statusFilter } = {}) => {
    setLoading(true);
    setError("");
    try {
      const res = await http.get("/support-requests/my", { params: { page, limit: 10, status }, toastError: false });
      const payload = res?.data;
      setTickets(Array.isArray(payload?.supportRequests) ? payload.supportRequests : []);
      setPagination(payload?.pagination || { totalResult: 0, totalPages: 1, currentPage: 1 });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load tickets.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load({ page: 1 }); }, [load]);

  useEffect(() => {
    if (!focusTicketId || !tickets.length) return;
    const found = tickets.find((t) => String(t._id) === String(focusTicketId));
    if (found) onViewTicket(found);
  }, [focusTicketId, tickets, onViewTicket]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 animate-pulse space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="font-semibold text-gray-900 text-sm">My Support Tickets</div>
          <div className="text-xs text-gray-500">{pagination.totalResult} ticket{pagination.totalResult !== 1 ? "s" : ""}</div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); load({ page: 1, status: e.target.value }); }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>}

      {!tickets.length ? (
        <EmptyState
          compact
          illustration={statusFilter ? "filters" : "support"}
          title={statusFilter ? "No tickets found" : "No support tickets yet"}
          description={statusFilter
            ? "We couldn't find any tickets matching the selected status."
            : "Submit a support request and your tickets will appear here."}
          actionLabel={statusFilter ? "Clear Filter" : null}
          onAction={statusFilter ? () => { setStatusFilter(""); load({ status: "" }); } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <button
              key={t._id}
              type="button"
              onClick={() => onViewTicket(t)}
              className="cck-allow-icons w-full text-left rounded-xl border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 px-4 py-3 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">{t.ticketNumber || "—"}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="mt-1 font-semibold text-gray-900 text-sm truncate">{t.subject}</div>
                  <div className="text-xs text-gray-500">{t.category} · {formatDate(t.createdAt)}</div>
                </div>
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-gray-400 shrink-0 mt-1"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={!pagination.hasPrev}
            onClick={() => load({ page: pagination.currentPage - 1 })}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 disabled:opacity-50"
          >Prev</button>
          <span className="text-xs text-gray-500">Page {pagination.currentPage} of {pagination.totalPages}</span>
          <button
            type="button"
            disabled={!pagination.hasNext}
            onClick={() => load({ page: pagination.currentPage + 1 })}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 disabled:opacity-50"
          >Next</button>
        </div>
      )}
    </div>
  );
}

function SupportHelpPage() {
  const location = useLocation();
  const { user } = useAuth();
  const churchCtx = useContext(ChurchContext);
  const activeChurch = churchCtx?.activeChurch;

  const supportEmails = useMemo(() => ["nokaeldev@gmail.com", "stephenui1864@gmail.com"], []);
  const supportPhones = useMemo(() => ["+233546022758", "+233548592769"], []);
  const whatsappPhone = useMemo(() => "+233546022758", []);

  const categories = useMemo(
    () => [
      "Account & Login",
      "Members",
      "Visitors",
      "Attendance",
      "Ministries",
      "Outreach",
      "Announcements",
      "Events and Programs",
      "Tithes",
      "Budgeting",
      "Church Projects",
      "Offerings and Seed",
      "Welfare",
      "Pledges",
      "Business Ventures",
      "Expenses",
      "Reports & Analytics",
      "Financial Statement",
      "Referral System",
      "Settings",
      "Branch",
      "User Roles & Permissions",
      "Church and User Profile",
      "Subscriptions & Billing",
      "Upload",
      "Technical Issue",
      "Data Import / Export",
      "Performance",
      "Security & Privacy",
      "Other"
    ],
    []
  );

  const autoName = useMemo(() => user?.fullName || "", [user?.fullName]);
  const autoChurchName = useMemo(() => activeChurch?.name || (typeof user?.church === "object" ? user?.church?.name : "") || "", [activeChurch?.name, user?.church]);

  const [pageTab, setPageTab] = useState("new");
  const [activeTicket, setActiveTicket] = useState(null);

  const [form, setForm] = useState({
    subject: "",
    category: categories[0] || "Other",
    churchName: "",
    name: "",
    description: ""
  });

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: autoName,
      churchName: autoChurchName
    }));
  }, [autoName, autoChurchName]);

  const [submitting, setSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submittedTicketNumber, setSubmittedTicketNumber] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = useCallback((idx) => {
    setOpenFaq((prev) => (prev === idx ? null : idx));
  }, []);

  const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const focusTicketId = urlParams.get("ticketId") || "";

  useEffect(() => {
    if (focusTicketId) {
      setPageTab("tickets");
    }
  }, [focusTicketId]);

  const handleViewTicket = useCallback(async (ticketOrId) => {
    if (typeof ticketOrId === "string") {
      try {
        const res = await http.get(`/support-requests/my/${ticketOrId}`, { toastError: false });
        setActiveTicket(res?.data?.supportRequest || null);
      } catch { void 0; }
      return;
    }
    if (ticketOrId?.history) {
      setActiveTicket(ticketOrId);
      return;
    }
    try {
      const res = await http.get(`/support-requests/my/${ticketOrId._id}`, { toastError: false });
      setActiveTicket(res?.data?.supportRequest || ticketOrId);
    } catch {
      setActiveTicket(ticketOrId);
    }
  }, []);

  useEffect(() => {
    if (focusTicketId && pageTab === "tickets" && !activeTicket) {
      void handleViewTicket(focusTicketId);
    }
  }, [focusTicketId, pageTab, activeTicket, handleViewTicket]);

  const faqs = useMemo(() => [
    {
      q: "Why can't I see action buttons (Add, Edit, Delete)?",
      a: "Your account may be deactivated or set to read-only by your administrator. Contact your church admin to activate your account or adjust your permissions."
    },
    {
      q: "Why do I see 'Read-only' when switching church context?",
      a: "As a Headquarters admin viewing a branch, your access is view-only. Only a branch admin can make changes to branch data directly."
    },
    {
      q: "How do I change my password?",
      a: "Click your avatar in the top-right corner, select 'Change Password', and follow the prompts. You will need your current password."
    },
    {
      q: "How do I add a new member?",
      a: "Go to Members from the sidebar, then click 'Add Member'. Fill in the required details and click 'Save'. The member will appear in your records immediately."
    },
    {
      q: "Why is my subscription showing as expired or suspended?",
      a: "Your trial or billing period may have ended. Go to Billing & Subscription in Settings to renew or upgrade your plan. During a grace period you can still view data."
    },
    {
      q: "How do I record tithes and offerings?",
      a: "Navigate to Tithes or Offerings from the Finance section in the sidebar. Use 'Add Record' to capture individual or aggregate contributions. You can also attach service type and offering type categories."
    },
    {
      q: "How do I export financial reports?",
      a: "Open Financial Statement or Reports & Analytics, set your desired period and filters, then click 'Export'. You can export as PDF or Excel. Make sure your role has export permissions."
    },
    {
      q: "How do I create an event or program?",
      a: "Go to Programs & Events from the sidebar and click 'Create Event'. Fill in the title, category, date range, time, and venue, then save. The event will appear in the Upcoming tab."
    },
    {
      q: "How do I manage groups, departments, and cells (Ministries)?",
      a: "Go to Ministries in the sidebar. Use the Groups, Departments, and Cells tabs to view and manage each type. Click 'Add' to create a new entry, or use Edit/Delete on any existing record."
    },
    {
      q: "How do I add a branch church?",
      a: "From your Headquarters account, go to Settings and navigate to the Branches section. Click 'Add Branch' and fill in the branch details. Branches can then be viewed from the header context switcher."
    },
    {
      q: "Why is attendance data not showing in charts?",
      a: "Charts require at least one attendance record to be saved. Make sure attendance has been recorded under the Attendance module. Data updates on the dashboard after records are added."
    },
    {
      q: "How do I record visitor information?",
      a: "Go to Attendance from the sidebar and switch to the Visitors tab. Click 'Add Visitor' to log a visitor's details. Visitor counts are tracked separately from regular member attendance."
    },
    {
      q: "Can I recover deleted records?",
      a: "Deleted records cannot be recovered from the system. Please exercise caution when deleting members, transactions, or events. Contact support immediately if a critical record was deleted by mistake."
    },
    {
      q: "How do I update church profile or settings?",
      a: "Go to Settings from the sidebar. You can update church details, currency, logo, and other preferences from the Church Profile tab. Changes take effect immediately."
    }
  ], []);

  useEffect(() => {
    if (!location?.hash) return;
    const id = location.hash.replace("#", "");
    if (!id) return;

    const el = document.getElementById(id);
    if (!el) return;

    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);

    return () => clearTimeout(t);
  }, [location?.hash]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitMessage("");
    setSubmittedTicketNumber("");

    if (!form.subject.trim() || !form.description.trim()) {
      setSubmitMessage("Please provide a subject and description.");
      setIsSubmitting(false);
      return;
    }

    try {
      setSubmitting(true);
      const res = await http.post("/support-requests", {
        subject: form.subject.trim(),
        category: form.category,
        churchName: form.churchName.trim(),
        name: form.name.trim(),
        description: form.description.trim()
      }, { toastSuccess: false });
      const tn = res?.data?.ticketNumber || "";
      setSubmittedTicketNumber(tn);
      setSubmitMessage(`Support request submitted${tn ? ` (${tn})` : ""}. We will get back to you shortly.`);
      setForm((prev) => ({
        ...prev,
        subject: "",
        description: "",
        churchName: "",
        name: ""
      }));
    } catch (err) {
      setSubmitMessage(err?.response?.data?.message || err?.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
      setIsSubmitting(false);
    }
  };

  if (activeTicket && pageTab === "tickets") {
    return (
      <div className="p-4 md:p-8 w-full overflow-x-hidden">
        <div className="max-w-5xl">
          <div className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Help &amp; Support</div>
          <div className="mt-4">
            <TicketDetailView
              ticket={activeTicket}
              onBack={() => { setActiveTicket(null); }}
              onUpdate={(updated) => setActiveTicket(updated)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 w-full overflow-x-hidden">
      <div className="max-w-5xl">
        <div className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Help &amp; Support</div>
        <div className="mt-1 text-gray-600 text-sm">
          Submit a request or reach out to us using the contact details below.
        </div>

        <div className="mt-4 flex items-center gap-1 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setPageTab("new")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${pageTab === "new" ? "border-blue-700 text-blue-800" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            New Request
          </button>
          <button
            type="button"
            onClick={() => { setActiveTicket(null); setPageTab("tickets"); }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${pageTab === "tickets" ? "border-blue-700 text-blue-800" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            My Tickets
          </button>
          <button
            type="button"
            onClick={() => setPageTab("faq")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${pageTab === "faq" ? "border-blue-700 text-blue-800" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            FAQ
          </button>
        </div>

        {pageTab === "tickets" && (
          <div className="mt-6">
            <MyTicketsTab
              onViewTicket={handleViewTicket}
              focusTicketId={focusTicketId}
            />
          </div>
        )}

        {pageTab === "faq" && (
          <div id="faq" className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8 overflow-hidden">
            <div className="font-semibold text-gray-900 text-sm">Frequently Asked Questions</div>
            <div className="mt-1 text-gray-500 text-xs">Click a question to expand the answer.</div>
            <div className="mt-4 divide-y divide-gray-100">
              {faqs.map((item, idx) => (
                <div key={idx}>
                  <button
                    type="button"
                    aria-label={`Toggle FAQ: ${item.q}`}
                    onClick={() => toggleFaq(idx)}
                    className="cck-allow-icons flex w-full items-center justify-between gap-4 py-4 text-left"
                    style={{ whiteSpace: "normal" }}
                  >
                    <span className="min-w-0 break-words font-semibold text-gray-900 text-sm">{item.q}</span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${openFaq === idx ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === idx ? "max-h-96" : "max-h-0"}`}>
                    <div className="pb-4 text-gray-600 text-sm leading-relaxed break-words">{item.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pageTab === "new" && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
            <div className="font-semibold text-gray-900 text-sm">Support Request</div>
            <div className="mt-1 text-gray-500 text-xs">
              Fields marked required should be filled before submitting.
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block font-medium text-gray-700 text-sm">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.subject}
                  onChange={(e) => setField("subject", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                  placeholder="E.g. Cannot export report"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 text-sm">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 text-sm">Church Name</label>
                  <input
                    value={form.churchName}
                    disabled
                    readOnly
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 text-sm">Name</label>
                  <input
                    value={form.name}
                    disabled
                    readOnly
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 text-sm">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                  placeholder="Describe the issue in detail..."
                />
              </div>

              {submitMessage ? (
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    submitMessage.toLowerCase().includes("submitted")
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {submitMessage}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  loadingText="Submitting…"
                  className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white disabled:opacity-60 text-sm"
                >
                  Submit
                </Button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
            <div className="font-semibold text-gray-900 text-sm">Contact Us</div>
            <div className="mt-1 text-gray-500 text-xs">Choose the fastest way to reach our support team.</div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-900 md:h-12 md:w-12">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">Email</div>
                    <div className="mt-1 text-gray-500 text-xs">Best for screenshots and detailed issues.</div>
                    <div className="mt-2 space-y-1 text-sm">
                      {supportEmails.map((email) => (
                        <div key={email} className="truncate">
                          <a className="text-blue-800 hover:underline" href={`mailto:${email}`}>
                            {email}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-900 md:h-12 md:w-12">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path
                        d="M8 3h8v4l-1 2v12H9V9L8 7V3Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <path d="M9 9h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">Phone</div>
                        <div className="mt-1 text-gray-500 text-xs">Sunday - Saturday, 9am - 6pm</div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      {supportPhones.map((phone) => (
                        <div key={phone} className="truncate">
                          <a className="text-blue-800 hover:underline" href={`tel:${phone}`}>
                            {phone}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-green-50 text-green-700 md:h-12 md:w-12">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                      <path d="M20.52 3.48A11.82 11.82 0 0 0 12 .02C5.37.02.02 5.37.02 12c0 2.11.55 4.16 1.6 5.98L0 24l6.19-1.62A11.9 11.9 0 0 0 12 23.98c6.63 0 11.98-5.35 11.98-11.98 0-3.2-1.25-6.21-3.46-8.52ZM12 21.9c-1.87 0-3.71-.5-5.32-1.44l-.38-.23-3.67.96.98-3.58-.25-.37A9.87 9.87 0 0 1 2.1 12C2.1 6.52 6.52 2.1 12 2.1c2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.91 7c0 5.48-4.42 9.9-9.9 9.9Zm5.73-7.42c-.31-.16-1.83-.9-2.12-1-.29-.1-.5-.16-.71.16-.21.31-.81 1-.99 1.2-.18.21-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.54-.92-.82-1.54-1.83-1.72-2.14-.18-.31-.02-.48.13-.63.14-.14.31-.36.46-.54.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.54-.08-.16-.71-1.71-.97-2.34-.26-.62-.53-.54-.71-.55h-.61c-.21 0-.54.08-.82.39-.28.31-1.08 1.06-1.08 2.59s1.1 3.01 1.25 3.22c.16.21 2.16 3.29 5.23 4.61.73.31 1.3.5 1.74.64.73.23 1.4.2 1.93.12.59-.09 1.83-.75 2.09-1.48.26-.73.26-1.35.18-1.48-.08-.13-.29-.21-.6-.36Z" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-sm">WhatsApp</div>
                    <div className="mt-1 text-gray-500 text-xs">Fastest response for quick questions.</div>
                    <a
                      className="mt-3 inline-flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-800 hover:bg-gray-50 text-sm"
                      href={`https://wa.me/${String(whatsappPhone || "").replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="truncate">Chat on WhatsApp ({whatsappPhone})</span>
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gray-500">
                        <path d="M7 17L17 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M10 7h7v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

      </div>
    </div>
  );
}

export default SupportHelpPage;
