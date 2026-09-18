import { useEffect, useMemo, useRef, useState } from "react";
import {
  getReportsAnalyticsReport,
  exportReportsAnalyticsReport,
  getReportEntities,
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

const RADIO = (value, label) => ({ value, label });

// Per-module option definitions. Controls render in order; `showIf` receives the
// values of previously-declared controls. kind "radio" | "entity".
const EMPTY_MODULE_CONFIG = { controls: [] };

const MODULE_OPTIONS = {
  "programs-events": {
    controls: [
      {
        key: "status", kind: "radio", label: "Program status", default: "all",
        options: [RADIO("all", "All"), RADIO("upcoming", "Upcoming"), RADIO("ongoing", "Ongoing"), RADIO("past", "Past")]
      },
      {
        key: "scope", kind: "radio", label: "Report on", default: "all",
        options: [RADIO("all", "All programs"), RADIO("single", "A specific program")]
      },
      {
        key: "entity", kind: "entity", label: "Program",
        entityModule: "programs-events",
        entityParams: (o) => ({ status: o.status }),
        allLabel: "Select a program",
        showIf: (o) => o.scope === "single"
      },
      {
        key: "sub", kind: "radio", label: "Show", default: "offerings",
        options: [RADIO("offerings", "Offerings"), RADIO("attendance", "Attendance")],
        showIf: (o) => o.scope === "single" && !!o.entity
      },
      {
        key: "mode", kind: "radio", label: "Attendance by", default: "registration",
        options: [RADIO("registration", "Registration"), RADIO("total", "Total number")],
        showIf: (o) => o.scope === "single" && !!o.entity && o.sub === "attendance"
      }
    ],
    describe: (v, L) => {
      if (v.scope === "single") {
        const n = L("entity") ? `"${L("entity")}"` : "the selected program";
        if (v.sub === "attendance") {
          return `Attendance report for the program ${n} by ${v.mode === "total" ? "total number" : "registration"}.`;
        }
        return `Offerings report for the program ${n}.`;
      }
      const st = v.status && v.status !== "all" ? `${v.status} ` : "";
      return `Report on all ${st}programs and events.`;
    }
  },
  announcements: {
    controls: [
      {
        key: "type", kind: "radio", label: "Report type", default: "messages",
        options: [RADIO("messages", "Sent messages"), RADIO("wallet", "Wallet history")]
      }
    ],
    describe: (v) => v.type === "wallet"
      ? "Report on the announcement wallet history."
      : "Report on sent messages and announcements."
  },
  organisations: {
    controls: [
      {
        key: "orgType", kind: "radio", label: "Organisation type", default: "cell",
        options: [RADIO("cell", "Cell"), RADIO("department", "Department"), RADIO("group", "Group"), RADIO("ministry", "Ministry")]
      },
      {
        key: "scope", kind: "radio", label: "Report on", default: "all",
        options: [RADIO("all", "All"), RADIO("single", "Select one")]
      },
      {
        key: "entity", kind: "entity", label: "Organisation",
        entityModule: "organisations",
        entityParams: (o) => ({ orgType: o.orgType }),
        allLabel: "Select one",
        showIf: (o) => o.scope === "single"
      },
      {
        key: "sub", kind: "radio", label: "Show", default: "members",
        options: [RADIO("members", "Members"), RADIO("offerings", "Offerings"), RADIO("attendance", "Attendance")],
        showIf: (o) => o.scope === "single" && !!o.entity
      },
      {
        key: "mode", kind: "radio", label: "Attendance", default: "individual",
        options: [RADIO("individual", "Individual attendance"), RADIO("total", "Total attendance")],
        showIf: (o) => o.scope === "single" && !!o.entity && o.sub === "attendance"
      }
    ],
    describe: (v, L) => {
      const t = v.orgType || "cell";
      const plural = t === "ministry" ? "ministries" : `${t}s`;
      if (v.scope === "single") {
        const n = L("entity") ? `"${L("entity")}"` : `the selected ${t}`;
        if (v.sub === "offerings") return `Offerings report for the ${t} ${n}.`;
        if (v.sub === "attendance") {
          return `Attendance report for the ${t} ${n} showing ${v.mode === "total" ? "total" : "individual"} attendance.`;
        }
        return `Members report for the ${t} ${n}.`;
      }
      return `Report on all ${plural}.`;
    }
  },
  "outreach-followup": {
    controls: [
      {
        key: "type", kind: "radio", label: "Report on", default: "outreaches",
        options: [RADIO("outreaches", "Outreaches"), RADIO("prospects", "People reached"), RADIO("teams", "Teams"), RADIO("followups", "Follow-ups")]
      },
      {
        key: "scope", kind: "radio", label: "Outreaches", default: "all",
        options: [RADIO("all", "All outreaches"), RADIO("single", "One outreach")],
        showIf: (o) => o.type === "outreaches"
      },
      {
        key: "entity", kind: "entity", label: "Outreach",
        entityModule: "outreach-followup",
        entityParams: () => ({ type: "outreaches" }),
        allLabel: "Select an outreach",
        showIf: (o) => o.type === "outreaches" && o.scope === "single"
      },
      {
        key: "sub", kind: "radio", label: "Show", default: "prospects",
        options: [RADIO("prospects", "Prospects"), RADIO("followups", "Follow-ups")],
        showIf: (o) => o.type === "outreaches" && o.scope === "single" && !!o.entity
      },
      {
        key: "teamScope", kind: "radio", label: "Teams", default: "all",
        options: [RADIO("all", "All teams"), RADIO("single", "One team")],
        showIf: (o) => o.type === "teams",
        paramKey: "scope"
      },
      {
        key: "teamEntity", kind: "entity", label: "Team",
        entityModule: "outreach-followup",
        entityParams: () => ({ type: "teams" }),
        allLabel: "Select a team",
        showIf: (o) => o.type === "teams" && o.teamScope === "single",
        paramKey: "entity"
      },
      {
        key: "teamSub", kind: "radio", label: "Show", default: "members",
        options: [RADIO("members", "Team members"), RADIO("outreaches", "Team outreaches")],
        showIf: (o) => o.type === "teams" && o.teamScope === "single" && !!o.teamEntity,
        paramKey: "sub"
      }
    ],
    describe: (v, L) => {
      if (v.type === "prospects") return "Report on all people reached through outreach.";
      if (v.type === "followups") return "Report on all outreach follow-ups.";
      if (v.type === "teams") {
        if (v.teamScope === "single") {
          const n = L("teamEntity") ? `"${L("teamEntity")}"` : "the selected team";
          return v.teamSub === "outreaches"
            ? `Report on outreaches by the team ${n}.`
            : `Report on members of the team ${n}.`;
        }
        return "Report on all outreach teams.";
      }
      if (v.scope === "single") {
        const n = L("entity") ? `"${L("entity")}"` : "the selected outreach";
        return v.sub === "followups"
          ? `Report on follow-ups for the outreach ${n}.`
          : `Report on prospects for the outreach ${n}.`;
      }
      return "Report on all outreach events.";
    }
  },
  welfare: {
    controls: [
      {
        key: "type", kind: "radio", label: "Report type", default: "contributions",
        options: [RADIO("contributions", "Contributions"), RADIO("disbursements", "Disbursements")]
      }
    ],
    describe: (v) => v.type === "disbursements"
      ? "Report on welfare disbursements."
      : "Report on welfare contributions."
  },
  "church-projects": {
    controls: [
      {
        key: "type", kind: "radio", label: "Report on", default: "all",
        options: [RADIO("all", "All church projects"), RADIO("contributions", "Contributions"), RADIO("expenses", "Expenses")]
      },
      {
        key: "entity", kind: "entity", label: "Project",
        entityModule: "church-projects",
        allLabel: "All projects",
        showIf: (o) => o.type !== "all"
      }
    ],
    describe: (v, L) => {
      const n = L("entity") ? ` the "${L("entity")}" project` : " all church projects";
      if (v.type === "contributions") return `Report on contributions to${n}.`;
      if (v.type === "expenses") return `Report on expenses for${n}.`;
      return "Report on all church projects.";
    }
  },
  "business-ventures": {
    controls: [
      {
        key: "type", kind: "radio", label: "Report on", default: "all",
        options: [RADIO("all", "All business ventures"), RADIO("income", "Income"), RADIO("expenses", "Expenses")]
      },
      {
        key: "entity", kind: "entity", label: "Business venture",
        entityModule: "business-ventures",
        allLabel: "All business ventures",
        showIf: (o) => o.type !== "all"
      }
    ],
    describe: (v, L) => {
      const n = L("entity") ? ` the "${L("entity")}" venture` : " all business ventures";
      if (v.type === "income") return `Report on income for${n}.`;
      if (v.type === "expenses") return `Report on expenses for${n}.`;
      return "Report on all business ventures.";
    }
  },
  pledges: {
    controls: [
      {
        key: "type", kind: "radio", label: "Report on", default: "all",
        options: [RADIO("all", "All pledges"), RADIO("payments", "Payment history")]
      },
      {
        key: "entity", kind: "entity", label: "Pledge",
        entityModule: "pledges",
        allLabel: "All pledges",
        showIf: (o) => o.type === "payments"
      }
    ],
    describe: (v, L) => {
      if (v.type === "payments") {
        const n = L("entity") ? ` the "${L("entity")}" pledge` : " all pledges";
        return `Report on payment history for${n}.`;
      }
      return "Report on all pledges.";
    }
  },
  billing: {
    controls: [],
    describe: () => "Report on billing history."
  },
  audit: {
    controls: [
      {
        key: "entity", kind: "entity", label: "Module",
        entityModule: "audit",
        allLabel: "All modules"
      }
    ],
    describe: (v, L) => L("entity")
      ? `Report on audit activity for the "${L("entity")}" module.`
      : "Report on audit activity across all modules."
  },
  members: { controls: [], describe: () => "Report on all registered church members." },
  attendance: { controls: [], describe: () => "Report on church attendance records." },
  "attendance-total": { controls: [], describe: () => "Report on total attendance head-counts per service." },
  "attendance-individual": { controls: [], describe: () => "Report on individual member attendance per service." },
  visitors: { controls: [], describe: () => "Report on first-time and returning visitors." },
  tithe: { controls: [], describe: () => "Report on tithe records." },
  "tithe-individual": { controls: [], describe: () => "Report on tithe payments made by individual members." },
  "tithe-aggregate": { controls: [], describe: () => "Report on aggregate tithe totals per service or group." },
  offerings: { controls: [], describe: () => "Report on offering collections by service and type." },
  "special-funds": { controls: [], describe: () => "Report on special fund giving by category and giver." },
  expenses: { controls: [], describe: () => "Report on general church expenses by category." },
  budgeting: { controls: [], describe: () => "Report on budget items and allocations by fiscal year." }
};

function EntitySelect({ entityModule, entityParams, value, onChange, allLabel }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef(null);
  const paramsKey = JSON.stringify(entityParams || {});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getReportEntities({ module: entityModule, ...(entityParams || {}) })
      .then((res) => {
        if (!cancelled) setItems(Array.isArray(res?.data?.entities) ? res.data.entities : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityModule, paramsKey]);

  useEffect(() => {
    if (!loading && value && !items.some((i) => String(i._id) === String(value))) {
      onChange("", null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, items, value]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const selected = items.find((i) => String(i._id) === String(value));
  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((i) =>
        String(i?.label || "").toLowerCase().includes(q) ||
        String(i?.sub || "").toLowerCase().includes(q)
      )
    : items;

  const pick = (v, item) => {
    onChange(v, item || null);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm flex items-center justify-between gap-2 text-left"
      >
        <span className={`truncate ${selected ? "text-gray-700" : "text-gray-400"}`}>
          {selected
            ? `${selected.label}${selected.sub ? ` (${selected.sub})` : ""}`
            : loading ? "Loading…" : allLabel || "Select…"}
        </span>
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-gray-400">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Search…"
              className="h-8 w-full rounded-md border border-gray-200 px-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {allLabel ? (
              <button
                type="button"
                onClick={() => pick("", null)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!value ? "bg-blue-50 text-blue-700" : "text-gray-500"}`}
              >
                {allLabel}
              </button>
            ) : null}
            {filtered.length ? (
              filtered.map((i) => (
                <button
                  key={i._id}
                  type="button"
                  onClick={() => pick(i._id, i)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${String(i._id) === String(value) ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}
                >
                  <span className="block truncate">{i.label}{i.sub ? ` (${i.sub})` : ""}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-400">
                {loading ? "Loading…" : "No matches"}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReportPreviewModal({ preview, module, description, from, to, downloading, onDownload, onClose }) {
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
            {description ? (
              <div className="mt-0.5 text-gray-500 text-xs">{description}</div>
            ) : null}
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
  const [description, setDescription] = useState("");
  const [descTouched, setDescTouched] = useState(false);
  const [opts, setOpts] = useState({});
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const [saving, setSaving] = useState(false);

  const config = MODULE_OPTIONS[module?.value] || EMPTY_MODULE_CONFIG;
  const controls = config.controls;

  // Resolve each control's effective value (radios fall back to their default when
  // the stored value is not among the options) and which controls are visible.
  const { visibleControls, optionParams, paramVals, paramLabels } = useMemo(() => {
    const vals = {};
    const visible = [];
    for (const c of controls) {
      const shown = !c.showIf || c.showIf(vals);
      let v = opts[c.key];
      if (c.kind === "radio" && !c.options.some((o) => o.value === v)) {
        v = c.default;
      }
      vals[c.key] = v;
      if (shown) visible.push({ ...c, value: v });
    }
    const params = {};
    const pLabels = {};
    for (const c of controls) {
      if (c.kind === "entity") pLabels[c.key] = opts[`${c.key}Label`] || "";
    }
    for (const c of visible) {
      const paramKey = c.paramKey || c.key;
      if (c.value !== "" && c.value != null) params[paramKey] = c.value;
    }
    return { visibleControls: visible, optionParams: params, paramVals: vals, paramLabels: pLabels };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts, module]);

  const optionParamsKey = JSON.stringify(optionParams);

  const handleOptChange = (key, value, item) => {
    setOpts((prev) => ({
      ...prev,
      [key]: value,
      [`${key}Label`]: item?.label || ""
    }));
    setPreview(null);
  };

  // Contextual auto-description from the current selections.
  const autoDescription = useMemo(() => {
    if (!module) return "";
    const label = (k) => paramLabels[k] || "";
    let s = typeof config.describe === "function"
      ? config.describe(paramVals, label)
      : `${module.label} report.`;
    if (from && to) s += ` Period: ${from} to ${to}.`;
    else if (from) s += ` Period: from ${from}.`;
    else if (to) s += ` Period: until ${to}.`;
    return s;
  }, [module, config, paramVals, paramLabels, from, to]);

  // Keep the description auto-written until the user edits it manually.
  useEffect(() => {
    if (!descTouched) setDescription(autoDescription);
  }, [autoDescription, descTouched]);

  // A required entity select (no "all" option) that is visible but empty blocks generation.
  const missingEntity = visibleControls.some(
    (c) => c.kind === "entity" && !c.allLabel?.toLowerCase().startsWith("all") && !c.value
  );

  useEffect(() => {
    if (!open || !module?.value) return;

    setOpts({});
    setFields([]);
    setChecked([]);
    setFrom("");
    setTo("");
    setName(`${module.label} Report`);
    setDescTouched(false);
    setPreview(null);
    setError("");
    setDownloading("");
    setSaving(false);
  }, [open, module]);

  useEffect(() => {
    if (!open || !module?.value) return;

    let cancelled = false;
    const load = async () => {
      setFieldsLoading(true);
      try {
        const res = await getReportsAnalyticsReport({ module: module.value, ...optionParams });
        if (cancelled) return;
        const rep = res?.data?.report || null;
        const cols = rep?.availableColumns?.length ? rep.availableColumns : rep?.columns;
        const list = (Array.isArray(cols) ? cols : []).filter((c) => c?.key);
        setFields(list);
        setChecked(list.map((c) => c.key));
      } catch (e) {
        if (!cancelled) {
          setFields([]);
          setChecked([]);
          setError(e?.response?.data?.message || "Failed to load module fields");
        }
      } finally {
        if (!cancelled) setFieldsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, module, optionParamsKey]);

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
        fields: fieldsParam,
        ...optionParams
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
        fields: fieldsParam,
        description: description.trim() || undefined,
        ...optionParams
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
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        ...optionParams
      });
      onSaved?.(res?.data?.savedReport || null);
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  const actionDisabled = fieldsLoading || !checked.length || missingEntity;

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
                <div className="mt-0.5 text-gray-500 text-xs">Choose what to report on, pick fields and a date range, then preview, download or save.</div>
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

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">Report Description</label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setDescTouched(true);
                }}
                rows={2}
                placeholder={autoDescription}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-y"
              />
            </div>

            {visibleControls.length ? (
              <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                {visibleControls.map((c) => (
                  <div key={c.key}>
                    {c.label ? (
                      <label className="mb-1.5 block text-xs font-semibold text-gray-500">{c.label}</label>
                    ) : null}
                    {c.kind === "entity" ? (
                      <EntitySelect
                        entityModule={c.entityModule}
                        entityParams={c.entityParams ? c.entityParams(optionParams) : {}}
                        value={c.value || ""}
                        onChange={(v, item) => handleOptChange(c.key, v, item)}
                        allLabel={c.allLabel}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {c.options.map((o) => (
                          <label key={o.value} className="flex items-center gap-2 text-gray-700 text-sm">
                            <input
                              type="radio"
                              name={`opt-${module.value}-${c.key}`}
                              checked={c.value === o.value}
                              onChange={() => handleOptChange(c.key, o.value)}
                            />
                            <span>{o.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

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
              disabled={actionDisabled || previewLoading}
              onClick={runPreview}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
            >
              {previewLoading ? "Loading…" : "Preview"}
            </button>
            {canExport ? (
              <>
                <button
                  type="button"
                  disabled={actionDisabled || downloading === "pdf"}
                  onClick={() => download("pdf")}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  {downloading === "pdf" ? "Downloading…" : "Download PDF"}
                </button>
                <button
                  type="button"
                  disabled={actionDisabled || downloading === "csv"}
                  onClick={() => download("csv")}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  {downloading === "csv" ? "Downloading…" : "Download CSV"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              disabled={actionDisabled || saving}
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
          description={description}
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
