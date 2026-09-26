import React, { useContext, useEffect, useRef, useState } from "react";
import ChurchContext from "../church.store.js";
import { searchBranchChurches, updateChurchProfile } from "../services/church.api.js";

function AddBranchesModal({ open, onClose, onAdded }) {
  const churchStore = useContext(ChurchContext);
  const activeChurch = churchStore?.activeChurch;

  const branchBoxRef = useRef(null);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [branchSearch, setBranchSearch] = useState("");
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchMessage, setBranchMessage] = useState("");
  const [branchResults, setBranchResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedBranches([]);
    setBranchSearch("");
    setBranchDropdownOpen(false);
    setBranchLoading(false);
    setBranchMessage("");
    setBranchResults([]);
    setSubmitting(false);
    setSubmitError("");
  }, [open]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!branchBoxRef.current) return;
      if (branchBoxRef.current.contains(event.target)) return;
      setBranchDropdownOpen(false);
    };
    if (branchDropdownOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [branchDropdownOpen]);

  useEffect(() => {
    if (!open) return;
    const q = String(branchSearch || "").trim();
    if (!q) { setBranchResults([]); setBranchMessage(""); return; }
    setBranchLoading(true);
    setBranchMessage("");
    const t = setTimeout(async () => {
      try {
        const res = await searchBranchChurches({ search: q });
        const data = res?.data;
        const rows = Array.isArray(data) ? data : Array.isArray(data?.churches) ? data.churches : [];
        setBranchResults(rows);
        setBranchMessage(rows.length ? "" : (data?.message || "No branch matched your search"));
      } catch (e) {
        setBranchResults([]);
        setBranchMessage(e?.response?.data?.message || "Failed to search branches");
      } finally {
        setBranchLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [branchSearch, open]);

  const submit = async () => {
    if (!selectedBranches.length || !activeChurch?._id || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await updateChurchProfile(activeChurch._id, {
        type: "Headquarters",
        branchIds: selectedBranches.map((b) => b._id),
      });
      onAdded?.();
      onClose?.();
    } catch (e) {
      setSubmitError(e?.response?.data?.message || e?.message || "Failed to add branches");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl overflow-visible">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 md:px-5">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Add Branches</div>
            <div className="mt-1 text-gray-500 text-xs">Search and link branch churches to {activeChurch?.name || "your headquarters"}.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shrink-0"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-4 md:px-5">
          {submitError ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{submitError}</div>
          ) : null}

          <div ref={branchBoxRef} className="relative">
            <label className="block font-medium text-gray-700 mb-1 text-sm">Link Branch Churches</label>
            {selectedBranches.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedBranches.map((b) => (
                  <span key={b._id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-blue-800 text-xs font-medium">
                    {b.name}
                    <button type="button" onClick={() => setSelectedBranches((prev) => prev.filter((x) => x._id !== b._id))} className="ml-0.5 text-blue-500 hover:text-blue-700">✕</button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder="Search branch churches to link"
              value={branchSearch}
              onChange={(e) => { setBranchSearch(e.target.value); setBranchDropdownOpen(true); }}
              onFocus={() => setBranchDropdownOpen(true)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
            />
            {branchDropdownOpen && (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  {branchLoading ? (
                    <div className="px-4 py-3 text-gray-600 text-sm">Searching…</div>
                  ) : branchMessage && !branchResults.length ? (
                    <div className="px-4 py-3 text-gray-600 text-sm">{branchMessage}</div>
                  ) : branchResults.length ? (
                    branchResults
                      .filter((c) => !selectedBranches.some((s) => s._id === c._id))
                      .map((c) => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => {
                            setSelectedBranches((prev) => [...prev, c]);
                            setBranchSearch("");
                            setBranchResults([]);
                            setBranchDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50"
                        >
                          <div className="font-semibold text-gray-900 truncate text-sm">{c.name || "—"}</div>
                          <div className="mt-0.5 text-gray-500 truncate text-xs">
                            {`${c.city || ""}${c.region ? `, ${c.region}` : ""}`.trim() || "—"}
                          </div>
                        </button>
                      ))
                  ) : (
                    <div className="px-4 py-3 text-gray-600 text-sm">Type to search branch churches.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-4 py-4 md:px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!selectedBranches.length || submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 text-sm disabled:opacity-50"
          >
            {submitting ? "Adding…" : `Add ${selectedBranches.length ? `${selectedBranches.length} ` : ""}Branch${selectedBranches.length === 1 ? "" : "es"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddBranchesModal;
