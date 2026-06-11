import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import PermissionContext from "../../permissions/permission.store.js";
import MemberContext, { MemberProvider } from "../member.store.js";
import MemberFilters from "../components/MemberFilters.jsx";
import MemberTable from "../components/MemberTable.jsx";
import {
  downloadMembersImportTemplate,
  importMembersCsv,
  previewMembersImport,
  canCreateMember
} from "../services/member.api.js";
import { useMembersKpiQuery } from "../hooks/useMembers.js";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";

function MembersPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberContext);
  const location = useLocation();
  const { toPage } = useDashboardNavigator();

  const canCreate = useMemo(() => (typeof can === "function" ? can("members", "create") : false), [can]);
  const canImport = useMemo(() => (typeof can === "function" ? can("members", "import") : false), [can]);

  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState("upload");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");

  const refreshMembers = useCallback(async () => {
    await store?.fetchMembers?.();
  }, [store]);

  useEffect(() => {
    if (!store?.activeChurch) return;
    refreshMembers();
  }, [store?.activeChurch]);

  const {
    data: memberKPI,
    isLoading: kpiLoading
  } = useMembersKpiQuery({ activeChurchId: store?.activeChurch, enabled: true });

  const renderLimitMessage = (message) => {
    const msg = String(message || "");
    const m = msg.match(/member limit\s+(\d[\d,]*)/i);
    if (!m) return msg;

    const full = m[0];
    const num = m[1];
    const idx = m.index ?? -1;
    if (idx < 0) return msg;

    const before = msg.slice(0, idx);
    const after = msg.slice(idx + full.length);
    const prefix = full.slice(0, full.length - num.length);

    return (
      <>
        {before}
        {prefix}
        <span className="font-semibold">{num}</span>
        {after}
      </>
    );
  };

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

  const openCreate = async () => {
    try {
      const res = await canCreateMember();
      if (res?.data?.allowed !== false) {
        toPage("member-form");
      } else {
        setLimitMessage(res?.data?.message || "You cannot add more members.");
        setLimitModalOpen(true);
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to check limit";
      setLimitMessage(msg);
      setLimitModalOpen(true);
    }
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
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Members</h2>
          <p className="mt-1 text-gray-500 text-sm">Track and manage church members</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 md:gap-3">
          {canImport && (
            <button
              type="button"
              onClick={openImport}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 md:px-4 py-2.5 md:py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:bg-gray-100 text-sm"
            >
              Import Members
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 md:px-4 py-2.5 md:py-2 font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 text-sm"
            >
              <span className="leading-none text-lg">+</span>
              Add Member
            </button>
          )}
        </div>
      </div>

      <KpiGrid className="mt-4 gap-3 lg:grid-cols-4">
          {kpiLoading ? (
            <div className="text-gray-600 col-span-2 lg:col-span-4 text-sm">Loading KPI...</div>
          ) : (
            <>
              <KpiCard title="Total Members" value={memberKPI?.totalMembers} />
              <KpiCard title="Active Members" value={memberKPI?.currentMembers} />
              <KpiCard title="Inactive Members" value={memberKPI?.inactiveMembers} />
              <KpiCard title="New This Month" value={memberKPI?.newMembersThisMonth} />
            </>
          )}
      </KpiGrid>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Members Records</div>
            <div className="text-gray-500 text-xs">All members and their details</div>
          </div>

          <MemberFilters />
        </div>

        <MemberTable onDeleted={refreshMembers} />
      </div>

      {canImport && importOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Import Members</div>
                <div className="mt-1 text-gray-500 text-xs">
                  {importStep === "upload" ? "Download template, fill it, then upload CSV." : null}
                  {importStep === "preview" ? "Review validation results before importing." : null}
                  {importStep === "result" ? "Import summary." : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 shrink-0 md:h-12 md:w-12"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="p-4 md:p-6 lg:p-8">
              {importError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{importError}</div>
              ) : null}

              {importStep === "upload" ? (
                <div className="grid grid-cols-1 gap-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="font-semibold text-gray-900 text-sm">1) Download CSV Template</div>
                    <div className="mt-1 text-gray-500 text-xs">Use the template to ensure headers match.</div>
                    <div className="mt-3">
                      <button
                        type="button"
                        disabled={importLoading}
                        onClick={downloadTemplate}
                        className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
                      >
                        {importLoading ? "Working…" : "Download Template"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="font-semibold text-gray-900 text-sm">2) Upload Filled CSV</div>
                    <div className="mt-1 text-gray-500 text-xs">We will validate and show a preview before importing.</div>
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
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">Preview</div>
                        <div className="mt-1 text-gray-500 text-xs">
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
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                        >
                          Choose another file
                        </button>
                        <button
                          type="button"
                          disabled={importLoading || !(importPreview?.summary?.valid > 0)}
                          onClick={runImport}
                          className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
                        >
                          {importLoading ? "Importing…" : "Import Valid Rows"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="font-semibold text-gray-900 text-sm">Valid Rows (first 200)</div>
                      </div>
                      <div className="max-h-80 overflow-auto">
                        <table className="min-w-full">
                          <thead className="bg-slate-100">
                            <tr className="text-left font-semibold text-gray-500 text-xs">
                              <th className="px-4 py-2">Row</th>
                              <th className="px-4 py-2">Name</th>
                              <th className="px-4 py-2">Phone</th>
                              <th className="px-4 py-2">Email</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(Array.isArray(importPreview?.validRows) ? importPreview.validRows : []).map((r) => (
                              <tr key={r?.rowNumber} className="text-gray-700 text-sm">
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
                        <div className="font-semibold text-gray-900 text-sm">Invalid Rows (first 200)</div>
                      </div>
                      <div className="max-h-80 overflow-auto">
                        <table className="min-w-full">
                          <thead className="bg-slate-100">
                            <tr className="text-left font-semibold text-gray-500 text-xs">
                              <th className="px-4 py-2">Row</th>
                              <th className="px-4 py-2">Reasons</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(Array.isArray(importPreview?.invalidRows) ? importPreview.invalidRows : []).map((r) => (
                              <tr key={r?.rowNumber} className="text-gray-700 text-sm">
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
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">Import Completed</div>
                        <div className="mt-1 text-gray-500 text-xs">
                          Total: {importResult?.summary?.total ?? 0} | Imported: {importResult?.summary?.imported ?? 0} | Skipped: {importResult?.summary?.skipped ?? 0}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setImportOpen(false)}
                          className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 text-sm"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>

                  {(Array.isArray(importResult?.invalidRows) && importResult.invalidRows.length) ? (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="font-semibold text-gray-900 text-sm">Skipped / Invalid Rows (first 500)</div>
                      </div>
                      <div className="max-h-96 overflow-auto">
                        <table className="min-w-full">
                          <thead className="bg-slate-100">
                            <tr className="text-left font-semibold text-gray-500 text-xs">
                              <th className="px-4 py-2">Row</th>
                              <th className="px-4 py-2">Reasons</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {importResult.invalidRows.map((r) => (
                              <tr key={r?.rowNumber} className="text-gray-700 text-sm">
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

      {/* Member limit modal */}
      {limitModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLimitModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-xl md:p-6 lg:p-8">
            <div className="font-semibold text-gray-900 text-lg">Limit Reached</div>
            <p className="mt-2 text-gray-600 text-sm">{renderLimitMessage(limitMessage)}</p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setLimitModalOpen(false)}
                className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 text-sm"
              >
                Close
              </button>
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
