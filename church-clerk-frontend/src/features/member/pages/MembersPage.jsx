import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import PermissionContext from "../../permissions/permission.store.js";
import MemberContext, { MemberProvider } from "../member.store.js";
import MemberFilters from "../components/MemberFilters.jsx";
import MemberTable from "../components/MemberTable.jsx";
import {
  downloadMembersImportTemplate,
  getMembersKPI,
  importMembersCsv,
  previewMembersImport
} from "../services/member.api.js";

function KpiCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{typeof value === "number" ? value : 0}</div>
    </div>
  );
}

function MembersPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberContext);
  const location = useLocation();
  const { toPage } = useDashboardNavigator();

  const canCreate = useMemo(() => (typeof can === "function" ? can("members", "create") : false), [can]);

  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState("upload");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const [kpiLoading, setKpiLoading] = useState(false);
  const [memberKPI, setMemberKPI] = useState(null);

  const refreshMembers = useCallback(async () => {
    await store?.fetchMembers?.();
  }, [store]);

  useEffect(() => {
    if (!store?.activeChurch) return;
    refreshMembers();
  }, [store?.activeChurch]);

  useEffect(() => {
    if (!store?.activeChurch) return;

    let cancelled = false;

    (async () => {
      setKpiLoading(true);
      try {
        const res = await getMembersKPI();
        const payload = res?.data?.data ?? res?.data;
        const kpi = payload?.memberKPI || payload;
        if (cancelled) return;
        setMemberKPI(kpi || null);
      } catch (e) {
        if (cancelled) return;
        setMemberKPI(null);
      } finally {
        if (cancelled) return;
        setKpiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [store?.activeChurch]);

  useEffect(() => {
    const state = location.state;
    const prefill = state?.prefillMember || null;

    if (!prefill) return;

    toPage(
      "member-form",
      undefined,
      {
        state: {
          prefillMember: prefill
        }
      }
    );
  }, [location.pathname, location.search, location.state, toPage]);

  const openCreate = () => {
    toPage("member-form");
  };

  const openImport = () => {
    setImportError("");
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setImportStep("upload");
    setImportOpen(true);
  };

  const downloadTemplate = async () => {
    setImportLoading(true);
    setImportError("");
    try {
      const res = await downloadMembersImportTemplate();
      const contentType = res?.headers?.["content-type"] || "text/csv";
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "members-import-template.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setImportError(e?.response?.data?.message || e?.message || "Failed to download template");
    } finally {
      setImportLoading(false);
    }
  };

  const onPickFile = async (file) => {
    if (!file) return;
    setImportFile(file);
    setImportResult(null);
    setImportPreview(null);
    setImportError("");
    setImportLoading(true);
    try {
      const res = await previewMembersImport(file);
      setImportPreview(res?.data || null);
      setImportStep("preview");
    } catch (e) {
      setImportPreview(null);
      setImportStep("upload");
      setImportError(e?.response?.data?.message || e?.message || "Failed to preview import");
    } finally {
      setImportLoading(false);
    }
  };

  const runImport = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportError("");
    try {
      const res = await importMembersCsv(importFile);
      setImportResult(res?.data || null);
      setImportStep("result");
      await refreshMembers();
    } catch (e) {
      setImportError(e?.response?.data?.message || e?.message || "Failed to import members");
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Members</h2>
          <p className="mt-2 text-sm text-gray-600">Track and manage church members</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              type="button"
              onClick={openImport}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Import Members
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <span className="text-lg leading-none">+</span>
              Add Member
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpiLoading ? (
            <div className="text-sm text-gray-600 sm:col-span-2 lg:col-span-4">Loading KPI...</div>
          ) : (
            <>
              <KpiCard label="Total Members" value={memberKPI?.totalMembers} />
              <KpiCard label="Active Members" value={memberKPI?.currentMembers} />
              <KpiCard label="Inactive Members" value={memberKPI?.inactiveMembers} />
              <KpiCard label="New This Month" value={memberKPI?.newMembersThisMonth} />
            </>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Members Records</div>
            <div className="text-xs text-gray-500">All members and their details</div>
          </div>

          <MemberFilters />
        </div>

        <MemberTable onDeleted={refreshMembers} />
      </div>

      {importOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">Import Members</div>
                <div className="mt-1 text-xs text-gray-500">
                  {importStep === "upload" ? "Download template, fill it, then upload CSV." : null}
                  {importStep === "preview" ? "Review validation results before importing." : null}
                  {importStep === "result" ? "Import summary." : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              {importError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{importError}</div>
              ) : null}

              {importStep === "upload" ? (
                <div className="grid grid-cols-1 gap-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-sm font-semibold text-gray-900">1) Download CSV Template</div>
                    <div className="mt-1 text-xs text-gray-500">Use the template to ensure headers match.</div>
                    <div className="mt-3">
                      <button
                        type="button"
                        disabled={importLoading}
                        onClick={downloadTemplate}
                        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                      >
                        {importLoading ? "Working…" : "Download Template"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-sm font-semibold text-gray-900">2) Upload Filled CSV</div>
                    <div className="mt-1 text-xs text-gray-500">We will validate and show a preview before importing.</div>
                    <div className="mt-3">
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        disabled={importLoading}
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          onPickFile(f);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {importStep === "preview" ? (
                <div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Preview</div>
                        <div className="mt-1 text-xs text-gray-500">
                          Total: {importPreview?.summary?.total ?? 0} | Valid: {importPreview?.summary?.valid ?? 0} | Invalid: {importPreview?.summary?.invalid ?? 0}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={importLoading}
                          onClick={() => {
                            setImportStep("upload");
                            setImportPreview(null);
                            setImportResult(null);
                            setImportFile(null);
                          }}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Choose another file
                        </button>
                        <button
                          type="button"
                          disabled={importLoading || !(importPreview?.summary?.valid > 0)}
                          onClick={runImport}
                          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                        >
                          {importLoading ? "Importing…" : "Import Valid Rows"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900">Valid Rows (first 200)</div>
                      </div>
                      <div className="max-h-80 overflow-auto">
                        <table className="min-w-full">
                          <thead className="bg-slate-100">
                            <tr className="text-left text-xs font-semibold text-gray-500">
                              <th className="px-4 py-2">Row</th>
                              <th className="px-4 py-2">Name</th>
                              <th className="px-4 py-2">Phone</th>
                              <th className="px-4 py-2">Email</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(Array.isArray(importPreview?.validRows) ? importPreview.validRows : []).map((r) => (
                              <tr key={r?.rowNumber} className="text-sm text-gray-700">
                                <td className="px-4 py-2 whitespace-nowrap">{r?.rowNumber ?? "—"}</td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {String([r?.payload?.firstName, r?.payload?.lastName].filter(Boolean).join(" ") || "—")}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">{String(r?.payload?.phoneNumber || "—")}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{String(r?.payload?.email || "—")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900">Invalid Rows (first 200)</div>
                      </div>
                      <div className="max-h-80 overflow-auto">
                        <table className="min-w-full">
                          <thead className="bg-slate-100">
                            <tr className="text-left text-xs font-semibold text-gray-500">
                              <th className="px-4 py-2">Row</th>
                              <th className="px-4 py-2">Reasons</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(Array.isArray(importPreview?.invalidRows) ? importPreview.invalidRows : []).map((r) => (
                              <tr key={r?.rowNumber} className="text-sm text-gray-700">
                                <td className="px-4 py-2 whitespace-nowrap">{r?.rowNumber ?? "—"}</td>
                                <td className="px-4 py-2">
                                  {Array.isArray(r?.reasons) ? r.reasons.join("; ") : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {importStep === "result" ? (
                <div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Import Completed</div>
                        <div className="mt-1 text-xs text-gray-500">
                          Total: {importResult?.summary?.total ?? 0} | Imported: {importResult?.summary?.imported ?? 0} | Skipped: {importResult?.summary?.skipped ?? 0}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setImportOpen(false)}
                          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>

                  {(Array.isArray(importResult?.invalidRows) && importResult.invalidRows.length) ? (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900">Skipped / Invalid Rows (first 500)</div>
                      </div>
                      <div className="max-h-96 overflow-auto">
                        <table className="min-w-full">
                          <thead className="bg-slate-100">
                            <tr className="text-left text-xs font-semibold text-gray-500">
                              <th className="px-4 py-2">Row</th>
                              <th className="px-4 py-2">Reasons</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {importResult.invalidRows.map((r) => (
                              <tr key={r?.rowNumber} className="text-sm text-gray-700">
                                <td className="px-4 py-2 whitespace-nowrap">{r?.rowNumber ?? "—"}</td>
                                <td className="px-4 py-2">{Array.isArray(r?.reasons) ? r.reasons.join("; ") : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MembersPage() {
  return (
    <MemberProvider>
      <MembersPageInner />
    </MemberProvider>
  );
}

export default MembersPage;
