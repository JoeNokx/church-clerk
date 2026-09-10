import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PermissionContext from "../../permissions/permission.store.js";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import BackButton from "../../../shared/components/BackButton/index.jsx";
import { PersonFormModal, ConvertModal } from "../components/tabs/PeopleReachedTab.jsx";
import { FollowUpFormModal } from "../components/tabs/FollowUpsTab.jsx";
import {
  getProspectById,
  deleteProspectDirect,
  deleteFollowUp,
  getOutreachEvents,
} from "../services/outreach.api.js";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";

const DECISION_LABELS = {
  none: "No Decision",
  firstTimeSalvation: "First-Time Salvation",
  rededication: "Rededication",
  baptismInterest: "Baptism Interest",
  churchVisit: "Church Visit",
};
const DECISION_STYLES = {
  none: "bg-gray-100 text-gray-500",
  firstTimeSalvation: "bg-green-100 text-green-700",
  rededication: "bg-blue-100 text-blue-700",
  baptismInterest: "bg-purple-100 text-purple-700",
  churchVisit: "bg-amber-100 text-amber-700",
};
const INTEREST_STYLES = { low: "bg-red-100 text-red-600", medium: "bg-amber-100 text-amber-700", high: "bg-green-100 text-green-700" };
const STAGE_LABELS = {
  reached: "Reached", contacted: "Contacted", interested: "Interested",
  "visited-church": "Visited Church", connected: "Connected",
  "new-believer": "New Believer", member: "Member",
};
const STAGE_STYLES = {
  reached: "bg-gray-200 text-gray-700", contacted: "bg-purple-100 text-purple-700",
  interested: "bg-blue-100 text-blue-700", "visited-church": "bg-cyan-100 text-cyan-700",
  connected: "bg-teal-100 text-teal-700", "new-believer": "bg-amber-100 text-amber-700",
  member: "bg-green-100 text-green-700",
};
const HOW_REACHED_LABELS = {
  street: "Street Outreach", "house-visit": "House Visit", referral: "Referral",
  online: "Online", phone: "Phone", event: "Event", other: "Other",
};
const EXISTING_CHURCH_LABELS = {
  none: "No Church", "another-church": "Another Church", lapsed: "Lapsed", unknown: "Unknown",
};
const PREFERRED_CONTACT_LABELS = {
  call: "Phone Call", whatsapp: "WhatsApp", sms: "SMS", visit: "Visit", email: "Email",
};
const PAGE_SIZE = 10;
const FOLLOWUP_TYPE_LABELS = { call: "Phone Call", visit: "Home Visit", text: "Text/SMS", email: "Email", "in-person": "In-Person" };
const FU_STATUS_LABELS = {
  pending: "Pending", contacted: "Contacted", "no-response": "No Response",
  rescheduled: "Rescheduled", completed: "Completed",
};
const FU_STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700", contacted: "bg-blue-100 text-blue-700",
  "no-response": "bg-gray-100 text-gray-600", rescheduled: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
};

function fmtDate(v) {
  if (!v) return "Not Specified";
  return new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
      <div className="mt-0.5 text-sm text-gray-800">{value || "Not Specified"}</div>
    </div>
  );
}

function Badge({ label, className }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{label}</span>;
}

export default function ProspectDetailsPage() {
  const { can } = useContext(PermissionContext) || {};
  const canWrite = typeof can === "function" ? can("outreach", "update") : false;
  const canDelete = typeof can === "function" ? can("outreach", "delete") : false;

  const { toPage } = useDashboardNavigator();
  const location = useLocation();
  const prospectId = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search]);
  const fromTab = useMemo(() => new URLSearchParams(location.search).get("from") || "people", [location.search]);

  const [prospect, setProspect] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fuModalOpen, setFuModalOpen] = useState(false);
  const [fuEditTarget, setFuEditTarget] = useState(null);
  const [fuDeleteTarget, setFuDeleteTarget] = useState(null);
  const [fuDeleting, setFuDeleting] = useState(false);
  const [followUpsPage, setFollowUpsPage] = useState(1);

  const backParams = useMemo(() => {
    const params = {};
    if (fromTab === "overview") params.defaultTab = "overview";
    else if (fromTab === "followups") params.defaultTab = "followups";
    else if (fromTab === "outreaches") params.defaultTab = "outreaches";
    else params.defaultTab = "people";
    return params;
  }, [fromTab]);

  const fetchAll = useCallback(async () => {
    if (!prospectId) return;
    setLoading(true);
    try {
      const res = await getProspectById(prospectId);
      const data = res?.data?.data || null;
      setProspect(data);
      setFollowUps(data?.followUps || []);
    } catch {
      setProspect(null);
    } finally {
      setLoading(false);
    }
  }, [prospectId]);

  useEffect(() => {
    fetchAll();
    getOutreachEvents({ limit: 100 }).then((r) => setEvents(r.data?.data || [])).catch(() => {});
  }, [fetchAll]);

  const handleDeleteConfirm = async () => {
    if (!prospect) return;
    setDeleting(true);
    try {
      await deleteProspectDirect(prospect._id);
      toPage("outreach", backParams);
    } catch { } finally { setDeleting(false); }
  };

  const handleFuDeleteConfirm = async () => {
    if (!fuDeleteTarget) return;
    setFuDeleting(true);
    try {
      await deleteFollowUp(fuDeleteTarget._id);
      setFuDeleteTarget(null);
      fetchAll();
    } catch { } finally { setFuDeleting(false); }
  };

  if (!prospectId) return (
    <div className="text-center py-20 text-gray-500">
      <p>No person selected.</p>
      <BackButton onClick={() => toPage("outreach", backParams)} className="mt-4 mb-0" />
    </div>
  );

  if (loading) return (
    <div className="max-w-4xl space-y-4">
      <div className="h-5 w-32 rounded bg-gray-100 animate-pulse" />
      <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
      <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
    </div>
  );

  if (!prospect) return (
    <div className="text-center py-20 text-gray-500">
      <p>Person not found.</p>
      <BackButton onClick={() => toPage("outreach", backParams)} className="mt-4 mb-0" />
    </div>
  );

  const fullName = `${prospect.firstName || ""} ${prospect.lastName || ""}`.trim();

  const followUpsTotalPages = Math.ceil(followUps.length / PAGE_SIZE);
  const paginatedFollowUps = followUps.slice((followUpsPage - 1) * PAGE_SIZE, followUpsPage * PAGE_SIZE);

  return (
    <div className="max-w-4xl">
      {/* Back */}
      <BackButton onClick={() => toPage("outreach", backParams)} />

      {/* Header Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-bold shrink-0">
              {(prospect.firstName?.[0] || "?").toUpperCase()}{(prospect.lastName?.[0] || "").toUpperCase()}
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-xl md:text-2xl">{fullName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge label={STAGE_LABELS[prospect.stage] || prospect.stage} className={STAGE_STYLES[prospect.stage] || "bg-gray-100 text-gray-600"} />
                {prospect.convertedToMember ? <Badge label="Converted to Member" className="bg-green-100 text-green-700" /> : null}
                {prospect.markedAsVisitor ? <Badge label="Marked as Visitor" className="bg-blue-100 text-blue-700" /> : null}
                <Badge label={DECISION_LABELS[prospect.decision] || prospect.decision} className={DECISION_STYLES[prospect.decision] || "bg-gray-100 text-gray-500"} />
                <Badge label={`Interest: ${prospect.interestLevel || "Not Specified"}`} className={INTEREST_STYLES[prospect.interestLevel] || "bg-gray-100 text-gray-500"} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setConvertOpen(true)} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-blue-700 hover:bg-blue-50 whitespace-nowrap">Connect</button>
            {canWrite ? (
              <button onClick={() => setEditOpen(true)} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 whitespace-nowrap">Edit</button>
            ) : null}
            {canDelete ? (
              <button onClick={() => setDeleteOpen(true)} className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            ) : null}
          </div>
        </div>

        {prospect.outreachEvent ? (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Outreach Event</div>
            <button
              type="button"
              onClick={() => toPage("outreach-event-details", { id: prospect.outreachEvent._id, from: fromTab })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" /></svg>
              {prospect.outreachEvent.title}
              {prospect.outreachEvent.date ? <span className="text-indigo-400">· {fmtDate(prospect.outreachEvent.date)}</span> : null}
            </button>
          </div>
        ) : null}
      </div>

      {/* Contact & Personal Info */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        <div className="font-semibold text-gray-800 text-sm mb-4">Contact & Personal Information</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Phone" value={prospect.phone} />
          <Field label="Alternative Phone" value={prospect.alternativePhone} />
          <Field label="Email" value={prospect.email} />
          <Field label="Gender" value={prospect.gender ? <span className="capitalize">{prospect.gender}</span> : ""} />
          <Field label="Age Group" value={prospect.ageGroup ? <span className="capitalize">{prospect.ageGroup}</span> : ""} />
          <Field label="Occupation" value={prospect.occupation} />
          <Field label="Address" value={prospect.address} />
          <Field label="Community" value={prospect.community} />
          <Field label="Preferred Contact" value={PREFERRED_CONTACT_LABELS[prospect.preferredContact] || prospect.preferredContact} />
        </div>
      </div>

      {/* Outreach & Spiritual Info */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        <div className="font-semibold text-gray-800 text-sm mb-4">Outreach & Spiritual Journey</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="How Reached" value={HOW_REACHED_LABELS[prospect.howReached] || prospect.howReached} />
          <Field label="Existing Church Status" value={EXISTING_CHURCH_LABELS[prospect.existingChurchStatus] || prospect.existingChurchStatus} />
          <Field label="Date Reached" value={fmtDate(prospect.dateReached)} />
          <Field label="Next Follow-Up Date" value={fmtDate(prospect.nextFollowUpDate)} />
          <Field label="Recorded By" value={prospect.recordedBy ? `${prospect.recordedBy.firstName || ""} ${prospect.recordedBy.lastName || ""}`.trim() : ""} />
          <Field label="Created" value={fmtDate(prospect.createdAt)} />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Spiritual Responses</div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "heardGospel", label: "Heard Gospel" },
              { key: "acceptedChrist", label: "Accepted Christ" },
              { key: "rededication", label: "Rededication" },
              { key: "wantsPrayer", label: "Wants Prayer" },
              { key: "wantsToVisitChurch", label: "Wants to Visit Church" },
              { key: "alreadyChristian", label: "Already Christian" },
              { key: "notInterested", label: "Not Interested" },
            ].map((item) => (
              <span
                key={item.key}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${prospect[item.key] ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}
              >
                {prospect[item.key] ? "✓ " : ""}{item.label}
              </span>
            ))}
          </div>
        </div>

        {prospect.notes ? (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{prospect.notes}</div>
          </div>
        ) : null}
      </div>

      {/* Assigned Workers */}
      {prospect.assignedFollowUpWorkers?.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
          <div className="font-semibold text-gray-800 text-sm mb-4">Assigned Follow-Up Workers</div>
          <div className="flex flex-wrap gap-2">
            {prospect.assignedFollowUpWorkers.map((w, i) => (
              <div key={i} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs">
                <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                  {(w.member?.firstName?.[0] || "?").toUpperCase()}
                </div>
                <span className="font-semibold text-gray-700">{w.member ? `${w.member.firstName || ""} ${w.member.lastName || ""}`.trim() : "Not Specified"}</span>
                {w.assignedAt ? <span className="text-gray-400">· {fmtDate(w.assignedAt)}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Integration Links */}
      {prospect.linkedMember || prospect.linkedVisitor ? (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
          <div className="font-semibold text-gray-800 text-sm mb-4">Church Integration</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prospect.linkedMember ? (
              <Field label="Linked Member" value={`${prospect.linkedMember.firstName || ""} ${prospect.linkedMember.lastName || ""}`.trim() + (prospect.linkedMember.memberId ? ` (${prospect.linkedMember.memberId})` : "")} />
            ) : null}
            {prospect.linkedVisitor ? (
              <Field label="Linked Visitor" value={prospect.linkedVisitor.fullName || "Not Specified"} />
            ) : null}
            {prospect.convertedAt ? <Field label="Converted At" value={fmtDate(prospect.convertedAt)} /> : null}
            {prospect.markedAsVisitorAt ? <Field label="Marked Visitor At" value={fmtDate(prospect.markedAsVisitorAt)} /> : null}
          </div>
        </div>
      ) : null}

      {/* Follow-Ups History */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="font-semibold text-gray-800 text-sm">Follow-Ups History ({followUps.length})</div>
          {canWrite ? (
            <button onClick={() => { setFuEditTarget(null); setFuModalOpen(true); }} className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-blue-700 hover:bg-blue-50">+ Schedule Follow-Up</button>
          ) : null}
        </div>
        {followUps.length === 0 ? (
          <div className="p-4 md:p-6 lg:p-8">
            <EmptyState
              compact
              illustration="followUps"
              title="No follow-ups yet"
              description="Schedule a follow-up to start tracking contact with this prospect."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                  <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Type</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Assigned To</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Notes</th>
                  <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedFollowUps.map((fu) => (
                  <tr key={fu._id} className="max-md:text-xs text-gray-700 text-sm">
                    <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtDate(fu.scheduledDate)}</td>
                    <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{FOLLOWUP_TYPE_LABELS[fu.type] || fu.type || "Not Specified"}</td>
                    <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                      <Badge label={FU_STATUS_LABELS[fu.status] || fu.status || "Not Specified"} className={FU_STATUS_STYLES[fu.status] || "bg-gray-100 text-gray-500"} />
                    </td>
                    <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">
                      {fu.assignedTo ? `${fu.assignedTo.firstName || ""} ${fu.assignedTo.lastName || ""}`.trim() : "Not Specified"}
                    </td>
                    <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6 truncate max-w-[16rem]">{fu.notes || "Not Specified"}</td>
                    <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                      <TableKebabMenu items={[
                        canWrite && { label: "Edit", onClick: () => { setFuEditTarget(fu); setFuModalOpen(true); } },
                        canDelete && { label: "Delete", onClick: () => setFuDeleteTarget(fu), danger: true }
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-end gap-3 px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => setFollowUpsPage(p => p - 1)}
            disabled={followUpsPage <= 1}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
          >
            Prev
          </button>
          <div className="text-gray-600 text-sm">Page {followUpsPage}</div>
          <button
            type="button"
            onClick={() => setFollowUpsPage(p => p + 1)}
            disabled={followUpsPage >= followUpsTotalPages}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 shadow-sm disabled:opacity-50 text-sm"
          >
            Next
          </button>
        </div>
      </div>

      {/* Modals */}
      <PersonFormModal
        open={editOpen}
        mode="edit"
        initialData={prospect}
        events={events}
        onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); fetchAll(); }}
      />
      <ConvertModal
        open={convertOpen}
        prospect={prospect}
        onClose={() => setConvertOpen(false)}
        onDone={() => { setConvertOpen(false); fetchAll(); }}
      />
      <FollowUpFormModal
        open={fuModalOpen}
        mode={fuEditTarget ? "edit" : "create"}
        prospects={prospect ? [prospect] : []}
        events={events}
        members={[]}
        defaultValues={prospect ? { prospect: prospect._id, outreachEvent: prospect.outreachEvent?._id || "" } : {}}
        initialData={fuEditTarget}
        onClose={() => { setFuModalOpen(false); setFuEditTarget(null); }}
        onSaved={() => { setFuModalOpen(false); setFuEditTarget(null); fetchAll(); }}
      />

      {/* Delete Prospect */}
      {deleteOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="font-semibold text-gray-900 text-sm mb-2">Remove {fullName}?</div>
            <p className="text-xs text-gray-400 mb-5">Their follow-up records will also be deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteOpen(false)} className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="flex-1 h-10 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete Follow-Up */}
      {fuDeleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="font-semibold text-gray-900 text-sm mb-2">Delete this follow-up?</div>
            <p className="text-xs text-gray-400 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setFuDeleteTarget(null)} className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleFuDeleteConfirm} disabled={fuDeleting} className="flex-1 h-10 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{fuDeleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
