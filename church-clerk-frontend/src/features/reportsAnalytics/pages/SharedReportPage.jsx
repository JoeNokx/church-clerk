import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getSharedReport, downloadSharedReport } from "../services/reportsAnalytics.api.js";

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatPeriod(from, to) {
  const f = from ? new Date(from).toISOString().slice(0, 10) : "";
  const t = to ? new Date(to).toISOString().slice(0, 10) : "";
  if (f && t) return `${f} - ${t}`;
  return f || t || "All time";
}

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

export default function SharedReportPage() {
  const { token } = useParams();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    getSharedReport(token)
      .then((res) => setReport(res?.data?.report || null))
      .catch((e) => setError(e?.response?.data?.message || "This report link is invalid or has been removed."))
      .finally(() => setLoading(false));
  }, [token]);

  const download = async (format) => {
    setDownloading(format);
    try {
      const res = await downloadSharedReport(token, { format });
      saveBlob(res, `${report?.name || "report"}.${format}`);
    } catch {
      setError("Download failed. Please try again.");
    } finally {
      setDownloading("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl animate-pulse space-y-4">
          <div className="h-8 w-56 rounded bg-gray-200" />
          <div className="h-4 w-72 rounded bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="font-bold text-gray-900 text-lg mb-2">Report Unavailable</div>
          <div className="text-gray-500 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  const cols = Array.isArray(report?.columns) ? report.columns : [];
  const rows = Array.isArray(report?.rows) ? report.rows : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="border-b border-gray-200 p-4 md:p-6 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-bold text-gray-900 text-lg">{report?.name || "Report"}</div>
              {report?.description ? (
                <div className="mt-0.5 text-gray-600 text-sm">{report.description}</div>
              ) : null}
              <div className="mt-1 text-gray-500 text-xs">
                {report?.moduleLabel || "—"} · {formatPeriod(report?.dateFrom, report?.dateTo)} · {Number(report?.rowCount || rows.length)} rows · Generated {formatDateTime(report?.createdAt)}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={downloading === "pdf"}
                onClick={() => download("pdf")}
                className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
              >
                {downloading === "pdf" ? "Downloading…" : "Download PDF"}
              </button>
              <button
                type="button"
                disabled={downloading === "csv"}
                onClick={() => download("csv")}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
              >
                {downloading === "csv" ? "Downloading…" : "Download CSV"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {rows.length ? (
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left font-semibold text-gray-500 text-xs">
                    {cols.map((c) => (
                      <th key={c.key} className="px-6 py-2 whitespace-nowrap">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((r, idx) => (
                    <tr key={idx} className="text-gray-700 text-sm">
                      {cols.map((c) => (
                        <td key={`${idx}-${c.key}`} className="px-6 py-2 whitespace-nowrap">
                          {String(r?.[c.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">This report has no rows.</div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center text-gray-400 text-xs">
          Shared via Church Clerk
        </div>
      </div>
    </div>
  );
}
