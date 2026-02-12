import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getMySubscription } from "../../features/subscription/services/subscription.api.js";

function normalizePlanName(plan) {
  const name = plan?.name;
  return String(name || "")
    .trim()
    .toLowerCase();
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function daysLeft(dateValue) {
  if (!dateValue) return null;
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return null;
  const now = new Date();
  const diff = dt.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

function SubscriptionStatusBanner() {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [effectivePlan, setEffectivePlan] = useState(null);
  const [readOnly, setReadOnly] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMySubscription();
      const sub = res?.data?.subscription || null;
      const eff = res?.data?.effectivePlan || null;
      const ro = Boolean(res?.data?.readOnly);

      setSubscription(sub);
      setEffectivePlan(eff);
      setReadOnly(ro);

      if (typeof window !== "undefined") {
        localStorage.setItem("subscriptionReadOnly", ro ? "1" : "0");
      }
    } catch {
      setSubscription(null);
      setEffectivePlan(null);
      setReadOnly(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem("subscriptionReadOnly");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const t = setInterval(() => {
      load();
    }, 60 * 1000);

    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    load();
  }, [location.pathname]);

  const status = subscription?.status;
  const statusNorm = useMemo(() => normalizeStatus(status), [status]);

  const planName = useMemo(() => {
    const n = normalizePlanName(subscription?.plan);
    if (n) return n;
    return normalizePlanName(effectivePlan);
  }, [effectivePlan, subscription?.plan]);

  const isFreeTrial = statusNorm === "free_trial" || statusNorm === "trialing" || statusNorm === "free";
  const isPastDue = statusNorm === "past_due";

  const trialDaysRemaining = useMemo(() => (isFreeTrial ? daysLeft(subscription?.trialEnd) : null), [isFreeTrial, subscription?.trialEnd]);
  const graceDaysRemaining = useMemo(() => (isPastDue ? daysLeft(subscription?.gracePeriodEnd) : null), [isPastDue, subscription?.gracePeriodEnd]);

  const banner = useMemo(() => {
    if (loading) return null;
    if (!subscription) return null;

    if (isPastDue) {
      const remaining = graceDaysRemaining;
      const safeRemaining = remaining === null ? null : Math.max(0, remaining);

      if (safeRemaining === null) {
        return {
          variant: "danger",
          title: "Payment due",
          message: "Your subscription payment is due. Please renew to avoid being blocked.",
          showUpgrade: true
        };
      }

      if (safeRemaining <= 0) {
        return {
          variant: "danger",
          title: "Grace period ended",
          message: "Your grace period is over. You can view your data but actions are blocked until payment is made.",
          showUpgrade: true
        };
      }

      return {
        variant: "danger",
        title: "Grace period",
        message: `You have ${safeRemaining} day${safeRemaining === 1 ? "" : "s"} left to pay before actions are blocked.`,
        showUpgrade: true
      };
    }

    if (isFreeTrial) {
      const remaining = trialDaysRemaining;
      const safeRemaining = remaining === null ? null : Math.max(0, remaining);
      return {
        variant: "info",
        title: "Free trial",
        message:
          safeRemaining === null
            ? "You are currently on a free trial. Upgrade to keep using more features."
            : `You are on a free trial. ${safeRemaining} day${safeRemaining === 1 ? "" : "s"} left. Upgrade to continue.`,
        showUpgrade: true
      };
    }

    if (planName === "premium") {
      return null;
    }

    if (planName === "free lite" || planName === "basic" || planName === "standard") {
      return {
        variant: "info",
        title: "Upgrade",
        message: "Upgrade your plan to unlock more features.",
        showUpgrade: true
      };
    }

    return null;
  }, [graceDaysRemaining, isFreeTrial, isPastDue, loading, planName, subscription, trialDaysRemaining]);

  const cls = (variant) => {
    if (variant === "danger") return "border-red-200 bg-red-50 text-red-900";
    return "border-blue-200 bg-blue-50 text-blue-900";
  };

  if (!banner) return null;

  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${cls(banner.variant)}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold">{banner.title}</div>
          <div className="text-sm opacity-90">{banner.message}</div>
          {readOnly ? (
            <div className="mt-1 text-xs opacity-80">Read-only mode: actions are blocked until payment is resolved.</div>
          ) : null}
        </div>

        {banner.showUpgrade ? (
          <Link
            to="/dashboard/billing"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-800"
          >
            Upgrade / Pay now
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default SubscriptionStatusBanner;
