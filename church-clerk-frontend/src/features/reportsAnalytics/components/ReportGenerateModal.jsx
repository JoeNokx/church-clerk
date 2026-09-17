import { useEffect, useState } from "react";
import {
  getReportsAnalyticsReport,
  exportReportsAnalyticsReport,
  createSavedReport
} from "../services/reportsAnalytics.api.js";

function saveBlob(res, fallbackName) {
  const contentType = res?.headers?.["content-type"] || "application/octet-stream";
  const blob = new Blob([res.data], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function ReportPreviewModal({ preview, module, from, to, downloading, onDownload, onClose }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const cols = Array.isArray(preview?.columns) ? preview.columns : [];
  const rows = Array.isArray(preview?.rows) ? preview.rows : [];
  const period = from && to ? `${from} - ${to}` : from || to || "All time";

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startRow = rows.length ? (safePage - 1) * pageSize + 1 : 0;
  const endRow = Math.min(rows.length, safePage * pageSize);
  const pageRows = rows.slice(startRow - 1, endRow);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="shrink-0 border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">
              {preview?.title || `${module?.label || "Module"} Report`}
            </div>
            <div className="mt-0.5 text-gray-500 text-xs">
              {period} · {rows.length} row{rows.length === 1 ? "" : "s"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm shrink-0"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col px-4 md:px-5 lg:px-6 py-4">
          {rows.length ? (
            <>
              <div className="flex-1 overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr className="text-left font-semibold text-gray-500 text-xs">
                      {cols.map((c) => (
                        <th key={c.key} className="px-4 py-2 whitespace-nowrap">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pageRows.map((r, idx) => (
                      <tr key={startRow - 1 + idx} className="text-gray-700 text-xs">
                        {cols.map((c) => (
                          <td key={`${idx}-${c.key}`} className="px-4 py-2 whitespace-nowrap">
                            {String(r?.[c.key] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="shrink-0 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <span>Showing {startRow}–{endRow} of {rows.length}</span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 cursor-pointer"
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>{n} / page</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 rounded-lg border border-gray-200 bg-white px-2.5 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="px-1 text-gray-600">Page {safePage} of {totalPages}</span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 rounded-lg border border-gray-200 bg-white px-2.5 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-gray-200 p-8 text-center text-gray-500 text-sm">
              No records found for this period.
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 px-4 md:px-5 lg:px-6 py-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={downloading === "pdf"}
            onClick={() => onDownload?.("pdf")}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
          >
            {downloading === "pdf" ? "Downloading…" : "Download PDF"}
          </button>
          <button
            type="button"
            disabled={downloading === "csv"}
            onClick={() => onDownload?.("csv")}
            className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
          >
            {downloading === "csv" ? "Downloading…" : "Download CSV"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportGenerateModal({ open, module, canExport, onClose, onSaved }) {
  const [fields, setFields] = useState([]);
  const [checked, setChecked] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [name, setName] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !module?.value) return;

    setFields([]);
    setChecked([]);
    setFrom("");
    setTo("");
    setName(`${module.label} Report`);
    setPreview(null);
    setError("");
    setDownloading("");
    setSaving(false);

    let cancelled = false;
    const load = async () => {
      setFieldsLoading(true);
      try {
        const res = await getReportsAnalyticsReport({ module: module.value });
        if (cancelled) return;
        const rep = res?.data?.report || null;
        const cols = rep?.availableColumns?.length ? rep.availableColumns : rep?.columns;
        const list = (Array.isArray(cols) ? cols : []).filter((c) => c?.key);
        setFields(list);
        setChecked(list.map((c) => c.key));
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || "Failed to load module fields");
      } finally {
        if (!cancelled) setFieldsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, module]);

  if (!open || !module) return null;

  const toggleField = (key) => {
    setChecked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const fieldsParam = checked.length ? checked.join(",") : undefined;

  const runPreview = async () => {
    setPreviewLoading(true);
    setError("");
    try {
      const res = await getReportsAnalyticsReport({
        module: module.value,
        from: from || undefined,
        to: to || undefined,
        fields: fieldsParam
      });
      setPreview(res?.data?.report || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  const download = async (format) => {
    setDownloading(format);
    setError("");
    try {
      const res = await exportReportsAnalyticsReport({
        module: module.value,
        from: from || undefined,
        to: to || undefined,
        format,
        fields: fieldsParam
      });
      saveBlob(res, `report-${module.value}.${format === "excel" ? "xlsx" : format}`);
    } catch (e) {
      setError(e?.response?.data?.message || "Download failed");
    } finally {
      setDownloading("");
    }
  };

  const generate = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await createSavedReport({
        module: module.value,
        from: from || undefined,
        to: to || undefined,
        fields: checked,
        name: name.trim() || undefined
      });
      onSaved?.(res?.data?.savedReport || null);
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
        <div className="w-full max-w-3xl max-h-[90vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
          <div className="shrink-0 border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-10 w-10 rounded-xl ${module.iconBg} ${module.iconColor} flex items-center justify-center shrink-0`}>
                {module.icon}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">Generate {module.label} Report</div>
                <div className="mt-0.5 text-gray-500 text-xs">Pick fields and a date range, then preview, download or save.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm shrink-0"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-5 lg:px-6 py-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">Report Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${module.label} Report`}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFrom(v);
                    if (to && v && to < v) setTo("");
                  }}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500">To</label>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-gray-500">Data to include in report</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChecked(fields.map((f) => f.key))}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    Select all
                  </button>
                  <span className="text-gray-300 text-xs">|</span>
                  <button
                    type="button"
                    onClick={() => setChecked([])}
                    className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {fieldsLoading ? (
                <div className="rounded-lg border border-gray-200 p-3 animate-pulse grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 rounded bg-gray-200" />
                  ))}
                </div>
              ) : fields.length ? (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {fields.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 text-gray-700 text-sm">
                      <input
                        type="checkbox"
                        checked={checked.includes(f.key)}
                        onChange={() => toggleField(f.key)}
                      />
                      <span className="truncate">{f.label || f.key}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 p-3 text-gray-500 text-sm">No fields available.</div>
              )}
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{error}</div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-gray-200 px-4 md:px-5 lg:px-6 py-4 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={fieldsLoading || previewLoading || !checked.length}
              onClick={runPreview}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
            >
              {previewLoading ? "Loading…" : "Preview"}
            </button>
            {canExport ? (
              <>
                <button
                  type="button"
                  disabled={fieldsLoading || downloading === "pdf" || !checked.length}
                  onClick={() => download("pdf")}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  {downloading === "pdf" ? "Downloading…" : "Download PDF"}
                </button>
                <button
                  type="button"
                  disabled={fieldsLoading || downloading === "csv" || !checked.length}
                  onClick={() => download("csv")}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  {downloading === "csv" ? "Downloading…" : "Download CSV"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              disabled={fieldsLoading || saving || !checked.length}
              onClick={generate}
              className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {preview ? (
        <ReportPreviewModal
          preview={preview}
          module={module}
          from={from}
          to={to}
          downloading={downloading}
          onDownload={canExport ? download : undefined}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </>
  );
}

export default ReportGenerateModal;
