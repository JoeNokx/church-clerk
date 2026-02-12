import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../Auth/useAuth.js";
import { getSystemSettings, updateSystemSettings } from "../Services/systemAdmin.api.js";

function SystemSettingsPage() {
  const { user } = useAuth();

  const isSuperAdmin = useMemo(() => {
    const role = String(user?.role || "").toLowerCase();
    return role === "superadmin" || role === "super_admin";
  }, [user?.role]);

  const isSupportAdmin = useMemo(() => {
    const role = String(user?.role || "").toLowerCase();
    return role === "supportadmin" || role === "support_admin";
  }, [user?.role]);

  const trialOptions = useMemo(() => [3, 7, 14, 21, 30, 40], []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [trialDays, setTrialDays] = useState(14);
  const [gracePeriodDays, setGracePeriodDays] = useState("3");

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
      setGracePeriodDays(gd === null || gd === undefined ? "3" : String(gd));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load system settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    </div>
  );
}

export default SystemSettingsPage;
