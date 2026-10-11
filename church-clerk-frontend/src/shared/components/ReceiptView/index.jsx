function ReceiptView({ receipt, downloadUrl, onPreview, label = "Receipt" }) {
  if (!receipt?.url) return null;
  const name = receipt.originalName || "Receipt";

  return (
    <div>
      <div className="font-semibold text-gray-500 text-xs">{label}</div>
      <div className="mt-1 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPreview?.(receipt.url, name)}
          className="h-14 w-14 flex-none overflow-hidden rounded-md border border-gray-200 bg-gray-50"
          aria-label="Preview receipt"
        >
          <img src={receipt.url} alt="Receipt" className="h-full w-full object-cover" />
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onPreview?.(receipt.url, name)}
            className="font-semibold text-blue-700 hover:underline text-xs"
          >
            Preview
          </button>
          {downloadUrl ? (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-700 hover:underline text-xs"
            >
              Download
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ReceiptView;
