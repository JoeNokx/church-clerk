import { useState } from "react";

function ConfirmDeleteModal({
  open,
  title = "Delete Record",
  message = "This action is permanent and cannot be undone.",
  itemName = "",
  confirmWord = "DELETE",
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  loading = false,
}) {
  const [typed, setTyped] = useState("");
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTyped("");
  }

  if (!open) return null;

  const matches = typed.trim() === confirmWord;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
        </div>
        <div className="px-5 py-4">
          <div className="text-sm text-gray-700">
            {message}
            {itemName ? <span className="font-semibold text-gray-900"> {itemName}</span> : null}
          </div>
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            Type <strong>{confirmWord}</strong> below to confirm deletion.
          </div>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={`Type ${confirmWord} to confirm`}
            autoFocus
            className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100"
          />
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !matches}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeleteModal;
