import { useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import MemberCareContext from "../memberCare.store.js";
import { MemberSelect } from "./MemberSelect.jsx";
import Button from "../../../shared/components/Button/index.jsx";
import { PRAYER_CATEGORIES, PRAYER_STATUSES, memberName } from "../constants.js";

const inputClass =
  "mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm";
const labelClass = "block font-semibold text-gray-500 text-xs";

function PrayerRequestForm({ open, mode, initialData, onClose, onSuccess }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberCareContext);

  const canCreate = useMemo(() => (typeof can === "function" ? can("memberCare", "create") : false), [can]);
  const canEdit = useMemo(() => (typeof can === "function" ? can("memberCare", "update") : false), [can]);

  const [member, setMember] = useState(null);
  const [requesterName, setRequesterName] = useState("");
  const [request, setRequest] = useState("");
  const [category, setCategory] = useState("other");
  const [status, setStatus] = useState("active");
  const [isPrivate, setIsPrivate] = useState(false);
  const [answerNote, setAnswerNote] = useState("");
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setIsSubmitting(false);

    if (mode === "edit" && initialData) {
      setMember(initialData.member || null);
      setRequesterName(String(initialData.requesterName || ""));
      setRequest(String(initialData.request || ""));
      setCategory(String(initialData.category || "other"));
      setStatus(String(initialData.status || "active"));
      setIsPrivate(Boolean(initialData.isPrivate));
      setAnswerNote(String(initialData.answerNote || ""));
      return;
    }

    setMember(null);
    setRequesterName("");
    setRequest("");
    setCategory("other");
    setStatus("active");
    setIsPrivate(false);
    setAnswerNote("");
  }, [open, mode, initialData]);

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (mode !== "edit" && !member?._id && !String(requesterName || "").trim()) {
      setFormError("Select a member or enter the requester's name.");
      return;
    }
    if (!String(request || "").trim()) {
      setFormError("The prayer request text is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      request: String(request).trim(),
      category,
      isPrivate
    };

    try {
      if (mode === "edit") {
        if (!canEdit) return;
        await store?.updatePrayer?.(initialData?._id, {
          ...payload,
          status,
          requesterName: String(requesterName || "").trim(),
          answerNote: String(answerNote || "").trim()
        });
      } else {
        if (!canCreate) return;
        await store?.createPrayer?.({
          ...payload,
          memberId: member?._id || null,
          requesterName: member?._id ? null : String(requesterName || "").trim()
        });
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
          <div className="font-semibold text-gray-900 text-sm">{mode === "edit" ? "Edit Prayer Request" : "New Prayer Request"}</div>
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
              <label className={labelClass}>Requested By</label>
              {mode === "edit" ? (
                <div className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-gray-50 px-3 text-[14px] text-gray-700 flex items-center md:h-12 lg:h-11 lg:text-sm">
                  {member ? memberName(member) : requesterName || "—"}
                </div>
              ) : (
                <div className="mt-2">
                  <MemberSelect value={member} onSelect={setMember} onClear={() => setMember(null)} />
                  {!member ? (
                    <input
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      className={inputClass}
                      placeholder="Or type a name if not a member..."
                    />
                  ) : null}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Prayer Request</label>
              <textarea
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 py-2 text-[14px] text-gray-700 lg:text-sm"
                placeholder="What should we pray about..."
              />
            </div>

            <div>
              <label className={labelClass}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                {PRAYER_CATEGORIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {mode === "edit" ? (
              <div>
                <label className={labelClass}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                  {PRAYER_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ) : null}

            {mode === "edit" && status === "answered" ? (
              <div className="md:col-span-2">
                <label className={labelClass}>Answer Note</label>
                <textarea
                  value={answerNote}
                  onChange={(e) => setAnswerNote(e.target.value)}
                  rows={2}
                  className="mt-2 w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 py-2 text-[14px] text-gray-700 lg:text-sm"
                  placeholder="How was this prayer answered..."
                />
              </div>
            ) : null}

            <label className="md:col-span-2 flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <span>
                <span className="block font-semibold text-gray-900 text-sm">Private</span>
                <span className="block text-gray-500 text-xs">Only the church administrator can see this request.</span>
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
              {isSubmitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PrayerRequestForm;
