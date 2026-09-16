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
        setPreview(rep);
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

  const previewCols = Array.isArray(preview?.columns) ? preview.columns : [];
  const previewRows = Array.isArray(preview?.rows) ? preview.rows : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4 flex items-center justify-between gap-3">
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

        <div className="px-4 md:px-5 lg:px-6 py-4 space-y-4">
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
              <label className="block text-xs font-semibold text-gray-500">Columns to include</label>
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
              <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
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

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-gray-500">Preview</label>
              {preview ? (
                <span className="text-gray-400 text-xs">{previewRows.length} row{previewRows.length === 1 ? "" : "s"}</span>
              ) : null}
            </div>
            {previewLoading || fieldsLoading ? (
              <div className="rounded-lg border border-gray-200 p-4 animate-pulse space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-4 rounded bg-gray-200" />
                ))}
              </div>
            ) : preview && previewCols.length ? (
              previewRows.length ? (
                <div className="max-h-64 overflow-auto rounded-lg border border-gray-200">
                  <table className="min-w-full">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr className="text-left font-semibold text-gray-500 text-xs">
                        {previewCols.map((c) => (
                          <th key={c.key} className="px-4 py-2 whitespace-nowrap">{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewRows.slice(0, 100).map((r, idx) => (
                        <tr key={idx} className="text-gray-700 text-xs">
                          {previewCols.map((c) => (
                            <td key={`${idx}-${c.key}`} className="px-4 py-2 whitespace-nowrap">
                              {String(r?.[c.key] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewRows.length > 100 ? (
                    <div className="px-4 py-2 text-gray-400 text-xs border-t border-gray-200">
                      Showing first 100 of {previewRows.length} rows
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 p-4 text-gray-500 text-sm">
                  No records found for this period.
                </div>
              )
            ) : null}
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{error}</div>
          ) : null}
        </div>

        <div className="border-t border-gray-200 px-4 md:px-5 lg:px-6 py-4 flex flex-wrap items-center justify-end gap-2">
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
            {saving ? "Saving…" : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportGenerateModal;
