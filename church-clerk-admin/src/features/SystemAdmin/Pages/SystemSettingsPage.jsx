import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../Auth/useAuth.js";
import { getSystemSettings, updateSystemSettings } from "../Services/systemAdmin.api.js";
import { updateMyPassword, updateMyProfile } from "../../Auth/Services/auth.api.js";

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
