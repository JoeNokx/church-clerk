import { useContext, useEffect, useMemo, useState } from "react";

import PermissionContext from "../../permissions/permission.store.js";
import MemberCareContext from "../memberCare.store.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";
import Chip from "./Chip.jsx";
import { formatDate, labelFor, memberName, CASE_CATEGORIES, CASE_PRIORITIES, CASE_STATUSES, CASE_SOURCES, VISIT_TYPES, VISIT_OUTCOMES } from "../constants.js";

/**
 * Read-only case detail modal — case summary plus its visit timeline.
 * `onLogVisit` and `onEdit` bubble up to the page so forms stay single-sourced.
 */
function CareCaseDetails({ open, careCase, onClose, onEdit, onLogVisit }) {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberCareContext);
  const guarded = useGuardedAction();

  const canEdit = useMemo(() => (typeof can === "function" ? can("memberCare", "update") : false), [can]);

  const [visits, setVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(false);

  const caseId = careCase?._id;
  const visitsVersion = store?.visits;

  useEffect(() => {
    if (!open || !caseId) return;
    let cancelled = false;
    const run = async () => {
      setVisitsLoading(true);
      try {
        const rows = await store?.getCaseVisits?.(caseId);
        if (!cancelled) setVisits(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setVisits([]);
      } finally {
        if (!cancelled) setVisitsLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
    // visitsVersion refreshes the timeline after a visit is
    // logged/edited/deleted elsewhere in the module.
  }, [open, caseId, visitsVersion]);

  if (!open || !careCase) return null;

  const assignees = (Array.isArray(careCase.assignedTo) ? careCase.assignedTo : [])
    .map((m) => memberName(m))
    .filter((n) => n && n !== "—")
    .join(", ");

  const Field = ({ label, children }) => (
    <div>
      <div className="font-semibold text-gray-500 text-xs">{label}</div>
      <div className="mt-1 text-gray-900">{children ?? "—"}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-semibold text-gray-900 text-sm truncate">{careCase.title || "Care Case"}</div>
              {careCase.confidential ? (
                <span title="Confidential — visible to church admin only" className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 text-amber-600">
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 font-mono text-xs text-gray-500">{careCase.referenceId || ""}</div>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-5 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Member">{memberName(careCase.member)}</Field>
            <Field label="Category">{labelFor(CASE_CATEGORIES, careCase.category)}</Field>
            <Field label="Source">{labelFor(CASE_SOURCES, careCase.source)}</Field>
            <Field label="Priority"><Chip value={careCase.priority} label={labelFor(CASE_PRIORITIES, careCase.priority)} /></Field>
            <Field label="Status"><Chip value={careCase.status} label={labelFor(CASE_STATUSES, careCase.status)} /></Field>
            <Field label="Opened">{formatDate(careCase.dateOpened)}</Field>
            <Field label="Assigned To">{assignees || "—"}</Field>
            <Field label="Next Follow-up">{formatDate(careCase.nextFollowUpDate) || "—"}</Field>
            <Field label="Closed">{formatDate(careCase.dateClosed) || "—"}</Field>
          </div>

          {careCase.description ? (
            <div>
              <div className="font-semibold text-gray-500 text-xs">Description</div>
              <div className="mt-1 text-gray-700 whitespace-pre-wrap">{careCase.description}</div>
            </div>
          ) : null}

          {careCase.resolutionNotes ? (
            <div>
              <div className="font-semibold text-gray-500 text-xs">Resolution Notes</div>
              <div className="mt-1 text-gray-700 whitespace-pre-wrap">{careCase.resolutionNotes}</div>
            </div>
          ) : null}

          <div>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900 text-sm">Visit History</div>
              {<button
                  type="button"
                  onClick={() => guarded(() => onLogVisit?.(careCase), "memberCare", "update")}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                >
                  + Log Visit
                </button>
              }
            </div>

            <div className="mt-3">
              {visitsLoading ? (
                <div className="space-y-2 animate-pulse">
                  {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-lg bg-gray-100" />)}
                </div>
              ) : visits.length ? (
                <div className="space-y-2">
                  {visits.map((v) => {
                    const conducted = (Array.isArray(v?.conductedBy) ? v.conductedBy : [])
                      .map((m) => memberName(m))
                      .filter((n) => n && n !== "—")
                      .join(", ");
                    return (
                      <div key={v?._id} className="rounded-lg border border-gray-200 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold text-gray-900 text-xs">{labelFor(VISIT_TYPES, v?.visitType)}</div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Chip value={v?.outcome} label={labelFor(VISIT_OUTCOMES, v?.outcome)} />
                            <span className="text-xs text-gray-400">{formatDate(v?.visitDate)}</span>
                          </div>
                        </div>
                        {v?.notes ? <div className="mt-1.5 text-gray-600 text-xs whitespace-pre-wrap">{v.notes}</div> : null}
                        {conducted ? <div className="mt-1 text-[11px] text-gray-400">By {conducted}</div> : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-gray-400 text-xs">
                  No visits logged yet.
                </div>
              )}
            </div>
          </div>

          {<div className="flex justify-end">
              <button
                type="button"
                onClick={() => guarded(() => onEdit?.(careCase), "memberCare", "update")}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 text-sm"
              >
                Edit Case
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  );
}

export default CareCaseDetails;
