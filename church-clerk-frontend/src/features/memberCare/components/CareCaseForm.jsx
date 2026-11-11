import { useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import MemberCareContext from "../memberCare.store.js";
import { MemberSelect, MemberMultiSelect } from "./MemberSelect.jsx";
import Button from "../../../shared/components/Button/index.jsx";
import { showError } from "../../../utils/toast.js";
import { CASE_CATEGORIES, CASE_PRIORITIES, CASE_STATUSES, CASE_SOURCES, VISIT_TYPES, memberName } from "../constants.js";

const inputClass =
  "mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm";
const labelClass = "block font-semibold text-gray-500 text-xs";

function CareCaseForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberCareContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("memberCare", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("memberCare", "update") : false), [can]);

  const [member, setMember] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("normal");
  const [status, setStatus] = useState("open");
  const [source, setSource] = useState("self-reported");
  const [confidential, setConfidential] = useState(false);
  const [description, setDescription] = useState("");
  const [assignees, setAssignees] = useState([]);
  const [dateOpened, setDateOpened] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [firstVisitType, setFirstVisitType] = useState("home-visit");
  const [firstVisitDate, setFirstVisitDate] = useState("");
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setIsSubmitting(false);

    if (mode === "edit" && initialData) {
      setMember(initialData.member || null);
      setTitle(String(initialData.title || ""));
      setCategory(String(initialData.category || "other"));
      setPriority(String(initialData.priority || "normal"));
      setStatus(String(initialData.status || "open"));
      setSource(String(initialData.source || "self-reported"));
      setConfidential(Boolean(initialData.confidential));
      setDescription(String(initialData.description || ""));
      setAssignees(Array.isArray(initialData.assignedTo) ? initialData.assignedTo : []);
      setDateOpened(initialData.dateOpened ? String(initialData.dateOpened).slice(0, 10) : "");
      setNextFollowUpDate(initialData.nextFollowUpDate ? String(initialData.nextFollowUpDate).slice(0, 10) : "");
      setFirstVisitType("home-visit");
      setFirstVisitDate("");
      return;
    }

    setMember(null);
    setTitle("");
    setCategory("other");
    setPriority("normal");
    setStatus("open");
    setSource("self-reported");
    setConfidential(false);
    setDescription("");
    setAssignees([]);
    setDateOpened(new Date().toISOString().slice(0, 10));
    setNextFollowUpDate("");
    setFirstVisitType("home-visit");
    setFirstVisitDate("");
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (mode !== "edit" && !member?._id) {
      setFormError("Please search and select a member.");
      return;
    }
    if (!String(title || "").trim()) {
      setFormError("A case title is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      title: String(title).trim(),
      category,
      priority,
      source,
      confidential,
      description: String(description || "").trim(),
      assignedTo: assignees.map((m) => m?._id).filter(Boolean),
      ...(dateOpened ? { dateOpened } : {}),
      nextFollowUpDate: nextFollowUpDate || null
    };

    try {
      if (mode === "edit") {
        if (!canEdit) return;
        await store?.updateCase?.(initialData?._id, { ...payload, status });
      } else {
        if (!canCreate) return;
        const res = await store?.createCase?.({ ...payload, memberId: member._id });

        // A visit date means the case was opened during a visit — log it
        // as the case's first visit record.
        const newCaseId = res?.data?.careCase?._id ?? res?.data?.data?.careCase?._id;
        if (firstVisitDate && newCaseId) {
          try {
            await store?.createVisit?.(newCaseId, {
              visitDate: firstVisitDate,
              visitType: firstVisitType
            });
          } catch {
            showError("Case created, but the initial visit could not be logged");
          }
        }
      }
      onSuccess?.();
    } catch (e2) {
      setFormError(e2?.response?.data?.message || e2?.message || "Request failed");
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
          <div className="font-semibold text-gray-900 text-sm">{mode === "edit" ? "Edit Care Case" : "New Care Case"}</div>
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
            <div className="md:col-span-2">
              <label className={labelClass}>Member</label>
              {mode === "edit" ? (
                <div className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-gray-50 px-3 text-[14px] text-gray-700 flex items-center md:h-12 lg:h-11 lg:text-sm">
                  {memberName(member)}
                </div>
              ) : (
                <div className="mt-2">
                  <MemberSelect value={member} onSelect={setMember} onClear={() => setMember(null)} />
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Case Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Hospital visit after surgery" />
            </div>

            <div>
              <label className={labelClass}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                {CASE_CATEGORIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
                {CASE_PRIORITIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
                {CASE_SOURCES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {mode === "edit" ? (
              <div>
                <label className={labelClass}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                  {CASE_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className={labelClass}>Date Opened</label>
                <input type="date" value={dateOpened} onChange={(e) => setDateOpened(e.target.value)} className={inputClass} />
              </div>
            )}

            {mode === "edit" ? (
              <div>
                <label className={labelClass}>Date Opened</label>
                <input type="date" value={dateOpened} onChange={(e) => setDateOpened(e.target.value)} className={inputClass} />
              </div>
            ) : null}

            <div>
              <label className={labelClass}>Next Follow-up</label>
              <input type="date" value={nextFollowUpDate} onChange={(e) => setNextFollowUpDate(e.target.value)} className={inputClass} />
            </div>

            {mode !== "edit" ? (
              <div className="md:col-span-2 rounded-lg border border-dashed border-gray-200 p-3">
                <div className="font-semibold text-gray-500 text-xs">First visit (optional)</div>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  <div>
                    <label className={labelClass}>Visit Type</label>
                    <select value={firstVisitType} onChange={(e) => setFirstVisitType(e.target.value)} className={inputClass}>
                      {VISIT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Visit Date</label>
                    <input type="date" value={firstVisitDate} onChange={(e) => setFirstVisitDate(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">Set a visit date to record the visit that prompted this case.</div>
              </div>
            ) : null}

            <div className="md:col-span-2">
              <label className={labelClass}>Assigned Caregivers</label>
              <div className="mt-2">
                <MemberMultiSelect values={assignees} onChange={setAssignees} placeholder="Search members to assign..." />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 py-2 text-[14px] text-gray-700 lg:text-sm"
                placeholder="Brief description of the care need..."
              />
            </div>

            <label className="md:col-span-2 flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confidential}
                onChange={(e) => setConfidential(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <span>
                <span className="block font-semibold text-gray-900 text-sm">Confidential</span>
                <span className="block text-gray-500 text-xs">Only the church administrator can see this case.</span>
              </span>
            </label>
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
              {isSubmitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Case"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CareCaseForm;
