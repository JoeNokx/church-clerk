import { useEffect, useState } from "react";
import Button from "../../../shared/components/Button/index.jsx";
import PledgeForm from "../../pledge/components/PledgeForm.jsx";
import { createProjectContribution } from "../contributions/services/projectContributions.api.js";

function BaseModal({ open, title, subtitle, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 py-4 md:py-5 lg:py-6 px-4 md:px-6">
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

function ContributionForm({ project, currency, disabled, onDone, onCancel }) {
  const [contributorName, setContributorName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (!open) return;
    setType(initialType === "contribution" ? "contribution" : "pledge");
  }, [open, initialType]);

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
