import { useEffect, useMemo, useRef } from "react";

function ReceiptPicker({ receiptFile, existingReceipt, removed, onPick, onClearFile, onRemoveExisting, onUndoRemove, onPreview }) {
  const inputRef = useRef(null);
  const previewUrl = useMemo(() => (receiptFile ? URL.createObjectURL(receiptFile) : null), [receiptFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const showExisting = !receiptFile && existingReceipt?.url && !removed;
  const current = receiptFile
    ? { url: previewUrl, name: receiptFile.name }
    : showExisting
      ? { url: existingReceipt.url, name: existingReceipt.originalName || "Receipt" }
      : null;

  return (
    <div>
      <label className="block font-semibold text-gray-500 text-xs">Receipt (optional)</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          onPick?.(f);
          e.target.value = "";
        }}
      />

      {current ? (
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2">
          <button
            type="button"
            onClick={() => onPreview?.(current.url, current.name)}
            className="h-14 w-14 flex-none overflow-hidden rounded-md border border-gray-200 bg-gray-50"
            aria-label="Preview receipt"
          >
            <img src={current.url} alt="Receipt" className="h-full w-full object-cover" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-gray-700 text-xs">{current.name}</div>
            <button
              type="button"
              onClick={() => onPreview?.(current.url, current.name)}
              className="mt-0.5 font-semibold text-blue-700 hover:underline text-xs"
            >
              Preview
            </button>
          </div>
          <div className="flex flex-none items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={receiptFile ? onClearFile : onRemoveExisting}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 font-semibold text-red-600 hover:bg-red-50 text-xs"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-lg border border-dashed border-gray-300 bg-white px-3 py-3 font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-700 text-sm"
          >
            Upload receipt image
          </button>
          {existingReceipt?.url && removed ? (
            <button
              type="button"
              onClick={onUndoRemove}
              className="mt-1 font-semibold text-blue-700 hover:underline text-xs"
            >
              Undo remove — keep existing receipt
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default ReceiptPicker;
