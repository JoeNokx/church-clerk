import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getGlobalAnnouncementWalletKpis,
  getSystemChurches,
  getSystemRoles,
  listSystemInAppAnnouncements,
  createSystemInAppAnnouncement,
  deleteSystemInAppAnnouncement,
  getSystemSettings,
  updateSystemSettings
} from "../Services/systemAdmin.api.js";

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-lg px-4 text-sm font-semibold ${
        active ? "bg-blue-700 text-white" : "border border-gray-200 bg-white text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function AnnouncementsPage() {
  const [tab, setTab] = useState("system");
  const [commTab, setCommTab] = useState("compose");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [creditsPerGhs, setCreditsPerGhs] = useState("100");
  const [smsCostCredits, setSmsCostCredits] = useState("5");
  const [whatsappCostCredits, setWhatsappCostCredits] = useState("20");

  const [kpis, setKpis] = useState(null);

  const [rolesLoading, setRolesLoading] = useState(false);
  const [systemRoles, setSystemRoles] = useState([]);
  const [churchRoles, setChurchRoles] = useState([]);

  const [churchesLoading, setChurchesLoading] = useState(false);
  const [churches, setChurches] = useState([]);

  const [annLoading, setAnnLoading] = useState(false);
  const [annError, setAnnError] = useState("");
  const [annRows, setAnnRows] = useState([]);
  const [annPagination, setAnnPagination] = useState(null);

  const [composeTitle, setComposeTitle] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composePriority, setComposePriority] = useState("informational");
  const [composeDisplayTypes, setComposeDisplayTypes] = useState({ modal: false, banner: false, notification: true });
  const [composeBannerDurationMinutes, setComposeBannerDurationMinutes] = useState("5");
  const [composeTargetType, setComposeTargetType] = useState("all");
  const [composeChurchIds, setComposeChurchIds] = useState([]);
  const [composeRoles, setComposeRoles] = useState([]);
  const [composeSendMode, setComposeSendMode] = useState("now");
  const [composeScheduledAt, setComposeScheduledAt] = useState("");

  const [composeSaving, setComposeSaving] = useState(false);
  const [composeError, setComposeError] = useState("");
  const [composeSuccess, setComposeSuccess] = useState("");

  const balanceGhs = useMemo(() => {
    const per = Number(creditsPerGhs);
    const balanceCredits = Number(kpis?.totalWalletBalanceCredits);
    if (!Number.isFinite(per) || per <= 0) return null;
    if (!Number.isFinite(balanceCredits)) return null;
    return balanceCredits / per;
  }, [creditsPerGhs, kpis?.totalWalletBalanceCredits]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const [settingsRes, kpiRes] = await Promise.all([getSystemSettings(), getGlobalAnnouncementWalletKpis()]);

      const s = settingsRes?.data?.settings || null;
      const cpg = s?.creditsPerGhs;
      const sms = s?.smsCostCredits;
      const wa = s?.whatsappCostCredits;

      setCreditsPerGhs(cpg === null || cpg === undefined ? "100" : String(cpg));
      setSmsCostCredits(sms === null || sms === undefined ? "5" : String(sms));
      setWhatsappCostCredits(wa === null || wa === undefined ? "20" : String(wa));

      setKpis(kpiRes?.data?.data || null);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load announcements settings");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await getSystemRoles();
      const data = res?.data?.data || {};
      setSystemRoles(Array.isArray(data?.systemRoles) ? data.systemRoles : []);
      setChurchRoles(Array.isArray(data?.churchRoles) ? data.churchRoles : []);
    } catch {
      setSystemRoles([]);
      setChurchRoles([]);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const loadChurches = useCallback(async () => {
    setChurchesLoading(true);
    try {
      const res = await getSystemChurches({ search: "" });
      const payload = res?.data?.data ?? res?.data;
      const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.churches) ? payload.churches : [];
      setChurches(rows);
    } catch {
      setChurches([]);
    } finally {
      setChurchesLoading(false);
    }
  }, []);

  const loadAnnouncements = useCallback(
    async ({ status } = {}) => {
      setAnnLoading(true);
      setAnnError("");
      try {
        const res = await listSystemInAppAnnouncements({ page: 1, limit: 30, status: status || "" });
        setAnnRows(Array.isArray(res?.data?.data) ? res.data.data : []);
        setAnnPagination(res?.data?.pagination || null);
      } catch (e) {
        setAnnRows([]);
        setAnnPagination(null);
        setAnnError(e?.response?.data?.message || e?.message || "Failed to load announcements");
      } finally {
        setAnnLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadRoles();
    void loadChurches();
  }, [loadChurches, loadRoles]);

  useEffect(() => {
    if (tab !== "communications") return;
    if (commTab === "sent") void loadAnnouncements({ status: "sent" });
    else if (commTab === "scheduled") void loadAnnouncements({ status: "scheduled" });
    else if (commTab === "history") void loadAnnouncements({ status: "" });
  }, [commTab, loadAnnouncements, tab]);

  const selectedDisplayTypes = useMemo(() => {
    const arr = [];
    if (composeDisplayTypes.modal) arr.push("modal");
    if (composeDisplayTypes.banner) arr.push("banner");
    if (composeDisplayTypes.notification) arr.push("notification");
    return arr;
  }, [composeDisplayTypes.banner, composeDisplayTypes.modal, composeDisplayTypes.notification]);

  const toggleListId = useCallback((list, id) => {
    const value = String(id || "");
    if (!value) return list;
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }, []);

  const fmtDateTime = useCallback((v) => {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  }, []);

  const fmtTarget = useCallback(
    (t) => {
      const type = String(t?.type || "all");
      if (type === "all") return "All Churches";
      if (type === "churches") {
        const ids = Array.isArray(t?.churchIds) ? t.churchIds : [];
        return ids.length ? `Specific Churches (${ids.length})` : "Specific Churches";
      }
      if (type === "roles") {
        const roles = Array.isArray(t?.roles) ? t.roles : [];
        return roles.length ? `Church Roles (${roles.length})` : "Church Roles";
      }
      return "—";
    },
    []
  );

  const onComposeSubmit = async () => {
    setComposeSaving(true);
    setComposeError("");
    setComposeSuccess("");
    try {
      const payload = {
        title: String(composeTitle || "").trim(),
        message: String(composeMessage || "").trim(),
        priority: composePriority,
        displayTypes: selectedDisplayTypes,
        bannerDurationMinutes: composeBannerDurationMinutes === "" ? 5 : Number(composeBannerDurationMinutes),
        target: {
          type: composeTargetType,
          churchIds: composeTargetType === "churches" ? composeChurchIds : [],
          roles: composeTargetType === "roles" ? composeRoles : []
        },
        sendMode: composeSendMode,
        scheduledAt: composeSendMode === "schedule" ? composeScheduledAt : undefined
      };

      await createSystemInAppAnnouncement(payload);
      setComposeSuccess(
        composeSendMode === "draft" ? "Draft saved" : composeSendMode === "schedule" ? "Announcement scheduled" : "Announcement sent"
      );
      setComposeTitle("");
      setComposeMessage("");
      setComposePriority("informational");
      setComposeDisplayTypes({ modal: false, banner: false, notification: true });
      setComposeBannerDurationMinutes("5");
      setComposeTargetType("all");
      setComposeChurchIds([]);
      setComposeRoles([]);
      setComposeSendMode("now");
      setComposeScheduledAt("");

      if (commTab !== "compose") {
        void loadAnnouncements({ status: commTab === "sent" ? "sent" : commTab === "scheduled" ? "scheduled" : "" });
      }
    } catch (e) {
      setComposeError(e?.response?.data?.message || e?.message || "Failed to send announcement");
    } finally {
      setComposeSaving(false);
    }
  };

  const onSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        creditsPerGhs: creditsPerGhs === "" ? undefined : Number(creditsPerGhs),
        smsCostCredits: smsCostCredits === "" ? undefined : Number(smsCostCredits),
        whatsappCostCredits: whatsappCostCredits === "" ? undefined : Number(whatsappCostCredits)
      };

      await updateSystemSettings(payload);
      setSuccess("Credit configuration updated");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to update credit configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <div className="text-2xl font-semibold text-gray-900">Announcements</div>
        <div className="mt-1 text-sm text-gray-600">Manage platform-wide announcements and system controls.</div>
      </div>

      <div className="flex items-center gap-2">
        <TabButton active={tab === "system"} onClick={() => setTab("system")}>
          System Controls &amp; KPIs
        </TabButton>
        <TabButton active={tab === "communications"} onClick={() => setTab("communications")}>
          In-App Communications
        </TabButton>
      </div>

      {tab === "system" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Credit Configuration</div>
            <div className="mt-1 text-xs text-gray-500">Configure credit-to-money conversion and per-channel costs.</div>

            {loading ? <div className="mt-4 text-sm text-gray-600">Loading…</div> : null}
            {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
            {success ? <div className="mt-4 text-sm text-green-600">{success}</div> : null}

            <div className="mt-4 grid gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-600">1 GHS = Credits</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={creditsPerGhs}
                  onChange={(e) => setCreditsPerGhs(e.target.value)}
                  disabled={loading || saving}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600">SMS Cost (Credits)</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={smsCostCredits}
                  onChange={(e) => setSmsCostCredits(e.target.value)}
                  disabled={loading || saving}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600">WhatsApp Cost (Credits)</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={whatsappCostCredits}
                  onChange={(e) => setWhatsappCostCredits(e.target.value)}
                  disabled={loading || saving}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={loading || saving}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                >
                  {saving ? "Saving…" : "Save"}
                </button>

                <button
                  type="button"
                  onClick={load}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Global Wallet KPIs</div>
            <div className="mt-1 text-xs text-gray-500">System-wide view across all churches.</div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-100 bg-slate-50 p-4">
                <div className="text-xs text-gray-500">Total Wallet Balance</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {loading ? "…" : Number.isFinite(Number(kpis?.totalWalletBalanceCredits)) ? `${Number(kpis.totalWalletBalanceCredits).toLocaleString()} Credits` : "—"}
                </div>
                {Number.isFinite(Number(balanceGhs)) ? (
                  <div className="mt-1 text-xs text-gray-500">≈ {Number(balanceGhs).toLocaleString()} GHS</div>
                ) : null}
              </div>
              <div className="rounded-lg border border-gray-100 bg-slate-50 p-4">
                <div className="text-xs text-gray-500">Total Credits Issued</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {loading ? "…" : Number.isFinite(Number(kpis?.totalCreditsIssued)) ? Number(kpis.totalCreditsIssued).toLocaleString() : "—"}
                </div>
              </div>
              <div className="rounded-lg border border-gray-100 bg-slate-50 p-4">
                <div className="text-xs text-gray-500">Total Credits Used</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {loading ? "…" : Number.isFinite(Number(kpis?.totalCreditsUsed)) ? Number(kpis.totalCreditsUsed).toLocaleString() : "—"}
                </div>
              </div>
              <div className="rounded-lg border border-gray-100 bg-slate-50 p-4">
                <div className="text-xs text-gray-500">Total Wallet Transactions</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {loading ? "…" : Number.isFinite(Number(kpis?.totalWalletTransactions)) ? Number(kpis.totalWalletTransactions).toLocaleString() : "—"}
                </div>
              </div>
              <div className="rounded-lg border border-gray-100 bg-slate-50 p-4 sm:col-span-2">
                <div className="text-xs text-gray-500">Total SMS Sent</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {loading ? "…" : Number.isFinite(Number(kpis?.totalSmsSent)) ? Number(kpis.totalSmsSent).toLocaleString() : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <TabButton active={commTab === "compose"} onClick={() => setCommTab("compose")}>
              Communications
            </TabButton>
            <TabButton active={commTab === "sent"} onClick={() => setCommTab("sent")}>
              Sent Messages
            </TabButton>
            <TabButton active={commTab === "scheduled"} onClick={() => setCommTab("scheduled")}>
              Scheduled Messages
            </TabButton>
            <TabButton active={commTab === "history"} onClick={() => setCommTab("history")}>
              Message History
            </TabButton>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            {commTab === "compose" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-600">Title</div>
                    <input
                      value={composeTitle}
                      onChange={(e) => setComposeTitle(e.target.value)}
                      disabled={composeSaving}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-600">Priority</div>
                    <select
                      value={composePriority}
                      onChange={(e) => setComposePriority(e.target.value)}
                      disabled={composeSaving}
                      className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="critical">Critical</option>
                      <option value="informational">Informational</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-600">Message</div>
                  <textarea
                    value={composeMessage}
                    onChange={(e) => setComposeMessage(e.target.value)}
                    disabled={composeSaving}
                    rows={5}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-600">Target</div>
                    <select
                      value={composeTargetType}
                      onChange={(e) => {
                        setComposeTargetType(e.target.value);
                        setComposeChurchIds([]);
                        setComposeRoles([]);
                      }}
                      disabled={composeSaving}
                      className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="all">All Churches</option>
                      <option value="churches">Specific Churches</option>
                      <option value="roles">Church Role</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-600">Send</div>
                    <select
                      value={composeSendMode}
                      onChange={(e) => setComposeSendMode(e.target.value)}
                      disabled={composeSaving}
                      className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="now">Send now</option>
                      <option value="schedule">Schedule</option>
                      <option value="draft">Save as draft</option>
                    </select>
                  </div>
                </div>

                {composeSendMode === "schedule" ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-600">Scheduled At</div>
                    <input
                      type="datetime-local"
                      value={composeScheduledAt}
                      onChange={(e) => setComposeScheduledAt(e.target.value)}
                      disabled={composeSaving}
                      className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                ) : null}

                {composeTargetType === "churches" ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-600">Select Churches</div>
                    <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                      {churchesLoading ? (
                        <div className="px-3 py-3 text-sm text-gray-600">Loading…</div>
                      ) : churches.length ? (
                        churches.map((c) => {
                          const id = String(c?._id || "");
                          const checked = id ? composeChurchIds.includes(id) : false;
                          return (
                            <label key={id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <span className="min-w-0 truncate">{c?.name || "—"}</span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => setComposeChurchIds((prev) => toggleListId(prev, id))}
                                disabled={composeSaving}
                              />
                            </label>
                          );
                        })
                      ) : (
                        <div className="px-3 py-3 text-sm text-gray-600">No churches</div>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Selected: {composeChurchIds.length}</div>
                  </div>
                ) : null}

                {composeTargetType === "roles" ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-600">Select Church Roles</div>
                    <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                      {rolesLoading ? (
                        <div className="px-3 py-3 text-sm text-gray-600">Loading…</div>
                      ) : churchRoles.length ? (
                        churchRoles.map((r) => {
                          const role = String(r || "");
                          const checked = role ? composeRoles.includes(role) : false;
                          return (
                            <label key={role} className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <span className="min-w-0 truncate">{role}</span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => setComposeRoles((prev) => toggleListId(prev, role))}
                                disabled={composeSaving}
                              />
                            </label>
                          );
                        })
                      ) : (
                        <div className="px-3 py-3 text-sm text-gray-600">No roles</div>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Selected: {composeRoles.length}</div>
                  </div>
                ) : null}

                <div>
                  <div className="text-xs font-semibold text-gray-600">Display Types</div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                      <span>Modal Popup</span>
                      <input
                        type="checkbox"
                        checked={composeDisplayTypes.modal}
                        onChange={() => setComposeDisplayTypes((v) => ({ ...v, modal: !v.modal }))}
                        disabled={composeSaving}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                      <span>Top Banner</span>
                      <input
                        type="checkbox"
                        checked={composeDisplayTypes.banner}
                        onChange={() => setComposeDisplayTypes((v) => ({ ...v, banner: !v.banner }))}
                        disabled={composeSaving}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                      <span>Notification Center</span>
                      <input
                        type="checkbox"
                        checked={composeDisplayTypes.notification}
                        onChange={() => setComposeDisplayTypes((v) => ({ ...v, notification: !v.notification }))}
                        disabled={composeSaving}
                      />
                    </label>
                  </div>
                </div>

                {composeDisplayTypes.banner ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-600">Banner Duration (minutes)</div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={composeBannerDurationMinutes}
                      onChange={(e) => setComposeBannerDurationMinutes(e.target.value)}
                      disabled={composeSaving}
                      className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                ) : null}

                {composeError ? <div className="text-sm text-red-600">{composeError}</div> : null}
                {composeSuccess ? <div className="text-sm text-green-600">{composeSuccess}</div> : null}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onComposeSubmit}
                    disabled={composeSaving}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
                  >
                    {composeSaving ? "Saving…" : composeSendMode === "draft" ? "Save Draft" : composeSendMode === "schedule" ? "Schedule" : "Send"}
                  </button>
                </div>
              </div>
            ) : commTab === "sent" ? (
              <div className="space-y-3">
                {annError ? <div className="text-sm text-red-600">{annError}</div> : null}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-xs uppercase text-gray-400">
                      <tr className="border-b">
                        <th className="py-3 text-left font-semibold">Title</th>
                        <th className="py-3 text-left font-semibold">Target</th>
                        <th className="py-3 text-left font-semibold">Display Type</th>
                        <th className="py-3 text-left font-semibold">Date Sent</th>
                        <th className="py-3 text-left font-semibold">Status</th>
                        <th className="py-3 text-left font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {annLoading ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-500">
                            Loading...
                          </td>
                        </tr>
                      ) : annRows.length ? (
                        annRows.map((r) => (
                          <tr key={r?._id} className="border-b last:border-b-0">
                            <td className="py-3 text-gray-900">{r?.title || "—"}</td>
                            <td className="py-3 text-gray-700">{fmtTarget(r?.target)}</td>
                            <td className="py-3 text-gray-700">{Array.isArray(r?.displayTypes) ? r.displayTypes.join(", ") : "—"}</td>
                            <td className="py-3 text-gray-700">{fmtDateTime(r?.sentAt)}</td>
                            <td className="py-3 text-gray-700">{r?.status || "—"}</td>
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!r?._id) return;
                                  try {
                                    await deleteSystemInAppAnnouncement(r._id);
                                    void loadAnnouncements({ status: "sent" });
                                  } catch {
                                    void 0;
                                  }
                                }}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-500">
                            No sent announcements.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {annPagination?.total ? (
                  <div className="text-xs text-gray-500">Total: {Number(annPagination.total).toLocaleString()}</div>
                ) : null}
              </div>
            ) : commTab === "scheduled" ? (
              <div className="space-y-3">
                {annError ? <div className="text-sm text-red-600">{annError}</div> : null}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-xs uppercase text-gray-400">
                      <tr className="border-b">
                        <th className="py-3 text-left font-semibold">Title</th>
                        <th className="py-3 text-left font-semibold">Target</th>
                        <th className="py-3 text-left font-semibold">Display Type</th>
                        <th className="py-3 text-left font-semibold">Scheduled</th>
                        <th className="py-3 text-left font-semibold">Status</th>
                        <th className="py-3 text-left font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {annLoading ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-500">
                            Loading...
                          </td>
                        </tr>
                      ) : annRows.length ? (
                        annRows.map((r) => (
                          <tr key={r?._id} className="border-b last:border-b-0">
                            <td className="py-3 text-gray-900">{r?.title || "—"}</td>
                            <td className="py-3 text-gray-700">{fmtTarget(r?.target)}</td>
                            <td className="py-3 text-gray-700">{Array.isArray(r?.displayTypes) ? r.displayTypes.join(", ") : "—"}</td>
                            <td className="py-3 text-gray-700">{fmtDateTime(r?.scheduledAt)}</td>
                            <td className="py-3 text-gray-700">{r?.status || "—"}</td>
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!r?._id) return;
                                  try {
                                    await deleteSystemInAppAnnouncement(r._id);
                                    void loadAnnouncements({ status: "scheduled" });
                                  } catch {
                                    void 0;
                                  }
                                }}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-500">
                            No scheduled announcements.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {annPagination?.total ? (
                  <div className="text-xs text-gray-500">Total: {Number(annPagination.total).toLocaleString()}</div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                {annError ? <div className="text-sm text-red-600">{annError}</div> : null}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-xs uppercase text-gray-400">
                      <tr className="border-b">
                        <th className="py-3 text-left font-semibold">Title</th>
                        <th className="py-3 text-left font-semibold">Target</th>
                        <th className="py-3 text-left font-semibold">Display Type</th>
                        <th className="py-3 text-left font-semibold">Sent</th>
                        <th className="py-3 text-left font-semibold">Status</th>
                        <th className="py-3 text-left font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {annLoading ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-500">
                            Loading...
                          </td>
                        </tr>
                      ) : annRows.length ? (
                        annRows.map((r) => (
                          <tr key={r?._id} className="border-b last:border-b-0">
                            <td className="py-3 text-gray-900">{r?.title || "—"}</td>
                            <td className="py-3 text-gray-700">{fmtTarget(r?.target)}</td>
                            <td className="py-3 text-gray-700">{Array.isArray(r?.displayTypes) ? r.displayTypes.join(", ") : "—"}</td>
                            <td className="py-3 text-gray-700">{fmtDateTime(r?.sentAt)}</td>
                            <td className="py-3 text-gray-700">{r?.status || "—"}</td>
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!r?._id) return;
                                  try {
                                    await deleteSystemInAppAnnouncement(r._id);
                                    void loadAnnouncements({ status: "" });
                                  } catch {
                                    void 0;
                                  }
                                }}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-500">
                            No announcements.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {annPagination?.total ? (
                  <div className="text-xs text-gray-500">Total: {Number(annPagination.total).toLocaleString()}</div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AnnouncementsPage;
