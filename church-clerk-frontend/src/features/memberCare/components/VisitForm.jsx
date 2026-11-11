import { useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import MemberCareContext from "../memberCare.store.js";
import { MemberMultiSelect } from "./MemberSelect.jsx";
import { getCareCases } from "../services/memberCare.api.js";
import Button from "../../../shared/components/Button/index.jsx";
import { VISIT_TYPES, VISIT_OUTCOMES, memberName } from "../constants.js";

const inputClass =
  "mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm";
const labelClass = "block font-semibold text-gray-500 text-xs";

/**
 * Log a care visit against a case. `careCase` is the parent case (its id
 * scopes the create endpoint); edit mode receives the visit row instead.
 */
function VisitForm({ open, mode, careCase, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberCareContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("memberCare", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("memberCare", "update") : false), [can]);

  const [visitType, setVisitType] = useState("home-visit");
  const [visitDate, setVisitDate] = useState("");
  const [conductedBy, setConductedBy] = useState([]);
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("stable");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When no case is passed in (create from the Visits tab), the user picks
  // one from the open/in-progress list.
  const [caseOptions, setCaseOptions] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");

  const needsCasePicker = mode !== "edit" && !careCase?._id;

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setIsSubmitting(false);

    if (mode === "edit" && initialData) {
      setVisitType(String(initialData.visitType || "home-visit"));
      setVisitDate(initialData.visitDate ? String(initialData.visitDate).slice(0, 10) : "");
      setConductedBy(Array.isArray(initialData.conductedBy) ? initialData.conductedBy : []);
      setNotes(String(initialData.notes || ""));
      setOutcome(String(initialData.outcome || "stable"));
      setNextFollowUpDate(initialData.nextFollowUpDate ? String(initialData.nextFollowUpDate).slice(0, 10) : "");
      return;
    }

    setVisitType("home-visit");
    setVisitDate(new Date().toISOString().slice(0, 10));
    setConductedBy([]);
    setNotes("");
    setOutcome("stable");
    setNextFollowUpDate("");
    setSelectedCaseId("");
  }, [open, mode, initialData]);

  useEffect(() => {
    if (!open || !needsCasePicker) return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await getCareCases({ page: 1, limit: 100 });
        const payload = res?.data?.data ?? res?.data;
        const rows = Array.isArray(payload?.careCases) ? payload.careCases : [];
        if (!cancelled) setCaseOptions(rows.filter((c) => c.status === "open" || c.status === "in-progress"));
      } catch {
        if (!cancelled) setCaseOptions([]);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [open, needsCasePicker]);

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!visitDate) {
      setFormError("Visit date is required.");
      return;
    }
    if (needsCasePicker && !selectedCaseId) {
      setFormError("Please select a care case.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      visitType,
      visitDate,
      conductedBy: conductedBy.map((m) => m?._id).filter(Boolean),
      notes: String(notes || "").trim(),
      outcome,
      nextFollowUpDate: nextFollowUpDate || null
    };

    try {
      if (mode === "edit") {
        if (!canEdit) return;
        await store?.updateVisit?.(initialData?._id, payload);
      } else {
        if (!canCreate) return;
        await store?.createVisit?.(careCase?._id || selectedCaseId, payload);
      }
      onSuccess?.();
    } catch (e2) {
      setFormError(e2?.response?.data?.message || e2?.message || "Request failed");
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const caseLabel = careCase?.title || initialData?.careCase?.title || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">{mode === "edit" ? "Edit Visit" : "Log Visit"}</div>
            {caseLabel ? <div className="mt-0.5 text-xs text-gray-500">{caseLabel}{careCase?.member ? ` — ${memberName(careCase.member)}` : ""}</div> : null}
          </div>
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

        <form onSubmit={submit} className="p-4 md:p-6 lg:p-8">
          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {needsCasePicker ? (
              <div className="md:col-span-2">
                <label className={labelClass}>Care Case</label>
                <select value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)} className={inputClass}>
                  <option value="">Select a case...</option>
                  {caseOptions.map((c) => (
                    <option key={c?._id} value={c?._id}>
                      {`${c?.title || "Untitled"} — ${memberName(c?.member)}`}
                    </option>
                  ))}
                </select>
                {!caseOptions.length ? (
                  <div className="mt-1.5 text-xs text-gray-400">No open cases — create a care case first.</div>
                ) : null}
              </div>
            ) : null}

            <div>
              <label className={labelClass}>Visit Type</label>
              <select value={visitType} onChange={(e) => setVisitType(e.target.value)} className={inputClass}>
                {VISIT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Visit Date</label>
              <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Outcome</label>
              <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={inputClass}>
                {VISIT_OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Next Follow-up</label>
              <input type="date" value={nextFollowUpDate} onChange={(e) => setNextFollowUpDate(e.target.value)} className={inputClass} />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Conducted By</label>
              <div className="mt-2">
                <MemberMultiSelect values={conductedBy} onChange={setConductedBy} placeholder="Search members who made the visit..." />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 py-2 text-[14px] text-gray-700 lg:text-sm"
                placeholder="What happened during the visit..."
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <Button type="submit" disabled={isSubmitting || (mode === "edit" ? !canEdit : !canCreate)}>
              {isSubmitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Log Visit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VisitForm;
