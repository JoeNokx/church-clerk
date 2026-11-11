import { useState } from "react";
import { createMemberFollowUp, updateFollowUp } from "../../outreach/services/outreach.api.js";
import { MemberMultiPicker } from "../../budgeting/components/EntityPicker.jsx";
import { assigneeChips } from "../../../shared/utils/followUps.js";

const INP = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500";
const SEL = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500 bg-white";
const LBL = "block text-xs font-semibold text-gray-500 mb-1";

const METHOD_LABELS = {
  call: "Call", whatsapp: "WhatsApp", sms: "SMS", visit: "Visit",
  email: "Email", "in-person": "In-Person", "church-visit": "Church Visit",
  "personal-meeting": "Personal Meeting",
};

/**
 * Schedule / edit a follow-up for a member (e.g. an absentee check-in).
 * Uses the shared outreach follow-up engine — records created here show up
 * under Outreach → Follow-Ups with the member as the subject.
 */
export function MemberFollowUpForm({ member, followUp = null, defaultNotes = "", onClose, onSaved }) {
  const editing = followUp || null;
  const empty = { scheduledDate: "", type: "call", status: "pending", assignedTo: [], notes: defaultNotes, nextFollowUpDate: "" };
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
  const memberName = `${member?.firstName || ""} ${member?.lastName || ""}`.trim();

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
        await createMemberFollowUp(member?._id || member, payload);
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
          {memberName ? (
            <div>
              <label className={LBL}>Member</label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-800">{memberName}</div>
            </div>
          ) : null}
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
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="e.g. Called to check on her — recovering well" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 resize-none" />
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

export default MemberFollowUpForm;
