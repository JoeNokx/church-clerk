import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import PermissionContext from "../../permissions/permission.store.js";
import {
  getVisitorFollowUps,
  createVisitorFollowUp,
  updateFollowUp,
  deleteFollowUp,
} from "../services/attendance.api.js";
import { MemberMultiPicker } from "../../budgeting/components/EntityPicker.jsx";
import { assigneeNames, assigneeChips } from "../../../shared/utils/followUps.js";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import { FollowUpDetailsModal } from "../../outreach/components/tabs/FollowUpsTab.jsx";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";

const INP = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500";
const SEL = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500 bg-white";
const LBL = "block text-xs font-semibold text-gray-500 mb-1";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  contacted: "bg-blue-100 text-blue-700",
  "no-response": "bg-gray-100 text-gray-600",
  rescheduled: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  "not-interested": "bg-red-100 text-red-700",
  "connected-to-church": "bg-emerald-100 text-emerald-700",
};

const METHOD_LABELS = {
  call: "Call", whatsapp: "WhatsApp", sms: "SMS", visit: "Visit",
  email: "Email", "in-person": "In-Person", "church-visit": "Church Visit",
  "personal-meeting": "Personal Meeting",
};

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
      {String(status || "").replace(/-/g, " ") || "—"}
    </span>
  );
}

/**
 * Schedule / edit a follow-up for a visitor. Rendered standalone (row menu)
 * or from inside the Follow-Ups tab on the visitor details modal.
 */
export function VisitorFollowUpForm({ visitor, followUp = null, onClose, onSaved }) {
  const editing = followUp || null;
  const empty = { scheduledDate: "", type: "call", status: "pending", assignedTo: [], notes: "", nextFollowUpDate: "" };
  const [form, setForm] = useState(editing
    ? {
        scheduledDate: editing?.scheduledDate ? String(editing.scheduledDate).slice(0, 10) : "",
        type: editing?.type || "call",
        status: editing?.status || "pending",
        assignedTo: assigneeChips(editing),
        notes: editing?.notes || "",
        nextFollowUpDate: editing?.nextFollowUpDate ? String(editing.nextFollowUpDate).slice(0, 10) : "",
      }
    : empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.scheduledDate) { setFormError("Scheduled date is required."); return; }
    if (!form.assignedTo.length) { setFormError("Please assign at least one member."); return; }
    setSaving(true);
    setFormError("");
    const payload = {
      ...form,
      assignedTo: form.assignedTo.map((m) => m._id),
    };
    if (!payload.nextFollowUpDate) delete payload.nextFollowUpDate;
    try {
      if (editing) {
        await updateFollowUp(editing._id, payload);
      } else {
        await createVisitorFollowUp(visitor?._id || visitor, payload);
      }
      onSaved?.();
      onClose?.();
    } catch (e) {
      setFormError(e?.response?.data?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 overflow-y-auto">
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">{editing ? "Update Follow-Up" : "Schedule Follow-Up"}</h2>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Scheduled Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.scheduledDate} onChange={(e) => set("scheduledDate", e.target.value)} className={INP} />
            </div>
            <div>
              <label className={LBL}>Method</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={SEL}>
                {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={SEL}>
                {["pending", "contacted", "no-response", "rescheduled", "completed", "not-interested", "connected-to-church"].map((s) => (
                  <option key={s} value={s} className="capitalize">{s.replace(/-/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LBL}>Next Follow-Up</label>
              <input type="date" value={form.nextFollowUpDate} onChange={(e) => set("nextFollowUpDate", e.target.value)} className={INP} />
            </div>
          </div>
          <div>
            <label className={LBL}>Assigned To <span className="text-red-500">*</span></label>
            <MemberMultiPicker selected={form.assignedTo} onChange={(v) => set("assignedTo", v)} />
          </div>
          <div>
            <label className={LBL}>Notes / Outcome</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="What happened during this follow-up?" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          {formError ? <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{formError}</div> : null}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 shrink-0">
          <button onClick={onClose} className="h-11 rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="h-11 rounded-lg bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Saving…" : editing ? "Update" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Follow-up list for one visitor — shown as a tab on the visitor details
 * modal. Creating is done from the visitor row's ⋮ menu.
 */
export default function VisitorFollowUps({ visitorId }) {
  const { can } = useContext(PermissionContext) || {};
  const guarded = useGuardedAction();
  const canWrite = useMemo(() => (typeof can === "function" ? can("visitors", "update") : false), [can]);

  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    if (!visitorId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getVisitorFollowUps(visitorId);
      const payload = res?.data?.data ?? res?.data;
      setFollowUps(Array.isArray(payload) ? payload : payload?.followUps || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Follow-ups could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [visitorId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (fu) => {
    try {
      await deleteFollowUp(fu._id);
      await load();
    } catch { /* keep the row */ }
  };

  const isOverdue = (fu) =>
    ["pending", "no-response", "rescheduled"].includes(fu?.status) &&
    fu?.scheduledDate && new Date(fu.scheduledDate) < new Date(new Date().setHours(0, 0, 0, 0));

  if (loading) {
    return (
      <div className="animate-pulse space-y-2 py-1">
        {[0, 1].map((i) => <div key={i} className="h-14 rounded-lg bg-gray-100" />)}
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">{error}</div>;
  }

  return (
    <div>
      {!followUps.length ? (
        <EmptyState
          compact
          illustration="outreach"
          title="No follow-ups yet"
          description="Use the row menu (⋮) → Schedule Follow-Up to plan the first one."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full">
            <thead className="bg-slate-100">
              <tr className="text-left font-semibold text-gray-500 text-xs">
                <th className="py-2 whitespace-nowrap px-3">Date</th>
                <th className="py-2 whitespace-nowrap px-3">Method</th>
                <th className="py-2 whitespace-nowrap px-3">Status</th>
                <th className="py-2 whitespace-nowrap px-3">Assigned To</th>
                <th className="py-2 text-right whitespace-nowrap px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {followUps.map((fu) => (
                <tr key={fu._id} className={`text-gray-700 text-sm ${isOverdue(fu) ? "bg-red-50/40" : ""}`}>
                  <td className="py-2 whitespace-nowrap px-3">{fmtDate(fu.scheduledDate)}</td>
                  <td className="py-2 whitespace-nowrap px-3">{METHOD_LABELS[fu.type] || fu.type || "—"}</td>
                  <td className="py-2 whitespace-nowrap px-3"><StatusBadge status={fu.status} /></td>
                  <td className="py-2 whitespace-nowrap px-3" title={assigneeNames(fu) || "—"}>
                    <span className="sm:hidden">{truncateMobileName(assigneeNames(fu) || "—")}</span>
                    <span className="hidden sm:inline">{truncateDesktopName(assigneeNames(fu) || "—")}</span>
                  </td>
                  <td className="py-2 text-right whitespace-nowrap px-3">
                    <TableKebabMenu items={[
                      { label: "View", onClick: () => setViewing(fu) },
                      canWrite && { label: "Edit", onClick: () => guarded(() => setEditing(fu)) },
                      canWrite && fu.canDelete !== false && { label: "Delete", onClick: () => guarded(() => handleDelete(fu)), danger: true },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <VisitorFollowUpForm
          visitor={visitorId}
          followUp={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      ) : null}

      <FollowUpDetailsModal
        open={!!viewing}
        followUp={viewing}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}
