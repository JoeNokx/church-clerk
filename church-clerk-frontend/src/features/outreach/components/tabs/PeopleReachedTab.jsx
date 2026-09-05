import { useCallback, useContext, useEffect, useRef, useState } from "react";
import PermissionContext from "../../../permissions/permission.store.js";
import EmptyState from "../../../../shared/components/EmptyState/index.jsx";
import {
  getAllProspects, createProspect, createProspectDirect, updateProspectDirect, deleteProspectDirect,
  checkDuplicate, convertToMember, markAsVisitor, getOutreachEvents,
} from "../../services/outreach.api.js";

const INP = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500";
const SEL = "w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500 bg-white";
const LBL = "block text-xs font-semibold text-gray-500 mb-1";

const STAGES = [
  { key: "reached", label: "Reached", color: "bg-gray-200 text-gray-700" },
  { key: "contacted", label: "Contacted", color: "bg-purple-100 text-purple-700" },
  { key: "interested", label: "Interested", color: "bg-blue-100 text-blue-700" },
  { key: "visited-church", label: "Visited Church", color: "bg-cyan-100 text-cyan-700" },
  { key: "connected", label: "Connected", color: "bg-teal-100 text-teal-700" },
  { key: "new-believer", label: "New Believer", color: "bg-amber-100 text-amber-700" },
  { key: "member", label: "Member", color: "bg-green-100 text-green-700" },
];

const DECISIONS = [
  { key: "none", label: "None" }, { key: "firstTimeSalvation", label: "First-Time Salvation" },
  { key: "rededication", label: "Rededication" }, { key: "baptismInterest", label: "Baptism Interest" },
  { key: "churchVisit", label: "Church Visit" },
];

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function StageBadge({ stage }) {
  const s = STAGES.find((x) => x.key === stage) || STAGES[0];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.color}`}>{s.label}</span>;
}

// ── Duplicate Alert ───────────────────────────────────────────────
function DuplicateAlert({ duplicates, onProceed, onCancel }) {
  if (!duplicates || duplicates.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-4">
      <div className="flex items-start gap-3">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-amber-600 shrink-0 mt-0.5"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        <div className="flex-1">
          <div className="font-semibold text-amber-800 text-sm mb-1">Possible duplicate detected</div>
          <div className="text-xs text-amber-700 space-y-1 mb-3">
            {duplicates.map((d) => (
              <div key={d._id} className="bg-amber-100 rounded-lg px-3 py-1.5">
                <span className="font-semibold">{d.firstName} {d.lastName}</span>
                {d.phone ? ` · ${d.phone}` : ""}
                {d.outreachEvent ? ` · ${d.outreachEvent.title}` : ""}
                <span className="ml-2 text-[10px] text-amber-600">{fmtDate(d.createdAt)}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="h-8 rounded-lg border border-amber-300 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-100">Go Back</button>
            <button onClick={onProceed} className="h-8 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700">Add Anyway</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Searchable event combobox (used inside PersonFormModal) ────────
function EventSearchSelect({ events, value, onChange }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = events.find((e) => e._id === value);
  const filtered = search
    ? events.filter((e) => e.title?.toLowerCase().includes(search.toLowerCase()))
    : events;

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        value={open ? search : (selected ? `${selected.title}${selected.date ? " — " + fmtDate(selected.date) : ""}` : "")}
        onChange={(e) => { setSearch(e.target.value); onChange(""); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search outreach event…"
        className={INP}
        autoComplete="off"
      />
      {open ? (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onChange(""); setSearch(""); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 border-b border-gray-100"
          >
            None — Walk-in / no event
          </button>
          {filtered.length > 0 ? filtered.map((ev) => (
            <button
              key={ev._id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(ev._id); setSearch(""); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${ev._id === value ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700"}`}
            >
              {ev.title}{ev.date ? ` — ${fmtDate(ev.date)}` : ""}
            </button>
          )) : (
            <div className="px-3 py-2 text-sm text-gray-400">No events match</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Person Form Modal ─────────────────────────────────────────────
export function PersonFormModal({ open, mode, initialData, events, defaultOutreachEventId, onClose, onSaved }) {
  const getEmpty = (defaultEventId) => ({
    outreachEvent: defaultEventId || "", firstName: "", lastName: "", phone: "", alternativePhone: "",
    email: "", gender: "", ageGroup: "", occupation: "", address: "", community: "",
    preferredContact: "call", howReached: "street", existingChurchStatus: "none",
    heardGospel: false, acceptedChrist: false, rededication: false,
    wantsPrayer: false, wantsToVisitChurch: false, alreadyChristian: false, notInterested: false,
    decision: "none", interestLevel: "medium", stage: "reached", notes: "",
  });
  const [form, setForm] = useState(getEmpty(defaultOutreachEventId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState(null);
  const [checkingDup, setCheckingDup] = useState(false);
  const [step, setStep] = useState("form"); // "form" | "duplicate"
  // "outreach" = linked to an event, "personal" = personal soul-winning (no event)
  const [sourceMode, setSourceMode] = useState("outreach");
  const dupTimer = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialData) {
      setForm({
        outreachEvent: initialData.outreachEvent?._id || initialData.outreachEvent || "",
        firstName: initialData.firstName || "", lastName: initialData.lastName || "",
        phone: initialData.phone || "", alternativePhone: initialData.alternativePhone || "",
        email: initialData.email || "", gender: initialData.gender || "",
        ageGroup: initialData.ageGroup || "", occupation: initialData.occupation || "",
        address: initialData.address || "", community: initialData.community || "",
        preferredContact: initialData.preferredContact || "call",
        howReached: initialData.howReached || "street",
        existingChurchStatus: initialData.existingChurchStatus || "none",
        heardGospel: !!initialData.heardGospel, acceptedChrist: !!initialData.acceptedChrist,
        rededication: !!initialData.rededication, wantsPrayer: !!initialData.wantsPrayer,
        wantsToVisitChurch: !!initialData.wantsToVisitChurch, alreadyChristian: !!initialData.alreadyChristian,
        notInterested: !!initialData.notInterested,
        decision: initialData.decision || "none", interestLevel: initialData.interestLevel || "medium",
        stage: initialData.stage || "reached", notes: initialData.notes || "",
      });
    } else { setForm(getEmpty(defaultOutreachEventId)); }
    setSourceMode("outreach");
    setDuplicates(null); setStep("form"); setError("");
  }, [open, mode, initialData, defaultOutreachEventId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k) => setForm((f) => ({ ...f, [k]: !f[k] }));

  const runDupCheck = useCallback(async (phone, email, firstName, lastName) => {
    if (!phone && !email && (!firstName || !lastName)) return;
    setCheckingDup(true);
    try {
      const res = await checkDuplicate({ phone: phone || undefined, email: email || undefined, firstName: firstName || undefined, lastName: lastName || undefined });
      const found = res?.data?.data || [];
      if (mode === "edit" && initialData?._id) {
        setDuplicates(found.filter((d) => d._id !== initialData._id));
      } else {
        setDuplicates(found);
      }
    } catch { setDuplicates(null); } finally { setCheckingDup(false); }
  }, [mode, initialData]);

  const handlePhoneChange = (v) => {
    set("phone", v);
    clearTimeout(dupTimer.current);
    dupTimer.current = setTimeout(() => runDupCheck(v, form.email, form.firstName, form.lastName), 600);
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim()) { setError("First name is required."); return; }
    if (mode === "create" && duplicates && duplicates.length > 0 && step !== "duplicate") {
      setStep("duplicate"); return;
    }
    setSaving(true); setError("");
    try {
      if (mode === "edit") {
        const { outreachEvent, ...rest } = form;
        await updateProspectDirect(initialData._id, rest);
      } else if (form.outreachEvent) {
        await createProspect(form.outreachEvent, form);
      } else {
        await createProspectDirect(form);
      }
      onSaved?.();
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[93vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">
            {mode === "edit"
              ? (defaultOutreachEventId ? "Edit Person Details" : "Edit Person")
              : "Record Person Reached"}
          </h2>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {mode === "create" && step === "duplicate" && duplicates?.length > 0 ? (
            <DuplicateAlert duplicates={duplicates} onProceed={() => { setStep("form"); handleSubmit(); }} onCancel={() => setStep("form")} />
          ) : null}

          {/* Outreach Connection */}
          {mode === "create" && defaultOutreachEventId ? (
            /* ── Inside outreach detail page: locked to this event ── */
            <div>
              <label className={LBL}>Outreach Event</label>
              <input
                disabled
                value={
                  events[0]?.title
                    ? `${events[0].title}${events[0].date ? " — " + fmtDate(events[0].date) : ""}`
                    : "Current outreach"
                }
                className="w-full h-11 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 cursor-not-allowed select-none"
              />
              <p className="mt-1 text-[11px] text-gray-400">Automatically linked to this outreach — cannot be changed here</p>
            </div>
          ) : mode === "create" ? (
            /* ── People Reached tab: choose source ── */
            <div>
              <label className={LBL}>Outreach Connection <span className="text-gray-400 font-normal">(optional)</span></label>
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                {[
                  { value: "outreach", label: "Outreach Event", desc: "Linked to a formal outreach" },
                  { value: "personal", label: "Personal Soul-Winning", desc: "Won individually, outside an event" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${sourceMode === opt.value ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    <input
                      type="radio"
                      className="mt-0.5 accent-blue-600 shrink-0"
                      checked={sourceMode === opt.value}
                      onChange={() => {
                        setSourceMode(opt.value);
                        if (opt.value === "personal") set("outreachEvent", "");
                      }}
                    />
                    <div>
                      <div className="text-xs font-semibold text-gray-700">{opt.label}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              {sourceMode === "outreach" ? (
                <EventSearchSelect
                  events={events}
                  value={form.outreachEvent}
                  onChange={(id) => set("outreachEvent", id)}
                />
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <p className="text-sm font-medium text-gray-600">Personal Soul-Winning</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    This person was reached by a church member personally — e.g. at work, in the community, through a conversation — and is not tied to any organised outreach event.
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>First Name <span className="text-red-500">*</span></label>
              <input value={form.firstName} onChange={(e) => { set("firstName", e.target.value); clearTimeout(dupTimer.current); dupTimer.current = setTimeout(() => runDupCheck(form.phone, form.email, e.target.value, form.lastName), 700); }} placeholder="First name" className={INP} />
            </div>
            <div>
              <label className={LBL}>Last Name</label>
              <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Last name" className={INP} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Phone {checkingDup ? <span className="text-blue-500 text-[10px] ml-1">Checking…</span> : null}</label>
              <input value={form.phone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="e.g. 0244123456" className={INP} />
            </div>
            <div>
              <label className={LBL}>Alt. Phone</label>
              <input value={form.alternativePhone} onChange={(e) => set("alternativePhone", e.target.value)} placeholder="Alternative number" className={INP} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Email</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@example.com" className={INP} />
            </div>
            <div>
              <label className={LBL}>Occupation</label>
              <input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} placeholder="e.g. Teacher" className={INP} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LBL}>Gender</label>
              <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={SEL}>
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={LBL}>Age Group</label>
              <select value={form.ageGroup} onChange={(e) => set("ageGroup", e.target.value)} className={SEL}>
                <option value="">—</option>
                <option value="child">Child</option>
                <option value="teenager">Teenager</option>
                <option value="youth">Youth</option>
                <option value="adult">Adult</option>
                <option value="elderly">Elderly</option>
              </select>
            </div>
            <div>
              <label className={LBL}>Interest Level</label>
              <select value={form.interestLevel} onChange={(e) => set("interestLevel", e.target.value)} className={SEL}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Community / Area</label>
              <input value={form.community} onChange={(e) => set("community", e.target.value)} placeholder="Neighborhood reached" className={INP} />
            </div>
            <div>
              <label className={LBL}>How Reached</label>
              <select value={form.howReached} onChange={(e) => set("howReached", e.target.value)} className={SEL}>
                <option value="street">Street</option>
                <option value="house-visit">House Visit</option>
                <option value="referral">Referral</option>
                <option value="online">Online</option>
                <option value="phone">Phone</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Preferred Contact</label>
              <select value={form.preferredContact} onChange={(e) => set("preferredContact", e.target.value)} className={SEL}>
                <option value="call">Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="visit">Visit</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div>
              <label className={LBL}>Church Status</label>
              <select value={form.existingChurchStatus} onChange={(e) => set("existingChurchStatus", e.target.value)} className={SEL}>
                <option value="none">None / Unchurched</option>
                <option value="another-church">Another Church</option>
                <option value="lapsed">Lapsed Christian</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>

          {/* Spiritual Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Spiritual Response</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { key: "heardGospel", label: "Heard Gospel" },
                { key: "acceptedChrist", label: "Accepted Christ" },
                { key: "rededication", label: "Rededication" },
                { key: "wantsPrayer", label: "Wants Prayer" },
                { key: "wantsToVisitChurch", label: "Wants to Visit Church" },
                { key: "alreadyChristian", label: "Already Christian" },
                { key: "notInterested", label: "Not Interested" },
              ].map(({ key, label }) => (
                <label key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${form[key] ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input type="checkbox" checked={!!form[key]} onChange={() => toggle(key)} className="h-3.5 w-3.5 rounded accent-blue-600" />
                  <span className="text-xs font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Journey Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Journey Stage</label>
              <select value={form.stage} onChange={(e) => set("stage", e.target.value)} className={SEL}>
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LBL}>Decision</label>
              <select value={form.decision} onChange={(e) => set("decision", e.target.value)} className={SEL}>
                {DECISIONS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={LBL}>Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Additional notes about this person…" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          {mode === "create" && duplicates && duplicates.length > 0 && step === "form" ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ Possible duplicate found. Review before saving.
            </div>
          ) : null}
          {error ? <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 shrink-0">
          <button onClick={onClose} className="h-11 rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="h-11 rounded-lg bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Record Person"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Convert Modal ─────────────────────────────────────────────────
function ConvertModal({ open, prospect, onClose, onDone }) {
  const [mode, setMode] = useState(""); // "member" | "visitor"
  const [dateJoined, setDateJoined] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceType, setServiceType] = useState("Sunday Service");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setMode(""); setDateJoined(""); setServiceDate(""); setError(""); } }, [open]);

  if (!open || !prospect) return null;

  const handleConvert = async () => {
    setSaving(true); setError("");
    try {
      if (mode === "member") {
        await convertToMember(prospect._id, { dateJoined: dateJoined || undefined });
      } else {
        await markAsVisitor(prospect._id, { serviceDate: serviceDate || undefined, serviceType });
      }
      onDone?.();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <div className="font-semibold text-gray-900 text-sm mb-4">
          Connect {prospect.firstName} {prospect.lastName}
        </div>
        <div className="space-y-2 mb-4">
          <button onClick={() => setMode("member")} className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${mode === "member" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
            <div className="h-9 w-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5"><path d="M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.8" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">Convert to Member</div>
              <div className="text-xs text-gray-500">Create a new member record</div>
            </div>
          </button>
          <button onClick={() => setMode("visitor")} className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${mode === "visitor" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
            <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" /><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">Mark as Visitor</div>
              <div className="text-xs text-gray-500">Record as a church visitor</div>
            </div>
          </button>
        </div>
        {mode === "member" ? (
          <div className="mb-4">
            <label className={LBL}>Date Joined (optional)</label>
            <input type="date" value={dateJoined} onChange={(e) => setDateJoined(e.target.value)} className={INP} />
          </div>
        ) : mode === "visitor" ? (
          <div className="space-y-3 mb-4">
            <div>
              <label className={LBL}>Service Type</label>
              <input value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="e.g. Sunday Service" className={INP} />
            </div>
            <div>
              <label className={LBL}>Service Date</label>
              <input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className={INP} />
            </div>
          </div>
        ) : null}
        {error ? <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mb-3">{error}</div> : null}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleConvert} disabled={!mode || saving} className="flex-1 h-10 rounded-lg bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Processing…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Person Row ────────────────────────────────────────────────────
function PersonRow({ person, onEdit, onConvert, onDelete, canWrite, canDelete }) {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 text-xs font-bold">
        {(person.firstName?.[0] || "?").toUpperCase()}{(person.lastName?.[0] || "").toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">{person.firstName} {person.lastName}</span>
          <StageBadge stage={person.stage} />
          {person.convertedToMember ? <span className="rounded-full bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5">Member</span> : null}
          {person.markedAsVisitor ? <span className="rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5">Visitor</span> : null}
        </div>
        {(person.community || person.address) ? (
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-gray-400 shrink-0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" /></svg>
            <span>{person.community || person.address}</span>
          </div>
        ) : null}
        <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-3">
          {person.phone ? <span>{person.phone}</span> : null}
          {person.outreachEvent?.title ? <span>{person.outreachEvent.title}</span> : null}
          <span>{fmtDate(person.createdAt)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {canWrite && !person.convertedToMember && !person.markedAsVisitor ? (
          <button onClick={() => onConvert(person)} className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-blue-700 hover:bg-blue-50">Connect</button>
        ) : null}
        {canWrite ? (
          <button onClick={() => onEdit(person)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        ) : null}
        {canDelete ? (
          <button onClick={() => onDelete(person)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────
export default function PeopleReachedTab() {
  const { can } = useContext(PermissionContext) || {};
  const canCreate = typeof can === "function" ? can("outreach", "create") : false;
  const canWrite = typeof can === "function" ? can("outreach", "update") : false;
  const canDelete = typeof can === "function" ? can("outreach", "delete") : false;

  const [prospects, setProspects] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({ search: "", stage: "", eventId: "" });

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingPerson, setEditingPerson] = useState(null);
  const [convertTarget, setConvertTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProspects = useCallback(async (page = 1, overrides = {}) => {
    setLoading(true);
    try {
      const params = { page, limit: 25, ...filters, ...overrides };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const res = await getAllProspects(params);
      setProspects(res.data?.data || []);
      setPagination(res.data?.pagination || { page: 1, total: 0, pages: 1 });
    } catch { setProspects([]); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => {
    fetchProspects();
    getOutreachEvents({ limit: 100 }).then((r) => setEvents(r.data?.data || [])).catch(() => {});
  }, []);

  const handleFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    const p = { ...next }; Object.keys(p).forEach((k) => { if (!p[k]) delete p[k]; });
    fetchProspects(1, p);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteProspectDirect(deleteTarget._id); setDeleteTarget(null); fetchProspects(pagination.page); }
    catch { } finally { setDeleting(false); }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2 flex-1">
          <input value={filters.search} onChange={(e) => handleFilter("search", e.target.value)} placeholder="Search by name or phone…" className="h-9 flex-1 min-w-44 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:border-blue-500" />
          <select value={filters.stage} onChange={(e) => handleFilter("stage", e.target.value)} className="h-9 rounded-lg border border-gray-200 px-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500 bg-white">
            <option value="">All Stages</option>
            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select value={filters.eventId} onChange={(e) => handleFilter("eventId", e.target.value)} className="h-9 rounded-lg border border-gray-200 px-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500 bg-white">
            <option value="">All Events</option>
            {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
          </select>
        </div>
        {canCreate ? (
          <button onClick={() => { setEditingPerson(null); setFormMode("create"); setFormOpen(true); }} className="h-9 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Record Person
          </button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">People Reached</span>
          <span className="text-xs text-gray-400">{pagination.total} total</span>
        </div>
        {loading ? (
          <div className="divide-y divide-gray-100">
            {[0,1,2,3,4].map(i => <div key={i} className="h-16 px-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gray-100 animate-pulse" />
              <div className="flex-1 space-y-1.5"><div className="h-3 bg-gray-100 rounded animate-pulse w-48" /><div className="h-2.5 bg-gray-100 rounded animate-pulse w-32" /></div>
            </div>)}
          </div>
        ) : prospects.length === 0 ? (
          (() => {
            const hasFilters = !!(filters.search || filters.stage || filters.eventId);
            return (
              <EmptyState
                illustration={hasFilters ? "search" : "peopleReached"}
                title={hasFilters ? "No people found" : "No people recorded yet"}
                description={hasFilters
                  ? "We couldn't find anyone matching your filters."
                  : "Record the first person reached during an outreach."}
                actionLabel={hasFilters ? "Clear Filters" : (canWrite ? "Add Person" : null)}
                onAction={hasFilters ? () => setFilters({ search: "", stage: "", eventId: "" }) : (canWrite ? () => { setEditingPerson(null); setFormMode("create"); setFormOpen(true); } : undefined)}
              />
            );
          })()
        ) : (
          <div className="divide-y divide-gray-100">
            {prospects.map((p) => (
              <PersonRow
                key={p._id} person={p}
                onEdit={(x) => { setEditingPerson(x); setFormMode("edit"); setFormOpen(true); }}
                onConvert={(x) => setConvertTarget(x)}
                onDelete={(x) => setDeleteTarget(x)}
                canWrite={canWrite} canDelete={canDelete}
              />
            ))}
          </div>
        )}
        {pagination.pages > 1 ? (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-center gap-2">
            <button disabled={pagination.page <= 1} onClick={() => fetchProspects(pagination.page - 1)} className="h-8 px-3 rounded-lg border border-gray-200 text-xs text-gray-700 disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <span className="text-xs text-gray-400">Page {pagination.page} of {pagination.pages}</span>
            <button disabled={pagination.page >= pagination.pages} onClick={() => fetchProspects(pagination.page + 1)} className="h-8 px-3 rounded-lg border border-gray-200 text-xs text-gray-700 disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        ) : null}
      </div>

      <PersonFormModal open={formOpen} mode={formMode} initialData={editingPerson} events={events} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); fetchProspects(pagination.page); }} />
      <ConvertModal open={!!convertTarget} prospect={convertTarget} onClose={() => setConvertTarget(null)} onDone={() => { setConvertTarget(null); fetchProspects(pagination.page); }} />

      {/* Delete confirmation */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="font-semibold text-gray-900 text-sm mb-2">Remove {deleteTarget.firstName} {deleteTarget.lastName}?</div>
            <p className="text-xs text-gray-400 mb-5">Their follow-up records will also be deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="flex-1 h-10 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
