import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getGlobalAnnouncementWalletKpis,
  getSystemChurches,
  getSystemRoles,
  listSystemInAppAnnouncements,
  createSystemInAppAnnouncement,
  updateSystemInAppAnnouncement,
  deleteSystemInAppAnnouncement,
  getSystemSettings,
  updateSystemSettings,
  getSupportRequests,
  updateSupportRequestStatusApi
} from "../Services/systemAdmin.api.js";
import Spinner from "../../../shared/components/Spinner.jsx";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import PageTabs from "../../../shared/components/PageTabs/index.jsx";
import KpiGrid from "../../../shared/components/KpiGrid/index.jsx";
import KpiStatCard from "../../../shared/components/KpiStatCard/index.jsx";
import ConfirmDeleteModal from "../../../shared/components/ConfirmDeleteModal/index.jsx";
import Card from "../../../shared/components/Card/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import Button from "../../../shared/components/Button/index.jsx";

function AnnouncementsPage() {
  const [tab, setTab] = useState("support");
  const [commTab, setCommTab] = useState("compose");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [creditsPerGhs, setCreditsPerGhs] = useState("100");
  const [smsCostCredits, setSmsCostCredits] = useState("5");

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
  const [composeKind, setComposeKind] = useState("message");
  const [composeScheduledAt, setComposeScheduledAt] = useState("");

  const [composeEditingId, setComposeEditingId] = useState(null);

  const [churchPickerOpen, setChurchPickerOpen] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const churchPickerRef = useRef(null);
  const rolePickerRef = useRef(null);

  const [composeExpiresAt, setComposeExpiresAt] = useState("");

  const [composeSaving, setComposeSaving] = useState(false);
  const [composeError, setComposeError] = useState("");
  const [composeSuccess, setComposeSuccess] = useState("");

  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false);
  const [archivingId, setArchivingId] = useState(null);

  const [srLoading, setSrLoading] = useState(false);
  const [srError, setSrError] = useState("");
  const [srRows, setSrRows] = useState([]);
  const [srPagination, setSrPagination] = useState(null);
  const [srSearch, setSrSearch] = useState("");
  const [srStatusFilter, setSrStatusFilter] = useState("");
  const [srDetailRow, setSrDetailRow] = useState(null);
  const [srUpdatingId, setSrUpdatingId] = useState(null);

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

      setCreditsPerGhs(cpg === null || cpg === undefined ? "100" : String(cpg));
      setSmsCostCredits(sms === null || sms === undefined ? "5" : String(sms));

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
    async ({ status, kind } = {}) => {
      setAnnLoading(true);
      setAnnError("");
      try {
        const res = await listSystemInAppAnnouncements({ page: 1, limit: 30, status: status || "", kind: kind || "" });
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
    if (commTab === "scheduled") void loadAnnouncements({ status: "scheduled", kind: "message" });
    else if (commTab === "drafts") void loadAnnouncements({ status: "draft", kind: "message" });
    else if (commTab === "templates") void loadAnnouncements({ status: "draft", kind: "template" });
    else if (commTab === "history") void loadAnnouncements({ status: "sent", kind: "message" });
  }, [commTab, loadAnnouncements, tab]);

  const loadSupportRequests = useCallback(async ({ page = 1, search = srSearch, status = srStatusFilter } = {}) => {
    setSrLoading(true);
    setSrError("");
    try {
      const res = await getSupportRequests({ page, limit: 20, search, status });
      const payload = res?.data;
      setSrRows(Array.isArray(payload?.supportRequests) ? payload.supportRequests : []);
      setSrPagination(payload?.pagination || null);
    } catch (e) {
      setSrError(e?.response?.data?.message || e?.message || "Failed to load support requests");
      setSrRows([]);
    } finally {
      setSrLoading(false);
    }
  }, [srSearch, srStatusFilter]);

  useEffect(() => {
    if (tab !== "support") return;
    void loadSupportRequests({ page: 1 });
  }, [tab, loadSupportRequests]);

  const handleSrStatusUpdate = async (id, newStatus) => {
    setSrUpdatingId(id);
    try {
      await updateSupportRequestStatusApi(id, { status: newStatus });
      setSrRows((prev) => prev.map((r) => r._id === id ? { ...r, status: newStatus } : r));
      if (srDetailRow?._id === id) setSrDetailRow((prev) => ({ ...prev, status: newStatus }));
    } catch (e) {
      setSrError(e?.response?.data?.message || e?.message || "Failed to update status");
    } finally {
      setSrUpdatingId(null);
    }
  };

  useEffect(() => {
    const handler = (event) => {
      const churchEl = churchPickerRef.current;
      const roleEl = rolePickerRef.current;

      if (churchPickerOpen && churchEl && !churchEl.contains(event.target)) {
        setChurchPickerOpen(false);
      }
      if (rolePickerOpen && roleEl && !roleEl.contains(event.target)) {
        setRolePickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, [churchPickerOpen, rolePickerOpen]);

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
      const isTemplate = composeSendMode === "template" || composeKind === "template";
      const kind = isTemplate ? "template" : "message";
      const sendMode = isTemplate ? "draft" : composeSendMode;

      const isSending = sendMode === "now" || sendMode === "schedule";
      if (isSending && !composeExpiresAt) {
        setComposeError("Expiration date is required before sending or scheduling an announcement.");
        return;
      }

      const payload = {
        title: String(composeTitle || "").trim(),
        message: String(composeMessage || "").trim(),
        kind,
        priority: composePriority,
        displayTypes: selectedDisplayTypes,
        bannerDurationMinutes: composeBannerDurationMinutes === "" ? 5 : Number(composeBannerDurationMinutes),
        target: {
          type: composeTargetType,
          churchIds: composeTargetType === "churches" ? composeChurchIds : [],
          roles: composeTargetType === "roles" ? composeRoles : []
        },
        sendMode,
        scheduledAt: sendMode === "schedule" ? composeScheduledAt : undefined,
        expiresAt: composeExpiresAt || undefined
      };

      if (composeEditingId) {
        await updateSystemInAppAnnouncement(composeEditingId, payload);
      } else {
        await createSystemInAppAnnouncement(payload);
      }
      setComposeSuccess(
        isTemplate
          ? "Template saved"
          : sendMode === "draft"
            ? "Draft saved"
            : sendMode === "schedule"
              ? "Announcement scheduled"
              : composeEditingId
                ? "Announcement updated"
                : "Announcement sent"
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
      setComposeKind("message");
      setComposeScheduledAt("");
      setComposeExpiresAt("");
      setComposeEditingId(null);

      if (commTab !== "compose") {
        if (commTab === "scheduled") void loadAnnouncements({ status: "scheduled", kind: "message" });
        else if (commTab === "drafts") void loadAnnouncements({ status: "draft", kind: "message" });
        else if (commTab === "templates") void loadAnnouncements({ status: "draft", kind: "template" });
        else if (commTab === "history") void loadAnnouncements({ status: "sent", kind: "message" });
      }
    } catch (e) {
      setComposeError(e?.response?.data?.message || e?.message || "Failed to send announcement");
    } finally {
      setComposeSaving(false);
    }
  };

  const populateComposeFromRow = useCallback((row, { mode } = {}) => {
    const r = row || {};
    setComposeTitle(String(r?.title || ""));
    setComposeMessage(String(r?.message || ""));
    setComposePriority(String(r?.priority || "informational"));

    const dt = Array.isArray(r?.displayTypes) ? r.displayTypes : [];
    setComposeDisplayTypes({
      modal: dt.includes("modal"),
      banner: dt.includes("banner"),
      notification: dt.includes("notification")
    });

    setComposeBannerDurationMinutes(r?.bannerDurationMinutes === null || r?.bannerDurationMinutes === undefined ? "5" : String(r.bannerDurationMinutes));
    setComposeTargetType(String(r?.target?.type || "all"));
    setComposeChurchIds(Array.isArray(r?.target?.churchIds) ? r.target.churchIds.map((x) => String(x)) : []);
    setComposeRoles(Array.isArray(r?.target?.roles) ? r.target.roles.map((x) => String(x)) : []);

    const expDt = r?.expiresAt ? new Date(r.expiresAt) : null;
    if (expDt && !Number.isNaN(expDt.getTime())) {
      const pad = (n) => String(n).padStart(2, "0");
      setComposeExpiresAt(`${expDt.getFullYear()}-${pad(expDt.getMonth() + 1)}-${pad(expDt.getDate())}T${pad(expDt.getHours())}:${pad(expDt.getMinutes())}`);
    } else {
      setComposeExpiresAt("");
    }

    const kind = String(r?.kind || "message");
    setComposeKind(kind);

    if (mode === "edit") {
      setComposeEditingId(r?._id || null);
      if (kind === "template") {
        setComposeSendMode("template");
        setComposeScheduledAt("");
      } else if (String(r?.status) === "scheduled") {
        setComposeSendMode("schedule");
        const dtLocal = r?.scheduledAt ? new Date(r.scheduledAt) : null;
        if (dtLocal && !Number.isNaN(dtLocal.getTime())) {
          const pad = (n) => String(n).padStart(2, "0");
          const y = dtLocal.getFullYear();
          const m = pad(dtLocal.getMonth() + 1);
          const d = pad(dtLocal.getDate());
          const hh = pad(dtLocal.getHours());
          const mm = pad(dtLocal.getMinutes());
          setComposeScheduledAt(`${y}-${m}-${d}T${hh}:${mm}`);
        } else {
          setComposeScheduledAt("");
        }
      } else {
        setComposeSendMode(String(r?.status) === "draft" ? "draft" : "now");
        setComposeScheduledAt("");
      }
    } else {
      setComposeEditingId(null);
      setComposeKind("message");
      setComposeSendMode("now");
      setComposeScheduledAt("");
      setComposeExpiresAt("");
    }

    setTab("communications");
    setCommTab("compose");
    setComposeError("");
    setComposeSuccess("");
  }, []);

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirmModal?.row?._id) return;
    setDeleteConfirmLoading(true);
    try {
      await deleteSystemInAppAnnouncement(deleteConfirmModal.row._id);
      const { kind } = deleteConfirmModal;
      setDeleteConfirmModal(null);
      if (kind === "scheduled") void loadAnnouncements({ status: "scheduled", kind: "message" });
      else if (kind === "draft") void loadAnnouncements({ status: "draft", kind: "message" });
      else if (kind === "template") void loadAnnouncements({ status: "draft", kind: "template" });
      else void loadAnnouncements({ status: "sent", kind: "message" });
    } catch (e) {
      setAnnError(e?.response?.data?.message || e?.message || "Failed to delete");
      setDeleteConfirmModal(null);
    } finally {
      setDeleteConfirmLoading(false);
    }
  };

  const handleArchive = async (id) => {
    if (!id) return;
    setArchivingId(id);
    try {
      await updateSystemInAppAnnouncement(id, { status: "archived" });
      void loadAnnouncements({ status: "sent", kind: "message" });
    } catch (e) {
      setAnnError(e?.response?.data?.message || e?.message || "Failed to archive");
    } finally {
      setArchivingId(null);
    }
  };

  const onUseDraft = useCallback(
    async (row) => {
      populateComposeFromRow(row, { mode: "use" });
      if (!row?._id) return;
      try {
        await deleteSystemInAppAnnouncement(row._id);
      } catch {
        void 0;
      }
    },
    [populateComposeFromRow]
  );

  const onSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        creditsPerGhs: creditsPerGhs === "" ? undefined : Number(creditsPerGhs),
        smsCostCredits: smsCostCredits === "" ? undefined : Number(smsCostCredits)
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

      <PageTabs
        tabs={[
          { key: "support", label: "Support Requests" },
          { key: "system", label: "System Controls & KPIs" },
          { key: "communications", label: "In-App Communications" }
        ]}
        activeTab={tab}
        onChange={setTab}
        sticky={false}
      />

      {tab === "system" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <Card.Header title="Credit Configuration" />
            <div className="text-xs text-gray-500">Configure credit-to-money conversion and per-channel costs.</div>

            {loading ? <div className="flex items-center justify-center"><Spinner className="text-gray-400" /></div> : null}
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
            {success ? <div className="text-sm text-green-600">{success}</div> : null}

            <Card.Body>
              <div className="grid gap-3">
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
                  <div className="text-xs font-semibold text-gray-600">SMS Cost per Segment (Credits)</div>
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
                  <div className="mt-1 text-xs text-gray-500">Cost per SMS segment (160 chars GSM-7 / 70 chars UCS-2).</div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="primary"
                    onClick={onSave}
                    disabled={loading || saving}
                    loading={saving}
                    loadingText="Saving…"
                  >
                    Save
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={load}
                    disabled={saving}
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header title="Global Wallet KPIs" />
            <div className="text-xs text-gray-500">System-wide view across all churches.</div>

            <KpiGrid className="gap-3">
              <KpiStatCard
                label="Total Wallet Balance"
                value={loading ? "…" : Number.isFinite(Number(kpis?.totalWalletBalanceCredits)) ? `${Number(kpis.totalWalletBalanceCredits).toLocaleString()} Credits` : "—"}
                subLabel={Number.isFinite(Number(balanceGhs)) ? `≈ ${Number(balanceGhs).toLocaleString()} GHS` : undefined}
              />
              <KpiStatCard
                label="Total Credits Issued"
                value={loading ? "…" : Number.isFinite(Number(kpis?.totalCreditsIssued)) ? Number(kpis.totalCreditsIssued).toLocaleString() : "—"}
              />
              <KpiStatCard
                label="Total Credits Used"
                value={loading ? "…" : Number.isFinite(Number(kpis?.totalCreditsUsed)) ? Number(kpis.totalCreditsUsed).toLocaleString() : "—"}
              />
              <KpiStatCard
                label="Total Wallet Transactions"
                value={loading ? "…" : Number.isFinite(Number(kpis?.totalWalletTransactions)) ? Number(kpis.totalWalletTransactions).toLocaleString() : "—"}
              />
              <KpiStatCard
                label="Total SMS Sent"
                value={loading ? "…" : Number.isFinite(Number(kpis?.totalSmsSent)) ? Number(kpis.totalSmsSent).toLocaleString() : "—"}
              />
              <KpiStatCard
                label="Subscription SMS Granted (Current Period)"
                value={loading ? "…" : Number.isFinite(Number(kpis?.totalIncludedGranted)) ? Number(kpis.totalIncludedGranted).toLocaleString() : "—"}
              />
              <KpiStatCard
                label="Subscription SMS Used (Current Period)"
                value={loading ? "…" : Number.isFinite(Number(kpis?.totalIncludedUsed)) ? Number(kpis.totalIncludedUsed).toLocaleString() : "—"}
              />
              <KpiStatCard
                label="Subscription SMS Remaining (Current Period)"
                value={loading ? "…" : Number.isFinite(Number(kpis?.totalIncludedRemaining)) ? Number(kpis.totalIncludedRemaining).toLocaleString() : "—"}
              />
            </KpiGrid>
          </Card>
        </div>
      ) : tab === "communications" ? (
        <div className="space-y-4">
          <PageTabs
            tabs={[
              { key: "compose", label: "Compose" },
              { key: "templates", label: "Templates" },
              { key: "drafts", label: "Drafts" },
              { key: "scheduled", label: "Scheduled" },
              { key: "history", label: "Message History" }
            ]}
            activeTab={commTab}
            onChange={setCommTab}
            sticky={false}
          />

          <Card>
            <Card.Body>
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
                      onChange={(e) => {
                        const v = e.target.value;
                        setComposeSendMode(v);
                        setComposeKind(v === "template" ? "template" : "message");
                        if (v !== "schedule") setComposeScheduledAt("");
                      }}
                      disabled={composeSaving}
                      className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="now">Send now</option>
                      <option value="schedule">Schedule</option>
                      <option value="draft">Save as draft</option>
                      <option value="template">Save as template</option>
                    </select>
                    {composeEditingId ? (
                      <div className="mt-1 text-xs text-gray-500">Editing: {String(composeEditingId).slice(-6)}</div>
                    ) : null}
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

                <div>
                  <div className="text-xs font-semibold text-gray-600">
                    Expiration Date &amp; Time
                    {(composeSendMode === "now" || composeSendMode === "schedule") ? (
                      <span className="ml-1 text-red-500">*</span>
                    ) : (
                      <span className="ml-1 font-normal text-gray-400">(optional for drafts/templates)</span>
                    )}
                  </div>
                  <input
                    type="datetime-local"
                    value={composeExpiresAt}
                    onChange={(e) => setComposeExpiresAt(e.target.value)}
                    disabled={composeSaving}
                    className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <div className="mt-1 text-xs text-gray-500">After this date/time, the announcement will no longer be shown to users (including newly registered users).</div>
                </div>

                {composeTargetType === "churches" ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-600">Select Churches</div>
                    <div ref={churchPickerRef} className="relative mt-1">
                      <button
                        type="button"
                        onClick={() => setChurchPickerOpen((v) => !v)}
                        disabled={composeSaving}
                        className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                      >
                        <span className="truncate">{composeChurchIds.length ? `${composeChurchIds.length} selected` : "Choose churches"}</span>
                        <span className="text-gray-400">▾</span>
                      </button>

                      {churchPickerOpen ? (
                        <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                          <div className="max-h-56 overflow-y-auto">
                            {churchesLoading ? (
                              <div className="px-3 py-3 flex items-center justify-center"><Spinner className="text-gray-400" /></div>
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
                          <div className="border-t border-gray-100 px-3 py-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setChurchPickerOpen(false)}
                              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {composeTargetType === "roles" ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-600">Select Church Roles</div>
                    <div ref={rolePickerRef} className="relative mt-1">
                      <button
                        type="button"
                        onClick={() => setRolePickerOpen((v) => !v)}
                        disabled={composeSaving}
                        className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                      >
                        <span className="truncate">{composeRoles.length ? `${composeRoles.length} selected` : "Choose roles"}</span>
                        <span className="text-gray-400">▾</span>
                      </button>

                      {rolePickerOpen ? (
                        <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                          <div className="max-h-56 overflow-y-auto">
                            {rolesLoading ? (
                              <div className="px-3 py-3 flex items-center justify-center"><Spinner className="text-gray-400" /></div>
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
                          <div className="border-t border-gray-100 px-3 py-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setRolePickerOpen(false)}
                              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
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
                  {composeEditingId ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setComposeEditingId(null);
                        setComposeTitle("");
                        setComposeMessage("");
                        setComposePriority("informational");
                        setComposeDisplayTypes({ modal: false, banner: false, notification: true });
                        setComposeBannerDurationMinutes("5");
                        setComposeTargetType("all");
                        setComposeChurchIds([]);
                        setComposeRoles([]);
                        setComposeSendMode("now");
                        setComposeKind("message");
                        setComposeScheduledAt("");
                        setComposeExpiresAt("");
                      }}
                      disabled={composeSaving}
                    >
                      Cancel Edit
                    </Button>
                  ) : null}
                  <Button
                    variant="primary"
                    onClick={onComposeSubmit}
                    disabled={composeSaving}
                    loading={composeSaving}
                    loadingText="Saving…"
                  >
                    {composeSendMode === "template" ? "Save Template" : composeSendMode === "draft" ? "Save Draft" : composeSendMode === "schedule" ? "Schedule" : composeEditingId ? "Update" : "Send"}
                  </Button>
                </div>
              </div>
            ) : commTab === "scheduled" ? (
              <div className="space-y-3">
                {annError ? <div className="text-sm text-red-600">{annError}</div> : null}
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-100">
                      <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                        <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Title</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Target</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Display Type</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Scheduled</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {annLoading ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-500">
                            Loading...
                          </td>
                        </tr>
                      ) : annRows.length ? (
                        annRows.map((r) => (
                          <tr key={r?._id} className="max-md:text-xs text-gray-700 text-sm">
                            <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={r?.title || ""}>
                              <span className="sm:hidden">{truncateMobileName(r?.title)}</span>
                              <span className="hidden sm:inline">{truncateDesktopName(r?.title)}</span>
                            </td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtTarget(r?.target)}</td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{Array.isArray(r?.displayTypes) ? r.displayTypes.join(", ") : "—"}</td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtDateTime(r?.scheduledAt)}</td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{r?.status || "—"}</td>
                            <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => populateComposeFromRow(r, { mode: "edit" })}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                  Edit
                                </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmModal({ row: r, kind: "scheduled" })}
                                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6}>
                            <EmptyState compact illustration="announcements" title="No scheduled announcements." />
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
            ) : commTab === "drafts" ? (
              <div className="space-y-3">
                {annError ? <div className="text-sm text-red-600">{annError}</div> : null}
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-100">
                      <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                        <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Title</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Target</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Display Type</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Updated</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {annLoading ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-500">
                            Loading...
                          </td>
                        </tr>
                      ) : annRows.length ? (
                        annRows.map((r) => (
                          <tr key={r?._id} className="max-md:text-xs text-gray-700 text-sm">
                            <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={r?.title || ""}>
                              <span className="sm:hidden">{truncateMobileName(r?.title)}</span>
                              <span className="hidden sm:inline">{truncateDesktopName(r?.title)}</span>
                            </td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtTarget(r?.target)}</td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{Array.isArray(r?.displayTypes) ? r.displayTypes.join(", ") : "—"}</td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtDateTime(r?.updatedAt)}</td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{r?.status || "—"}</td>
                            <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => void onUseDraft(r)}
                                  className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
                                >
                                  Use
                                </button>
                                <button
                                  type="button"
                                  onClick={() => populateComposeFromRow(r, { mode: "edit" })}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmModal({ row: r, kind: "draft" })}
                                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6}>
                            <EmptyState compact illustration="announcements" title="No drafts." />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="text-xs text-gray-500">Drafts are deleted automatically after you click Use.</div>
              </div>
            ) : commTab === "templates" ? (
              <div className="space-y-3">
                {annError ? <div className="text-sm text-red-600">{annError}</div> : null}
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-100">
                      <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                        <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Title</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Target</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Display Type</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Updated</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {annLoading ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-gray-500">
                            Loading...
                          </td>
                        </tr>
                      ) : annRows.length ? (
                        annRows.map((r) => (
                          <tr key={r?._id} className="max-md:text-xs text-gray-700 text-sm">
                            <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={r?.title || ""}>
                              <span className="sm:hidden">{truncateMobileName(r?.title)}</span>
                              <span className="hidden sm:inline">{truncateDesktopName(r?.title)}</span>
                            </td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtTarget(r?.target)}</td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{Array.isArray(r?.displayTypes) ? r.displayTypes.join(", ") : "—"}</td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtDateTime(r?.updatedAt)}</td>
                            <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => populateComposeFromRow(r, { mode: "use" })}
                                  className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
                                >
                                  Use
                                </button>
                                <button
                                  type="button"
                                  onClick={() => populateComposeFromRow(r, { mode: "edit" })}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmModal({ row: r, kind: "template" })}
                                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5}>
                            <EmptyState compact illustration="templates" title="No templates." />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {annError ? <div className="text-sm text-red-600">{annError}</div> : null}
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-100">
                      <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                        <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Title</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Target</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Display Type</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Sent</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                        <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {annLoading ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-500">
                            Loading...
                          </td>
                        </tr>
                      ) : annRows.length ? (
                        annRows.map((r) => (
                          <tr key={r?._id} className="max-md:text-xs text-gray-700 text-sm">
                            <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={r?.title || ""}>
                              <span className="sm:hidden">{truncateMobileName(r?.title)}</span>
                              <span className="hidden sm:inline">{truncateDesktopName(r?.title)}</span>
                            </td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtTarget(r?.target)}</td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{Array.isArray(r?.displayTypes) ? r.displayTypes.join(", ") : "—"}</td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{fmtDateTime(r?.sentAt)}</td>
                            <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6">{r?.status || "—"}</td>
                            <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleArchive(r?._id)}
                                  disabled={archivingId === r?._id}
                                  className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  {archivingId === r?._id ? "Archiving…" : "Archive"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmModal({ row: r, kind: "history" })}
                                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6}>
                            <EmptyState compact illustration="announcements" title="No announcements." />
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
            </Card.Body>
          </Card>
        </div>
      ) : null}
      {tab === "support" ? (
        <div className="space-y-4">
          <FilterBar
            searchValue={srSearch}
            onSearchChange={setSrSearch}
            searchPlaceholder="Search subject, name, church…"
            searchWidth="w-56"
            selects={[
              {
                key: "status",
                value: srStatusFilter,
                onChange: setSrStatusFilter,
                placeholder: "All Statuses",
                options: [
                  { label: "Open", value: "open" },
                  { label: "In Progress", value: "in_progress" },
                  { label: "Resolved", value: "resolved" },
                  { label: "Closed", value: "closed" }
                ]
              }
            ]}
          >
            <Button
              variant="primary"
              onClick={() => loadSupportRequests({ page: 1, search: srSearch, status: srStatusFilter })}
            >
              Search
            </Button>
          </FilterBar>

          {srError ? <div className="text-sm text-red-600">{srError}</div> : null}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                    <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Ticket #</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Subject</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Category</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Name</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Church</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Submitted</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Status</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {srLoading ? (
                    <tr><td colSpan={8} className="py-8 text-center"><Spinner className="mx-auto text-gray-400" /></td></tr>
                  ) : srRows.length ? (
                    srRows.map((r) => {
                      const statusColors = {
                        open: "bg-blue-50 text-blue-700 border-blue-200",
                        in_progress: "bg-yellow-50 text-yellow-700 border-yellow-200",
                        resolved: "bg-green-50 text-green-700 border-green-200",
                        closed: "bg-gray-100 text-gray-500 border-gray-200"
                      };
                      return (
                        <tr key={r?._id} className="group max-md:text-xs text-gray-700 text-sm hover:bg-gray-50">
                          <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6 group-hover:bg-gray-50">
                            <span className="font-mono text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">{r?.ticketNumber || "—"}</span>
                          </td>
                          <td className="max-md:px-4 py-1.5 text-gray-900 max-w-[200px] truncate px-4 md:px-6">{r?.subject || "—"}</td>
                          <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6">{r?.category || "—"}</td>
                          <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6" title={r?.name || r?.submittedBy?.fullName || ""}>
                            <span className="sm:hidden">{truncateMobileName(r?.name || r?.submittedBy?.fullName)}</span>
                            <span className="hidden sm:inline">{truncateDesktopName(r?.name || r?.submittedBy?.fullName)}</span>
                          </td>
                          <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6" title={r?.churchName || r?.church?.name || ""}>
                            <span className="sm:hidden">{truncateMobileName(r?.churchName || r?.church?.name)}</span>
                            <span className="hidden sm:inline">{truncateDesktopName(r?.churchName || r?.church?.name)}</span>
                          </td>
                          <td className="max-md:px-4 py-1.5 text-gray-500 whitespace-nowrap px-4 md:px-6 text-xs">{r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</td>
                          <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[r?.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                              {r?.status === "in_progress" ? "In Progress" : r?.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : "—"}
                            </span>
                          </td>
                          <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSrDetailRow(r)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                View
                              </button>
                              {r?.status !== "resolved" && r?.status !== "closed" ? (
                                <button
                                  type="button"
                                  disabled={srUpdatingId === r?._id}
                                  onClick={() => handleSrStatusUpdate(r._id, "resolved")}
                                  className="rounded-lg border border-green-200 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                                >
                                  Resolve
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={8}><EmptyState compact illustration="support" title="No support requests found." /></td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {srPagination ? (
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-4 py-3">
                <button
                  type="button"
                  disabled={!srPagination?.hasPrev}
                  onClick={() => loadSupportRequests({ page: srPagination.prevPage })}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-xs text-gray-500">Page {srPagination.currentPage} of {srPagination.totalPages || 1}</span>
                <button
                  type="button"
                  disabled={!srPagination?.hasNext}
                  onClick={() => loadSupportRequests({ page: srPagination.nextPage })}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}

      {srDetailRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div className="font-semibold text-gray-900">Support Request Details</div>
              <button type="button" onClick={() => setSrDetailRow(null)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5">
              <div className="col-span-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-500">Subject</div>
                  {srDetailRow?.ticketNumber && (
                    <span className="font-mono text-xs bg-blue-50 border border-blue-200 rounded px-2 py-0.5 text-blue-700">{srDetailRow.ticketNumber}</span>
                  )}
                </div>
                <div className="mt-1 font-semibold text-gray-900 text-sm">{srDetailRow?.subject || "—"}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold text-gray-500">Category</div>
                <div className="mt-1 text-gray-900 text-sm">{srDetailRow?.category || "—"}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold text-gray-500">Status</div>
                <div className="mt-1 text-gray-900 text-sm capitalize">{srDetailRow?.status === "in_progress" ? "In Progress" : srDetailRow?.status || "—"}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold text-gray-500">Name</div>
                <div className="mt-1 text-gray-900 text-sm">{srDetailRow?.name || srDetailRow?.submittedBy?.fullName || "—"}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold text-gray-500">Church</div>
                <div className="mt-1 text-gray-900 text-sm">{srDetailRow?.churchName || srDetailRow?.church?.name || "—"}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold text-gray-500">Email</div>
                <div className="mt-1 text-gray-900 text-sm">{srDetailRow?.submittedBy?.email || "—"}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold text-gray-500">Submitted</div>
                <div className="mt-1 text-gray-900 text-sm">{srDetailRow?.createdAt ? new Date(srDetailRow.createdAt).toLocaleString() : "—"}</div>
              </div>
              <div className="col-span-2 rounded-lg border border-gray-200 bg-white px-4 py-3">
                <div className="text-xs font-semibold text-gray-500">Description</div>
                <div className="mt-1 text-gray-900 whitespace-pre-wrap text-sm">{srDetailRow?.description || "—"}</div>
              </div>
              {(srDetailRow?.rating || srDetailRow?.ratingFeedback) && (
                <div className="col-span-2 rounded-lg border border-purple-100 bg-purple-50 px-4 py-3">
                  <div className="text-xs font-semibold text-purple-700 mb-1">User Rating &amp; Feedback</div>
                  {srDetailRow?.rating && (
                    <div className="flex items-center gap-1 text-amber-400 text-lg">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i}>{i < srDetailRow.rating ? "★" : "☆"}</span>
                      ))}
                      <span className="ml-2 text-xs text-purple-700 font-semibold">{srDetailRow.rating}/5</span>
                    </div>
                  )}
                  {srDetailRow?.ratingFeedback && (
                    <div className="mt-1 text-sm text-purple-800 italic">&ldquo;{srDetailRow.ratingFeedback}&rdquo;</div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
              <div className="flex items-center gap-2">
                {["open", "in_progress", "resolved", "closed"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={srUpdatingId === srDetailRow?._id || srDetailRow?.status === s}
                    onClick={() => handleSrStatusUpdate(srDetailRow._id, s)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                      srDetailRow?.status === s
                        ? "bg-blue-700 text-white border-blue-700"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setSrDetailRow(null)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDeleteModal
        open={!!deleteConfirmModal}
        title="Delete Announcement"
        message={`Are you sure you want to permanently delete "${deleteConfirmModal?.row?.title || "this announcement"}"? This cannot be undone.`}
        onCancel={() => setDeleteConfirmModal(null)}
        onConfirm={handleDeleteConfirmed}
        loading={deleteConfirmLoading}
      />
    </div>
  );
}

export default AnnouncementsPage;
