import { useState } from "react";

function AddLookupValueButton({ label, kind, onCreated }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-blue-700 hover:underline"
      >
        {label}
      </button>
    );
  }

  return (
    <AddLookupValueModal
      open={open}
      kind={kind}
      onClose={() => setOpen(false)}
      onCreated={(value) => {
        setOpen(false);
        onCreated?.(value);
      }}
    />
  );
}

function AddLookupValueModal({ open, kind, onClose, onCreated }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setError("");

    const v = String(value || "").trim();
    if (!v) {
      setError("Value is required");
      return;
    }

    setSaving(true);
    try {
      const mod = await import("../services/lookups.api.js");
      await mod.createLookupValue({ kind, value: v });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cck:lookups:changed", { detail: { kind, value: v } }));
      }
      onCreated?.(v);
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="text-sm font-semibold text-gray-900">Add New</div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <label className="block text-xs font-semibold text-gray-500">Value</label>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void submit(e);
              }
            }}
            className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            placeholder="Type and save"
          />

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddLookupValueButton;
