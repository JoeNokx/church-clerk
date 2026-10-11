function ImageLightbox({ url, name, onClose }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] max-w-3xl overflow-auto rounded-xl bg-white p-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 pb-2">
          <div className="min-w-0 truncate text-gray-700 text-sm">{name || "Receipt"}</div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex-none inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
        <img src={url} alt={name || "Receipt"} className="max-h-[75vh] rounded-lg" />
      </div>
    </div>
  );
}

export default ImageLightbox;
