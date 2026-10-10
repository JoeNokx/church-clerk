import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import PermissionContext from "../../permissions/permission.store.js";
import MemberContext, { MemberProvider } from "../member.store.js";
import AuthContext from "../../auth/auth.store.jsx";
import {
  getRegistrationToken,
  generateRegistrationToken,
  revokeRegistrationToken
} from "../../church/services/church.api.js";
import MemberFilters from "../components/MemberFilters.jsx";
import Spinner from "../../../shared/components/Spinner.jsx";
import MemberTable from "../components/MemberTable.jsx";
import {
  downloadMembersImportTemplate,
  previewMembersImport,
  previewMembersImportRows,
  importMembersRows,
  canCreateMember
} from "../services/member.api.js";
import { useMembersKpiQuery } from "../hooks/useMembers.js";
import KpiCard from "../../../shared/components/KpiCard/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";
import { MEMBER_IMPORT_FIELDS } from "../memberFields.js";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://churchclerkapp.com";

// Which payload key each preview column reads
const displayKey = (f) =>
  f.kind === "date" ? `${f.key}Raw` : f.kind === "org" ? `${f.key}Text` : f.key;

const IMPORT_COLUMNS = MEMBER_IMPORT_FIELDS.map((f) => ({ key: displayKey(f), label: f.label }));

const EDIT_FIELDS = MEMBER_IMPORT_FIELDS.map((f) => ({
  key: f.key,
  label: f.kind === "org" ? `${f.label} (name)` : f.label,
  required: f.required,
  type: f.kind === "date" ? "date" : undefined,
  options: f.options ? ["", ...f.options.map((o) => o.value)] : undefined
}));

const toDateInput = (v) => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
};

const payloadToDraft = (p = {}) =>
  Object.fromEntries(MEMBER_IMPORT_FIELDS.map((f) => {
    if (f.kind === "phone") return [f.key, p.phoneNumberRaw || p.phoneNumber || ""];
    if (f.kind === "date") return [f.key, toDateInput(p[`${f.key}Raw`])];
    if (f.kind === "org") return [f.key, p[`${f.key}Text`] || ""];
    return [f.key, p[f.key] || ""];
  }));

const draftToRawRow = (d = {}, rowNumber) => ({
  ...Object.fromEntries(MEMBER_IMPORT_FIELDS.map((f) => [f.raw, d[f.key] || ""])),
  ...(Number.isFinite(rowNumber) ? { __rowNumber: rowNumber } : {}),
});

function ImportDataTable({ title, rows, showReasons, tone = "default", onEdit }) {
  const isError = tone === "error";
  return (
    <div className={`rounded-xl border bg-white overflow-hidden ${isError ? "border-red-200" : "border-gray-200"}`}>
      <div className={`border-b px-4 py-3 ${isError ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
        <div className={`font-semibold text-sm ${isError ? "text-red-700" : "text-gray-900"}`}>{title}</div>
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left font-semibold text-gray-500 text-xs">
              <th className="px-4 py-2 whitespace-nowrap">Row</th>
              {IMPORT_COLUMNS.map((c) => (
                <th key={c.key} className="px-4 py-2 whitespace-nowrap">{c.label}</th>
              ))}
              {showReasons ? <th className="px-4 py-2 whitespace-nowrap">Reasons</th> : null}
              {typeof onEdit === "function" ? <th className="px-4 py-2 whitespace-nowrap">Action</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((r) => {
              const p = r?.payload || {};
              return (
                <tr key={r?.rowNumber} className="text-gray-700 text-sm">
                  <td className="px-4 py-2 whitespace-nowrap">{r?.rowNumber ?? "—"}</td>
                  {IMPORT_COLUMNS.map((c) => {
                    const val = c.key === "phoneNumber"
                      ? String(p?.phoneNumber || p?.phoneNumberRaw || "") || "—"
                      : String(p?.[c.key] ?? "") || "—";
                    return (
                      <td key={c.key} className="px-4 py-2 whitespace-nowrap">
                        {c.key === "note" ? (
                          <span className="block max-w-[180px] truncate" title={val === "—" ? undefined : val}>{val}</span>
                        ) : val}
                      </td>
                    );
                  })}
                  {showReasons ? (
                    <td className="px-4 py-2 text-red-600 align-top">
                      {Array.isArray(r?.reasons) ? (
                        <div
                          className="line-clamp-2 max-w-[280px] text-xs leading-5"
                          title={r.reasons.join("\n")}
                        >
                          {r.reasons.join(" • ")}
                        </div>
                      ) : "—"}
                    </td>
                  ) : null}
                  {typeof onEdit === "function" ? (
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onEdit(r)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MembersPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const { user } = useContext(AuthContext) || {};
  const store = useContext(MemberContext);
  const location = useLocation();
  const { toPage } = useDashboardNavigator();
  const guarded = useGuardedAction();

  const canCreate = useMemo(() => (typeof can === "function" ? can("members", "create") : false), [can]);
  const canImport = useMemo(() => (typeof can === "function" ? can("members", "import") : false), [can]);

  const isChurchAdmin = useMemo(() => {
    const raw = String(user?.role || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
    return raw === "churchadmin";
  }, [user?.role]);

  const [regLinkOpen, setRegLinkOpen] = useState(false);
  const [regToken, setRegToken] = useState(null);
  const [regTokenActive, setRegTokenActive] = useState(false);
  const [regLinkLoading, setRegLinkLoading] = useState(false);
  const [regLinkError, setRegLinkError] = useState("");
  const [regLinkCopied, setRegLinkCopied] = useState(false);

  const regLink = regToken ? `${BASE_URL}/join/${regToken}` : null;

  const openRegLink = async () => {
    setRegLinkOpen(true);
    setRegLinkError("");
    setRegLinkLoading(true);
    try {
      const res = await getRegistrationToken();
      setRegToken(res?.data?.token || null);
      setRegTokenActive(res?.data?.registrationTokenActive || false);
    } catch (e) {
      setRegLinkError(e?.response?.data?.message || "Failed to load registration link.");
    } finally {
      setRegLinkLoading(false);
    }
  };

  const handleGenerate = async () => {
    setRegLinkError("");
    setRegLinkLoading(true);
    try {
      const res = await generateRegistrationToken();
      setRegToken(res?.data?.token || null);
      setRegTokenActive(true);
    } catch (e) {
      setRegLinkError(e?.response?.data?.message || "Failed to generate link.");
    } finally {
      setRegLinkLoading(false);
    }
  };

  const handleRevoke = async () => {
    setRegLinkError("");
    setRegLinkLoading(true);
    try {
      await revokeRegistrationToken();
      setRegToken(null);
      setRegTokenActive(false);
    } catch (e) {
      setRegLinkError(e?.response?.data?.message || "Failed to revoke link.");
    } finally {
      setRegLinkLoading(false);
    }
  };

  const handleCopy = () => {
    if (!regLink) return;
    navigator.clipboard.writeText(regLink).then(() => {
      setRegLinkCopied(true);
      setTimeout(() => setRegLinkCopied(false), 2000);
    });
  };

  const [importOpen, setImportOpen] = useState(false);
  const [mobileAddOpen, setMobileAddOpen] = useState(false);
  const [importStep, setImportStep] = useState("upload");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importPreview, setImportPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const importFileInputRef = useRef(null);
  const [editRow, setEditRow] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

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
    isLoading: kpiLoading,
    isError: kpiError
  } = useMembersKpiQuery({ activeChurchId: store?.activeChurch, enabled: true });

  // Explanatory text under each KPI card. change === null means no previous
  // baseline existed (0 -> N), shown as "Increased from 0 last month".
  const memberWord = (n) => (Math.abs(n) === 1 ? "member" : "members");
  const trendText = (diff, change, noun = "") => {
    if (kpiError) return "No comparison data available";
    if (diff === undefined || diff === null) return "No comparison data available";
    if (diff === 0) return "No change from last month";
    if (change === null && diff > 0) return "Increased from 0 last month";
    const n = Math.abs(diff);
    const phrase = noun ? ` ${noun} ${memberWord(n)}` : "";
    return `${n} ${diff > 0 ? "more" : "fewer"}${phrase} than last month`;
  };

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
      const contentType = res?.headers?.["content-type"] || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "members-import-template.xlsx";
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
    const rows = (importPreview?.validRows || []).map((r) => {
      const p = r?.payload || {};
      const d = payloadToDraft(p);
      if (p.dateOfBirth) d.dateOfBirth = String(p.dateOfBirth).slice(0, 10);
      if (p.dateJoined) d.dateJoined = String(p.dateJoined).slice(0, 10);
      return draftToRawRow(d, r?.rowNumber);
    });
    if (!rows.length) return;
    setImportLoading(true);
    setImportError("");
    try {
      const res = await importMembersRows(rows);
      setImportResult(res?.data || null);
      setImportStep("result");
      await refreshMembers();
    } catch (e) {
      setImportError(e?.response?.data?.message || e?.message || "Failed to import members");
    } finally {
      setImportLoading(false);
    }
  };

  const openEditRow = (row) => {
    setEditRow(row);
    setEditDraft(payloadToDraft(row?.payload));
    setEditError("");
  };

  const closeEditRow = () => {
    if (editSaving) return;
    setEditRow(null);
    setEditError("");
  };

  const saveEditRow = async () => {
    if (!editRow || editSaving) return;
    setEditSaving(true);
    setEditError("");
    try {
      const res = await previewMembersImportRows([draftToRawRow(editDraft, editRow.rowNumber)]);
      const fixed = res?.data?.validRows?.[0] || null;
      const stillInvalid = res?.data?.invalidRows?.[0] || null;
      if (fixed) {
        setImportPreview((prev) => ({
          ...prev,
          validRows: [...(prev?.validRows || []), fixed].sort((a, b) => a.rowNumber - b.rowNumber),
          invalidRows: (prev?.invalidRows || []).filter((r) => r.rowNumber !== editRow.rowNumber),
          summary: {
            ...(prev?.summary || {}),
            valid: (prev?.summary?.valid ?? 0) + 1,
            invalid: Math.max(0, (prev?.summary?.invalid ?? 0) - 1)
          }
        }));
        setEditRow(null);
      } else {
        const reasons = stillInvalid?.reasons || ["Row is still invalid."];
        setEditError(reasons.join(" • "));
        setEditRow((prev) => (prev ? { ...prev, reasons, payload: stillInvalid?.payload || prev.payload } : prev));
        setImportPreview((prev) => ({
          ...prev,
          invalidRows: (prev?.invalidRows || []).map((r) =>
            r.rowNumber === editRow.rowNumber
              ? { ...r, reasons, payload: stillInvalid?.payload || r.payload }
              : r
          )
        }));
      }
    } catch (e) {
      setEditError(e?.response?.data?.message || e?.message || "Failed to validate row");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl min-w-0 overflow-x-hidden">
      <div className="flex flex-row items-center justify-between gap-3 md:items-start md:justify-between">
        <div>
          <h2 className="font-bold text-gray-900 md:text-3xl lg:text-4xl text-xl">Members</h2>
          <p className="mt-1 text-gray-500 text-sm hidden md:block">Track and manage church members</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 md:gap-3">
          {/* Mobile: single Add Member button with popup */}
          <div className="relative md:hidden">
            <div className="inline-flex rounded-lg bg-blue-600 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => guarded(() => openCreate())}
                className="cck-allow-icons inline-flex items-center gap-2 px-3 py-2.5 font-semibold text-white hover:bg-blue-700 active:bg-blue-800 text-sm"
              >
                <span className="leading-none text-lg">+</span>
                Add Member
              </button>
              <div className="w-0.5 bg-white/40 my-1.5" />
              <button
                type="button"
                onClick={() => setMobileAddOpen((v) => !v)}
                className="cck-allow-icons inline-flex items-center px-2.5 py-2.5 font-semibold text-white hover:bg-blue-700 active:bg-blue-800 text-sm"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            {mobileAddOpen ? (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMobileAddOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                  {canCreate ? (
                    <button
                      type="button"
                      onClick={() => guarded(() => { setMobileAddOpen(false); openCreate(); })}
                      style={{ textAlign: "left", padding: "0.5rem 1rem" }}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                    >
                      Register Member
                    </button>
                  ) : null}
                  {isChurchAdmin ? (
                    <button
                      type="button"
                      onClick={() => guarded(() => { setMobileAddOpen(false); openRegLink(); })}
                      style={{ textAlign: "left", padding: "0.5rem 1rem" }}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                    >
                      Registration Link
                    </button>
                  ) : null}
                  {canImport ? (
                    <button
                      type="button"
                      onClick={() => guarded(() => { setMobileAddOpen(false); openImport(); })}
                      style={{ textAlign: "left", padding: "0.5rem 1rem" }}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Import Members
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          {/* Desktop: individual buttons */}
          {isChurchAdmin && (
            <button
              type="button"
              onClick={() => guarded(openRegLink)}
              className="hidden md:inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:bg-gray-100 text-sm"
            >
              Registration Link
            </button>
          )}
          {canImport && (
            <button
              type="button"
              onClick={() => guarded(openImport)}
              className="hidden md:inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:bg-gray-100 text-sm"
            >
              Import Members
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => guarded(openCreate)}
              className="hidden md:inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 text-sm"
            >
              <span className="leading-none text-lg">+</span>
              Add Member
            </button>
          )}
        </div>
      </div>

      <KpiGrid className="mt-4 gap-3 lg:grid-cols-4">
          {kpiLoading ? (
            <div className="col-span-2 lg:col-span-4 flex items-center justify-center"><Spinner className="text-gray-400" /></div>
          ) : (
            <>
              <KpiCard
                title="Total Members"
                value={memberKPI?.totalMembers}
                change={memberKPI?.change?.totalMembers}
                diff={memberKPI?.diff?.totalMembers}
                diffText={trendText(memberKPI?.diff?.totalMembers, memberKPI?.change?.totalMembers)}
                tooltip="The total count of everyone registered in your church, regardless of their current status."
                iconBg="bg-blue-50"
                iconColor="text-blue-500"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11Z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M3 20c0-3 2-5 5-5h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M21 20c0-3-2-5-5-5h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M8 20c0-3 1.8-5 4-5s4 2 4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
              />
              <KpiCard
                title="Active Members"
                value={memberKPI?.activeMembers ?? memberKPI?.currentMembers}
                change={memberKPI?.change?.activeMembers}
                diff={memberKPI?.diff?.activeMembers}
                diffText={trendText(memberKPI?.diff?.activeMembers, memberKPI?.change?.activeMembers, "active")}
                tooltip="Members who are currently attending and actively participating in church life."
                iconBg="bg-emerald-50"
                iconColor="text-emerald-500"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M17 11l1.5 1.5L21 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />
              <KpiCard
                title="Inactive Members"
                value={memberKPI?.inactiveMembers}
                change={memberKPI?.change?.inactiveMembers}
                diff={memberKPI?.diff?.inactiveMembers}
                diffText={trendText(memberKPI?.diff?.inactiveMembers, memberKPI?.change?.inactiveMembers, "inactive")}
                upIsGood={false}
                tooltip="Members who are dormant or temporarily away — still part of the church but not currently active."
                iconBg="bg-amber-50"
                iconColor="text-amber-500"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M4 20c0-4 3.5-6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M16 14v5M19.5 14v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
              />
              <KpiCard
                title="Former Members"
                value={memberKPI?.formerMembers}
                change={memberKPI?.change?.formerMembers}
                diff={memberKPI?.diff?.formerMembers}
                diffText={trendText(memberKPI?.diff?.formerMembers, memberKPI?.change?.formerMembers, "former")}
                upIsGood={false}
                tooltip="People who have left the church, transferred to another congregation, or are deceased."
                iconBg="bg-slate-100"
                iconColor="text-slate-500"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M12 12a4 4 0 100-8 4 4 0 000 8Z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M4 20c0-4 3.5-6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M15.5 14.5l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />
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

        <MemberTable onDeleted={refreshMembers} onCreate={openCreate} />
      </div>

      {canImport && importOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Import Members</div>
                <div className="mt-1 text-gray-500 text-xs">
                  {importStep === "upload" ? "Download template, fill it, then upload the Excel file." : null}
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
                    <div className="font-semibold text-gray-900 text-sm">1) Download Excel Template</div>
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
                    <div className="font-semibold text-gray-900 text-sm">2) Upload Filled Excel File</div>
                    <div className="mt-1 text-gray-500 text-xs">We will validate and show a preview before importing.</div>
                    <div className="mt-3">
                      <input
                        ref={importFileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        disabled={importLoading}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          onPickFile(f);
                        }}
                      />
                      <button
                        type="button"
                        disabled={importLoading}
                        onClick={() => importFileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (importLoading) return;
                          const f = e.dataTransfer?.files?.[0] || null;
                          onPickFile(f);
                        }}
                        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-blue-500">
                          <path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                        <span className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white text-sm">
                          {importLoading ? "Uploading…" : "Choose File"}
                        </span>
                        <span className="text-gray-400 text-xs">or drag and drop your filled Excel file here (.xlsx, .csv)</span>
                      </button>
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
                          Total: {importPreview?.summary?.total ?? 0} | Valid: {importPreview?.summary?.valid ?? 0} |{" "}
                          <span className={(importPreview?.summary?.invalid ?? 0) > 0 ? "font-semibold text-red-600" : ""}>
                            Invalid: {importPreview?.summary?.invalid ?? 0}
                          </span>
                        </div>
                        {(importPreview?.summary?.invalid ?? 0) > 0 ? (
                          <div className="mt-1 text-red-600 text-xs">
                            Invalid rows will be skipped. Click Edit on a row to fix it here, or fix your file and re-upload.
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={importLoading}
                          onClick={() => {
                            setImportStep("upload");
                            setImportPreview(null);
                            setImportResult(null);
                          }}
                          className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                        >
                          Choose another file
                        </button>
                        <button
                          type="button"
                          disabled={importLoading || !(importPreview?.summary?.valid > 0)}
                          onClick={runImport}
                          className="whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
                        >
                          {importLoading ? "Importing…" : "Import Valid Rows"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4">
                    {(importPreview?.invalidRows?.length ?? 0) > 0 ? (
                      <ImportDataTable
                        title={`Invalid Rows (${importPreview.invalidRows.length}) — click Edit to fix`}
                        rows={importPreview.invalidRows}
                        showReasons
                        tone="error"
                        onEdit={openEditRow}
                      />
                    ) : null}
                    <ImportDataTable
                      title="Valid Rows (first 500)"
                      rows={Array.isArray(importPreview?.validRows) ? importPreview.validRows : []}
                    />
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
                          Total: {importResult?.summary?.total ?? 0} | Imported: {importResult?.summary?.imported ?? 0} |{" "}
                          <span className={(importResult?.summary?.skipped ?? 0) > 0 ? "font-semibold text-red-600" : ""}>
                            Skipped: {importResult?.summary?.skipped ?? 0}
                          </span>
                        </div>
                        {(importResult?.summary?.skipped ?? 0) > 0 ? (
                          <div className="mt-1 text-red-600 text-xs">
                            Skipped rows were not imported. Fix them in your file and re-upload.
                          </div>
                        ) : null}
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
                    <div className="mt-4">
                      <ImportDataTable
                        title="Skipped / Invalid Rows (first 500)"
                        rows={importResult.invalidRows}
                        showReasons
                        tone="error"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit invalid import row modal */}
      {editRow ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Fix Row {editRow?.rowNumber ?? ""}</div>
                <div className="mt-1 text-gray-500 text-xs">Correct the values below — the row will be re-validated.</div>
              </div>
              <button
                type="button"
                onClick={closeEditRow}
                className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 shrink-0"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="p-4 md:p-6">
              {Array.isArray(editRow?.reasons) && editRow.reasons.length ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <div className="font-semibold text-red-700 text-xs mb-1">Issues found</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-red-600 text-xs">
                    {editRow.reasons.map((reason, i) => <li key={i}>{reason}</li>)}
                  </ul>
                </div>
              ) : null}
              {editError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{editError}</div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {EDIT_FIELDS.map((f) => (
                  <div key={f.key} className={f.key === "note" || f.key === "streetAddress" ? "md:col-span-2" : ""}>
                    <label className="block font-semibold text-gray-600 text-xs mb-1.5">
                      {f.label}{f.required ? <span className="text-red-500"> *</span> : null}
                    </label>
                    {f.options ? (
                      <select
                        value={editDraft[f.key] || ""}
                        onChange={(e) => setEditDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-700 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        {f.options.map((o) => (
                          <option key={o} value={o}>{o || "—"}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type === "date" ? "date" : "text"}
                        value={editDraft[f.key] || ""}
                        onChange={(e) => setEditDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-700 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditRow}
                  disabled={editSaving}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditRow}
                  disabled={editSaving}
                  className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 text-sm"
                >
                  {editSaving ? "Validating…" : "Save & Validate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Registration Link modal */}
      {regLinkOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Member Registration Link</div>
                <div className="mt-1 text-gray-500 text-xs">Share this link so people can register as members from home.</div>
              </div>
              <button
                type="button"
                onClick={() => setRegLinkOpen(false)}
                className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shrink-0 md:h-12 md:w-12"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              {regLinkError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{regLinkError}</div>
              )}

              {regLinkLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-32 rounded bg-gray-200" />
                  <div className="h-11 rounded-lg bg-gray-200" />
                </div>
              ) : regToken && regTokenActive ? (
                <>
                  <div>
                    <div className="font-semibold text-gray-600 text-xs mb-1.5">Shareable Link</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-700 text-xs font-mono break-all">
                        {regLink}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
                      >
                        {regLinkCopied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-xs">
                    Link is <span className="font-semibold">active</span>. Anyone with this link can register as a church member.
                  </div>

                  <div className="flex flex-col gap-2 md:flex-row">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={regLinkLoading}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                    >
                      Generate New Link
                    </button>
                    <button
                      type="button"
                      onClick={handleRevoke}
                      disabled={regLinkLoading}
                      className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 text-sm"
                    >
                      Revoke Link
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-4 text-center">
                    <div className="text-gray-500 text-sm mb-3">No active registration link. Generate one to start sharing.</div>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={regLinkLoading}
                      className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      Generate Link
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Member limit modal */}
      {limitModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
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
