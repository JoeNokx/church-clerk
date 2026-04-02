import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../Auth/useAuth.js";
import {
  approveChurchSenderId,
  getSystemSettings,
  listSenderIdRequests,
  rejectChurchSenderId,
  updateSystemSettings
} from "../Services/systemAdmin.api.js";
import { updateMyPassword, updateMyProfile } from "../../Auth/services/auth.api.js";

function SystemSettingsPage() {
  const { user, refreshUser } = useAuth();

  const normalizedRole = useMemo(() => {
    return String(user?.role || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "");
  }, [user?.role]);

  const isSuperAdmin = useMemo(() => {
    return normalizedRole === "superadmin";
  }, [normalizedRole]);

  const isSupportAdmin = useMemo(() => {
    return normalizedRole === "supportadmin";
  }, [normalizedRole]);

  const trialOptions = useMemo(() => [3, 7, 14, 21, 30, 40], []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [tab, setTab] = useState("billing");

  const [senderIdLoading, setSenderIdLoading] = useState(false);
  const [senderIdError, setSenderIdError] = useState("");
  const [senderIdRows, setSenderIdRows] = useState([]);
  const [senderIdPagination, setSenderIdPagination] = useState(null);
  const [senderIdStatus, setSenderIdStatus] = useState("pending");
  const [senderIdSearch, setSenderIdSearch] = useState("");
  const [senderIdPage, setSenderIdPage] = useState(1);
  const [senderIdLimit] = useState(25);

  const [senderIdModalOpen, setSenderIdModalOpen] = useState(false);
  const [senderIdSelected, setSenderIdSelected] = useState(null);
  const [senderIdActionLoading, setSenderIdActionLoading] = useState(false);
  const [senderIdActionError, setSenderIdActionError] = useState("");
  const [senderIdActionSuccess, setSenderIdActionSuccess] = useState("");

  const [trialDays, setTrialDays] = useState(14);
  const [gracePeriodDays, setGracePeriodDays] = useState("7");

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await getSystemSettings();
      const s = res?.data?.settings || null;
      const td = Number(s?.trialDays);
      const gd = s?.gracePeriodDays;

      setTrialDays(Number.isFinite(td) ? td : 14);
      setGracePeriodDays(gd === null || gd === undefined ? "7" : String(gd));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load system settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setFullName(String(user?.fullName || ""));
    setEmail(String(user?.email || ""));
    setPhoneNumber(String(user?.phoneNumber || ""));
  }, [user?.email, user?.fullName, user?.phoneNumber]);

  const canSave = isSuperAdmin || isSupportAdmin;

  const fmtDateTime = useCallback((value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  }, []);

  const loadSenderIdRequests = useCallback(
    async ({ nextPage } = {}) => {
      const actualPage = nextPage ?? senderIdPage;

      setSenderIdLoading(true);
      setSenderIdError("");
      try {
        const res = await listSenderIdRequests({
          status: senderIdStatus,
          search: senderIdSearch || undefined,
          page: actualPage,
          limit: senderIdLimit
        });

        const data = Array.isArray(res?.data?.data) ? res.data.data : [];
        setSenderIdRows(data);
        setSenderIdPagination(res?.data?.pagination || null);
        setSenderIdPage(actualPage);
      } catch (e) {
        setSenderIdRows([]);
        setSenderIdPagination(null);
        setSenderIdError(e?.response?.data?.message || e?.message || "Failed to load sender ID requests");
      } finally {
        setSenderIdLoading(false);
      }
    },
    [senderIdLimit, senderIdPage, senderIdSearch, senderIdStatus]
  );

  useEffect(() => {
    if (tab !== "sender-ids") return;
    void loadSenderIdRequests({ nextPage: 1 });
  }, [loadSenderIdRequests, tab]);

  useEffect(() => {
    if (tab !== "sender-ids") return;
    const t = setTimeout(() => {
      void loadSenderIdRequests({ nextPage: 1 });
    }, 300);
    return () => clearTimeout(t);
  }, [senderIdSearch, senderIdStatus, tab, loadSenderIdRequests]);

  const onSave = async () => {
    if (!canSave) return;

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        trialDays,
        gracePeriodDays: gracePeriodDays === "" ? 0 : Number(gracePeriodDays)
      };

      await updateSystemSettings(payload);
      setSuccess("System settings updated");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to update system settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="text-2xl font-semibold text-gray-900">System Settings</div>
        <div className="text-sm text-gray-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-2xl font-semibold text-gray-900">System Settings</div>
        <div className="text-sm text-gray-600">Configure trial and grace period behavior for all churches.</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("billing")}
          className={`h-10 rounded-lg px-4 text-sm font-semibold ${
            tab === "billing" ? "bg-blue-700 text-white" : "border border-gray-200 bg-white text-gray-700"
          }`}
        >
          Trial & Grace
        </button>
        <button
          type="button"
          onClick={() => setTab("sender-ids")}
          className={`h-10 rounded-lg px-4 text-sm font-semibold ${
            tab === "sender-ids" ? "bg-blue-700 text-white" : "border border-gray-200 bg-white text-gray-700"
          }`}
        >
          Requested IDs
        </button>
        <button
          type="button"
          onClick={() => setTab("profile")}
          className={`h-10 rounded-lg px-4 text-sm font-semibold ${
            tab === "profile" ? "bg-blue-700 text-white" : "border border-gray-200 bg-white text-gray-700"
          }`}
        >
          My Profile
        </button>
      </div>

      {tab === "billing" ? (
        <>
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
          ) : null}
          {success ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">{success}</div>
          ) : null}

          {!canSave ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You can view system settings, but only a system admin can update them.
            </div>
          ) : null}

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Free Trial Duration</div>
            <div className="mt-1 text-xs text-gray-500">Select how many days a new church gets in free trial.</div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Trial days</label>
              <select
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value))}
                disabled={!canSave || saving}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm disabled:opacity-60"
              >
                {trialOptions.map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Grace Period (Payment Due)</div>
            <div className="mt-1 text-xs text-gray-500">
              After subscription expires and payment is due, users have this many days to pay before the system blocks actions.
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Grace period days</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={gracePeriodDays}
                onChange={(e) => setGracePeriodDays(e.target.value)}
                disabled={!canSave || saving}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm disabled:opacity-60"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave || saving}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
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
        </>
      ) : tab === "sender-ids" ? (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Requested Sender IDs</div>
            <div className="mt-1 text-xs text-gray-500">
              Review church Sender ID requests and approve or reject them after completing approval on Africa&apos;s Talking.
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
              <input
                value={senderIdSearch}
                onChange={(e) => setSenderIdSearch(e.target.value)}
                placeholder="Search church name, email, phone, city, sender ID…"
                className="h-11 w-full md:w-96 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />

              <select
                value={senderIdStatus}
                onChange={(e) => setSenderIdStatus(e.target.value)}
                className="h-11 w-full md:w-64 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="pending">Pending: Under review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All</option>
              </select>

              <div className="flex-1" />

              <button
                type="button"
                onClick={() => loadSenderIdRequests({ nextPage: 1 })}
                disabled={senderIdLoading}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
              >
                Refresh
              </button>
            </div>

            {senderIdError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{senderIdError}</div>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-gray-400">
                  <tr className="border-b">
                    <th className="py-3 text-left font-semibold">Church</th>
                    <th className="py-3 text-left font-semibold">Requested ID</th>
                    <th className="py-3 text-left font-semibold">Status</th>
                    <th className="py-3 text-left font-semibold">Requested At</th>
                    <th className="py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {senderIdLoading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500">
                        Loading requests…
                      </td>
                    </tr>
                  ) : senderIdRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500">
                        No requests found.
                      </td>
                    </tr>
                  ) : (
                    senderIdRows.map((row) => {
                      const st = String(row?.sender_id_status || "").trim().toLowerCase();
                      const pill =
                        st === "approved"
                          ? "bg-green-100 text-green-700"
                          : st === "pending"
                            ? "bg-blue-100 text-blue-700"
                            : st === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700";
                      const label =
                        st === "approved"
                          ? "Approved"
                          : st === "pending"
                            ? "Pending: Under review"
                            : st === "rejected"
                              ? "Rejected"
                              : "—";

                      return (
                        <tr key={row?._id} className="border-b last:border-b-0">
                          <td className="py-3 text-gray-900">{row?.name || "—"}</td>
                          <td className="py-3 text-gray-700">{row?.sender_id || "—"}</td>
                          <td className="py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${pill}`}>{label}</span>
                          </td>
                          <td className="py-3 text-gray-700">{fmtDateTime(row?.sender_id_requested_at)}</td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSenderIdSelected(row || null);
                                setSenderIdActionError("");
                                setSenderIdActionSuccess("");
                                setSenderIdModalOpen(true);
                              }}
                              className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => loadSenderIdRequests({ nextPage: Math.max(1, senderIdPage - 1) })}
                disabled={senderIdLoading || !(senderIdPagination?.hasPrev ?? senderIdPage > 1)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
              >
                Prev
              </button>
              <div className="text-xs text-gray-600">
                Page {senderIdPage}
                {senderIdPagination?.totalPages ? ` / ${senderIdPagination.totalPages}` : ""}
              </div>
              <button
                type="button"
                onClick={() => loadSenderIdRequests({ nextPage: senderIdPage + 1 })}
                disabled={senderIdLoading || !(senderIdPagination?.hasNext ?? false)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          {senderIdModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="w-full max-w-xl rounded-xl bg-white shadow-xl overflow-hidden">
                <div className="border-b border-gray-200 px-5 py-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Sender ID Request</div>
                    <div className="mt-1 text-xs text-gray-500">Review and take action.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (senderIdActionLoading) return;
                      setSenderIdModalOpen(false);
                      setSenderIdSelected(null);
                      setSenderIdActionError("");
                      setSenderIdActionSuccess("");
                    }}
                    disabled={senderIdActionLoading}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Close
                  </button>
                </div>

                <div className="px-5 py-4">
                  {senderIdActionError ? (
                    <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{senderIdActionError}</div>
                  ) : null}
                  {senderIdActionSuccess ? (
                    <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">{senderIdActionSuccess}</div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                      <div className="text-xs font-semibold text-gray-500">Church</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{senderIdSelected?.name || "—"}</div>
                      <div className="mt-1 text-xs text-gray-600">Type: {senderIdSelected?.type || "—"}</div>
                      <div className="mt-1 text-xs text-gray-600">Email: {senderIdSelected?.email || "—"}</div>
                      <div className="mt-1 text-xs text-gray-600">Phone: {senderIdSelected?.phoneNumber || "—"}</div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                      <div className="text-xs font-semibold text-gray-500">Requested Sender ID</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{senderIdSelected?.sender_id || "—"}</div>
                      <div className="mt-1 text-xs text-gray-600">Status: {String(senderIdSelected?.sender_id_status || "—")}</div>
                      <div className="mt-1 text-xs text-gray-600">Requested at: {fmtDateTime(senderIdSelected?.sender_id_requested_at)}</div>
                      <div className="mt-1 text-xs text-gray-600">Approved at: {fmtDateTime(senderIdSelected?.sender_id_approved_at)}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                    <a
                      href={senderIdSelected?._id ? `/admin/churches/${senderIdSelected._id}` : "#"}
                      className="text-sm font-semibold text-blue-800 hover:underline"
                    >
                      View church
                    </a>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={senderIdActionLoading || !senderIdSelected?._id}
                        onClick={async () => {
                          if (!senderIdSelected?._id) return;
                          setSenderIdActionLoading(true);
                          setSenderIdActionError("");
                          setSenderIdActionSuccess("");
                          try {
                            const res = await rejectChurchSenderId(senderIdSelected._id);
                            const updated = res?.data?.data || null;
                            setSenderIdSelected(updated || senderIdSelected);
                            setSenderIdActionSuccess("Rejected");
                            await loadSenderIdRequests({ nextPage: senderIdPage });
                          } catch (e) {
                            setSenderIdActionError(e?.response?.data?.message || e?.message || "Failed to reject sender ID");
                          } finally {
                            setSenderIdActionLoading(false);
                          }
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-800 shadow-sm hover:bg-red-100 disabled:opacity-60"
                      >
                        {senderIdActionLoading ? "Working…" : "Reject"}
                      </button>
                      <button
                        type="button"
                        disabled={senderIdActionLoading || !senderIdSelected?._id}
                        onClick={async () => {
                          if (!senderIdSelected?._id) return;
                          setSenderIdActionLoading(true);
                          setSenderIdActionError("");
                          setSenderIdActionSuccess("");
                          try {
                            const res = await approveChurchSenderId(senderIdSelected._id);
                            const updated = res?.data?.data || null;
                            setSenderIdSelected(updated || senderIdSelected);
                            setSenderIdActionSuccess("Approved");
                            await loadSenderIdRequests({ nextPage: senderIdPage });
                          } catch (e) {
                            setSenderIdActionError(e?.response?.data?.message || e?.message || "Failed to approve sender ID");
                          } finally {
                            setSenderIdActionLoading(false);
                          }
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
                      >
                        {senderIdActionLoading ? "Working…" : "Approve"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {profileError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{profileError}</div>
          ) : null}
          {profileSuccess ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">{profileSuccess}</div>
          ) : null}

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Profile</div>
            <div className="mt-1 text-xs text-gray-500">Update your system admin profile details.</div>

            <div className="mt-4 grid gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-600">Full name</div>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={profileSaving}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600">Email</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={profileSaving}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600">Phone number</div>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={profileSaving}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600">Profile image</div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={profileSaving}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setAvatarFile(f);
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={profileSaving}
                  onClick={async () => {
                    setProfileSaving(true);
                    setProfileError("");
                    setProfileSuccess("");
                    try {
                      const fd = new FormData();
                      fd.append("fullName", String(fullName || "").trim());
                      fd.append("email", String(email || "").trim());
                      fd.append("phoneNumber", String(phoneNumber || "").trim());
                      if (avatarFile) fd.append("avatar", avatarFile);

                      await updateMyProfile(fd);
                      await refreshUser?.();
                      setAvatarFile(null);
                      setProfileSuccess("Profile updated");
                    } catch (e) {
                      setProfileError(e?.response?.data?.message || e?.message || "Failed to update profile");
                    } finally {
                      setProfileSaving(false);
                    }
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
                >
                  {profileSaving ? "Saving…" : "Save profile"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Change password</div>
            <div className="mt-1 text-xs text-gray-500">Use a strong password and do not share it.</div>

            <div className="mt-4 grid gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-600">Old password</div>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={profileSaving}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600">New password</div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={profileSaving}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600">Confirm password</div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={profileSaving}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={profileSaving}
                  onClick={async () => {
                    setProfileSaving(true);
                    setProfileError("");
                    setProfileSuccess("");
                    try {
                      await updateMyPassword({ oldPassword, newPassword, confirmPassword });
                      setOldPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setProfileSuccess("Password updated");
                    } catch (e) {
                      setProfileError(e?.response?.data?.message || e?.message || "Failed to update password");
                    } finally {
                      setProfileSaving(false);
                    }
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
                >
                  {profileSaving ? "Saving…" : "Update password"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SystemSettingsPage;
