import React from "react";

function ConfirmChurchSwitchModal({ open, churchDisplayName, mode = "branch", onCancel, onConfirm, loading }) {
  if (!open) return null;

  const name = String(churchDisplayName || "").trim() || "—";
  const isBranch = mode === "branch";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <div className="text-lg font-semibold text-gray-900">Confirm Switch</div>
            <div className="mt-1 text-sm text-gray-600">
              You are about to open <span className="font-semibold text-gray-900">{name}</span>.
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Close"
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {isBranch ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You are switching to a branch church data. Creating, editing, or deleting data of your branch isn't allowed
            </div>
          ) : (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              You are switching back to your headquarters church data.
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="rounded-lg bg-blue-700 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? "Switching…" : "Confirm & View"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmChurchSwitchModal;
