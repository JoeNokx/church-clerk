import { useEffect, useState } from "react";
import { getSubscriptions } from "../services/adminBilling.api.js";

function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await getSubscriptions();
      setSubscriptions(res?.data?.subscriptions || []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="text-lg font-semibold text-gray-900">Subscriptions</div>
        <div className="mt-2 text-sm text-gray-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Subscriptions</div>
          <div className="mt-1 text-sm text-gray-600">View all church subscriptions (read-only).</div>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-500">
              <th className="py-2 pr-4">Church</th>
              <th className="py-2 pr-4">Plan</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Currency</th>
              <th className="py-2 pr-4">Interval</th>
              <th className="py-2 pr-4">Next billing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subscriptions.map((s) => (
              <tr key={s._id}>
                <td className="py-3 pr-4 font-medium text-gray-900">{s?.church?.name || "—"}</td>
                <td className="py-3 pr-4 text-gray-700">{s?.plan?.name || "—"}</td>
                <td className="py-3 pr-4 text-gray-700">{s.status}</td>
                <td className="py-3 pr-4 text-gray-700">{s.currency}</td>
                <td className="py-3 pr-4 text-gray-700">{s.billingInterval}</td>
                <td className="py-3 pr-4 text-gray-700">
                  {s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminSubscriptionsPage;
