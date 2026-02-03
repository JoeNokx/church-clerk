import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import { getMySubscription, getAvailablePlans, initializePaystackPayment } from "../services/subscription.api.js";

function BillingPage() {
  const { user } = useAuth();

  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [planId, setPlanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState("");

  const isSuperadmin = user?.role === "superadmin" || user?.role === "super_admin";

  const currency = useMemo(() => subscription?.currency || "", [subscription]);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [subRes, plansRes] = await Promise.all([getMySubscription(), getAvailablePlans()]);
      const sub = subRes?.data?.subscription;
      const fetchedPlans = plansRes?.data?.plans || [];

      setSubscription(sub || null);
      setPlans(fetchedPlans);

      if (sub?.billingInterval) {
        setBillingInterval(sub.billingInterval);
      }

      if (sub?.plan?._id) {
        setPlanId(sub.plan._id);
      } else if (fetchedPlans[0]?._id) {
        setPlanId(fetchedPlans[0]._id);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load billing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperadmin) return;
    load();
  }, [isSuperadmin]);

  const onPay = async () => {
    if (isSuperadmin) {
      return;
    }

    if (!planId) {
      setError("Please select a plan");
      return;
    }

    setPayLoading(true);
    setError("");
    try {
      const res = await initializePaystackPayment({ planId, billingInterval });
      const authorizationUrl = res?.data?.authorizationUrl;
      if (!authorizationUrl) {
        throw new Error("Missing Paystack authorization url");
      }
      window.location.assign(authorizationUrl);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to start payment");
      setPayLoading(false);
    }
  };

  if (isSuperadmin) {
    return <Navigate to="/admin/billing/plans" replace />;
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <div className="text-lg font-semibold text-gray-900">Billing</div>
        <div className="mt-2 text-sm text-gray-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Billing</div>
          <div className="mt-1 text-sm text-gray-600">Manage your subscription and payments.</div>
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
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <div className="text-sm font-semibold text-gray-900">Current subscription</div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <div className="text-gray-500">Status</div>
              <div className="mt-1 font-medium text-gray-900">{subscription?.status || "—"}</div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <div className="text-gray-500">Plan</div>
              <div className="mt-1 font-medium text-gray-900">{subscription?.plan?.name || "—"}</div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <div className="text-gray-500">Next billing date</div>
              <div className="mt-1 font-medium text-gray-900">
                {subscription?.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : "—"}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <div className="text-gray-500">Currency</div>
              <div className="mt-1 font-medium text-gray-900">{currency || "—"}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-sm font-semibold text-gray-900">Upgrade / renew</div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-500">Plan</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select plan
              </option>
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-500">Billing interval</label>
            <select
              value={billingInterval}
              onChange={(e) => setBillingInterval(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="halfYear">Half Year</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onPay}
            disabled={payLoading}
            className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {payLoading ? "Redirecting…" : "Proceed to Paystack"}
          </button>

          <div className="mt-3 text-xs text-gray-500">
            You will be redirected to Paystack to complete payment.
          </div>
        </div>
      </div>
    </div>
  );
}

export default BillingPage;
