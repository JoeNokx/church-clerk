import { useState } from "react";
import QRCode from "../QRCode/index.jsx";
import { downloadQrCodePng } from "../QRCode/utils.js";

export default function QRCodeModal({
  open,
  onClose,
  title = "QR Code",
  description,
  value,
  fileName = "qr-code",
  downloadLabel = "Download PNG",
  size = 220,
  loading = false,
  error = "",
  children
}) {
  const [downloading, setDownloading] = useState(false);
  if (!open) return null;

  const handleDownload = async () => {
    if (!value || downloading) return;
    setDownloading(true);
    try {
      await downloadQrCodePng(value, fileName);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">{title}</div>
            {description ? <div className="mt-1 text-gray-500 text-xs">{description}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shrink-0 md:h-12 md:w-12"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
          ) : null}

          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="mx-auto rounded-lg bg-gray-200" style={{ width: size, height: size }} />
              <div className="h-11 rounded-lg bg-gray-200" />
            </div>
          ) : value ? (
            <>
              <div className="flex justify-center rounded-lg border border-gray-200 bg-white p-4">
                <QRCode value={value} size={size} />
              </div>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {downloading ? "Preparing…" : downloadLabel}
              </button>
              {children}
            </>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
