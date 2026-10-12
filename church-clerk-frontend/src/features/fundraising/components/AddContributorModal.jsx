import { useEffect, useState } from "react";
import Button from "../../../shared/components/Button/index.jsx";
import PledgeForm from "../../pledge/components/PledgeForm.jsx";
import { createProjectContribution } from "../contributions/services/projectContributions.api.js";
import { getMembers } from "../../member/services/member.api.js";
import { getVisitors } from "../../attendance/services/attendance.api.js";

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function BaseModal({ open, title, subtitle, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 bg-white rounded-t-xl flex items-start justify-between gap-4 border-b border-gray-200 py-4 md:py-5 lg:py-6 px-4 md:px-6">
          <div>
            <div className="font-semibold text-gray-900 text-lg">{title}</div>
            {subtitle ? <div className="mt-1 text-gray-500 text-sm">{subtitle}</div> : null}
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
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}

function ContributionForm({ project, disabled, onDone, onCancel }) {
  const [contributorName, setContributorName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [personQuery, setPersonQuery] = useState("");
  const [personOptions, setPersonOptions] = useState([]);
  const [personSearching, setPersonSearching] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const debouncedPersonQuery = useDebouncedValue(personQuery, 300);

  useEffect(() => {
    if (selectedPerson) return;
    const q = String(debouncedPersonQuery || "").trim();

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!q) {
        setPersonOptions([]);
        return;
      }

      setPersonSearching(true);
      const [membersRes, visitorsRes] = await Promise.all([
        getMembers({ search: q, page: 1, limit: 8 }).catch(() => null),
        getVisitors({ search: q, page: 1, limit: 8 }).catch(() => null),
      ]);
      if (cancelled) return;
      const mPayload = membersRes?.data?.data ?? membersRes?.data;
      const vPayload = visitorsRes?.data?.data ?? visitorsRes?.data;
      const members = (Array.isArray(mPayload?.members) ? mPayload.members : []).map((m) => ({ ...m, _source: "member" }));
      const visitors = (Array.isArray(vPayload?.visitors) ? vPayload.visitors : []).map((v) => ({ ...v, _source: "visitor" }));
      setPersonOptions([...members, ...visitors].slice(0, 8));
      setPersonSearching(false);
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [debouncedPersonQuery, selectedPerson]);

  const selectPerson = (p) => {
    if (!p) return;
    const fullName = p?._source === "visitor"
      ? (p?.fullName || "")
      : (`${String(p?.firstName || "").trim()} ${String(p?.lastName || "").trim()}`.trim() || p?.fullName || "");
    setSelectedPerson(p);
    setPersonQuery(fullName);
    setPersonOptions([]);
    setContributorName(fullName);
    setError("");
  };

  const clearPerson = () => {
    setSelectedPerson(null);
    setPersonQuery("");
    setPersonOptions([]);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    if (!project?._id) { setIsSubmitting(false); return; }

    if (!String(contributorName || "").trim()) {
      setIsSubmitting(false);
      setError("Contributor is required.");
      return;
    }

    if (!date) {
      setIsSubmitting(false);
      setError("Date is required.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setIsSubmitting(false);
      setError("Amount is required.");
      return;
    }

    try {
      await createProjectContribution(project._id, {
        contributorName: String(contributorName).trim(),
        date,
        amount: Number(amount),
        notes: String(notes || "").trim().slice(0, 500)
      });
      onDone?.("contribution");
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Request failed");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div> : null}

      <div>
        <label className="block font-semibold text-gray-500 text-xs">Find a member or visitor</label>
        <div className="mt-0.5 text-gray-400 text-xs">Search for an existing member or visitor to autofill the contributor, or type the contributor's name manually below.</div>
        {selectedPerson ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
            <div className="min-w-0">
              <div className="font-semibold text-blue-900 truncate text-sm">{contributorName || "—"}</div>
              <div className="text-blue-700 truncate text-xs">
                {`${selectedPerson?._source === "visitor" ? "Visitor" : "Member"}${selectedPerson?.phoneNumber || selectedPerson?.email ? ` • ${selectedPerson?.phoneNumber || selectedPerson?.email}` : ""}`}
              </div>
            </div>
            <button
              type="button"
              onClick={clearPerson}
              className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-50 text-xs"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              value={personQuery}
              onChange={(e) => setPersonQuery(e.target.value)}
              type="text"
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              placeholder="Search member or visitor by name, phone, email"
            />
            {String(personQuery || "").trim() ? (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-gray-200">
                {personSearching ? (
                  <div className="px-4 py-3 text-gray-600 text-sm">Searching...</div>
                ) : personOptions.length ? (
                  <div className="divide-y divide-gray-200">
                    {personOptions.map((p, idx) => {
                      const isVisitor = p?._source === "visitor";
                      const personName = isVisitor
                        ? (p?.fullName || "—")
                        : (`${String(p?.firstName || "").trim()} ${String(p?.lastName || "").trim()}`.trim() || p?.fullName || "—");
                      return (
                        <button
                          key={`${p?._source || "p"}-${p?._id ?? idx}`}
                          type="button"
                          onClick={() => selectPerson(p)}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold text-gray-900 truncate text-sm">{personName}</div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold text-xs ${isVisitor ? "bg-yellow-50 text-yellow-700" : "bg-blue-50 text-blue-700"}`}>
                              {isVisitor ? "Visitor" : "Member"}
                            </span>
                          </div>
                          <div className="text-gray-500 truncate text-xs">{[p?.phoneNumber, p?.email].filter(Boolean).join(" • ")}</div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-gray-600 text-sm">No members or visitors found — fill the contributor field below to add them manually.</div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div>
        <label className="block font-semibold text-gray-500 text-xs">Contributor</label>
        <input
          value={contributorName}
          onChange={(e) => setContributorName(e.target.value)}
          className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
          placeholder="e.g., John Mensah"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block font-semibold text-gray-500 text-xs">Amount</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            type="number"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block font-semibold text-gray-500 text-xs">Date Received</label>
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
            type="date"
          />
        </div>
      </div>

      <div>
        <label className="block font-semibold text-gray-500 text-xs">Notes (optional)</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
          placeholder="Optional"
          maxLength={500}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
        >
          Cancel
        </button>
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          loadingText="Adding..."
          disabled={disabled}
          className="rounded-lg bg-blue-700 py-2 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 text-sm px-4 md:px-6"
        >
          Add Instant Pay
        </Button>
      </div>
    </form>
  );
}

export default function AddContributorModal({ open, onClose, project, disabled, onSuccess, currency, initialType = "pledge" }) {
  const [type, setType] = useState("pledge");
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setType(initialType === "contribution" ? "contribution" : "pledge");
  }

  const fundraiserName = project?.name || "";

  return (
    <BaseModal
      open={open}
      title="Add Contributor"
      subtitle={fundraiserName ? `Record a pledge or contribution for ${fundraiserName}` : "Record a pledge or contribution for this fundraising"}
      onClose={onClose}
    >
      <div className="mb-5 flex items-center gap-6">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="contributor-type"
            value="pledge"
            checked={type === "pledge"}
            onChange={() => setType("pledge")}
            className="h-4 w-4 accent-blue-700"
          />
          <span className="font-semibold text-gray-700 text-sm">Pledge</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="contributor-type"
            value="contribution"
            checked={type === "contribution"}
            onChange={() => setType("contribution")}
            className="h-4 w-4 accent-blue-700"
          />
          <span className="font-semibold text-gray-700 text-sm">Instant Pay</span>
        </label>
      </div>

      {type === "pledge" ? (
        <PledgeForm
          key={`pledge-${project?._id || "none"}`}
          scope={{ churchProject: project?._id }}
          disabled={disabled}
          onDone={onSuccess}
          onCancel={onClose}
        />
      ) : (
        <ContributionForm
          key={`contribution-${project?._id || "none"}`}
          project={project}
          currency={currency}
          disabled={disabled}
          onDone={onSuccess}
          onCancel={onClose}
        />
      )}
    </BaseModal>
  );
}
