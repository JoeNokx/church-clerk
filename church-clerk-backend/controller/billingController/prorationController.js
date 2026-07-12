import Subscription from "../../models/billingModel/subscriptionModel.js";
import Plan from "../../models/billingModel/planModel.js";
import Church from "../../models/churchModel.js";
import { getSystemSettingsSnapshot } from "../systemSettingsController.js";

const INTERVAL_DAYS = {
  monthly: 30,
  quarterly: 91,
  halfyear: 182,
  biannually: 182,
  yearly: 365,
  annually: 365,
};

export const normalizeBillingIntervalKey = (v) => {
  const s = String(v || "monthly").trim().toLowerCase();
  if (s === "halfyear" || s === "biannually") return "halfYear";
  if (s === "yearly" || s === "annually") return "yearly";
  if (s === "quarterly") return "quarterly";
  return "monthly";
};

const planRank = (name) => {
  const n = String(name || "").trim().toLowerCase();
  if (n === "free lite") return 0;
  if (n === "basic") return 1;
  if (n === "standard") return 2;
  if (n === "premium" || n.includes("premium")) return 3;
  return 99;
};

export const computeProration = (subscription, currentPlan, newPlan, intervalKey) => {
  const days = INTERVAL_DAYS[intervalKey?.toLowerCase()] || INTERVAL_DAYS[normalizeBillingIntervalKey(intervalKey)?.toLowerCase()] || 30;

  const now = new Date();
  const nextBilling = subscription.nextBillingDate ? new Date(subscription.nextBillingDate) : now;

  const normalizedKey = normalizeBillingIntervalKey(intervalKey);
  const currentPrice = Number(
    currentPlan?.pricing?.GHS?.[normalizedKey] ??
    currentPlan?.priceByCurrency?.GHS?.[normalizedKey] ?? 0
  );
  const newPrice = Number(
    newPlan?.pricing?.GHS?.[normalizedKey] ??
    newPlan?.priceByCurrency?.GHS?.[normalizedKey] ?? 0
  );

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Upgrading from a free plan: no credit to give, start a fresh full billing cycle from today.
  if (currentPrice === 0) {
    const freshNextBillingDate = new Date(now.getTime() + days * MS_PER_DAY);
    return {
      totalDays: days,
      remainingDays: days,
      remainingFraction: 1,
      currentPlanPrice: 0,
      newPlanPrice: newPrice,
      currentPlanCredit: 0,
      newPlanCost: newPrice,
      proratedAmount: newPrice,
      retainNextBillingDate: freshNextBillingDate,
      currency: "GHS",
    };
  }

  const remainingMs = Math.max(0, nextBilling.getTime() - now.getTime());
  const remainingDays = Math.ceil(remainingMs / MS_PER_DAY);
  const remainingFraction = Math.min(1, Math.max(0, remainingDays / days));

  // Billing cycle has already expired: no meaningful remaining period to prorate.
  // Charge the full new plan price and start a fresh cycle from today.
  if (remainingDays === 0) {
    const freshNextBillingDate = new Date(now.getTime() + days * MS_PER_DAY);
    return {
      totalDays: days,
      remainingDays: days,
      remainingFraction: 1,
      currentPlanPrice: currentPrice,
      newPlanPrice: newPrice,
      currentPlanCredit: 0,
      newPlanCost: newPrice,
      proratedAmount: newPrice,
      retainNextBillingDate: freshNextBillingDate,
      currency: "GHS",
    };
  }

  const currentCredit = Math.round(currentPrice * remainingFraction * 100) / 100;
  const newCost = Math.round(newPrice * remainingFraction * 100) / 100;
  const proratedAmount = Math.max(0, Math.round((newCost - currentCredit) * 100) / 100);

  // If the next billing date is within 24 hours (e.g. end-of-day tonight), the cron would
  // re-fire immediately after the upgrade payment. Advance by one full cycle so the user
  // gets the prorated period PLUS a clean gap before the next full charge.
  let retainNextBillingDate = nextBilling;
  if (retainNextBillingDate.getTime() <= now.getTime() + MS_PER_DAY) {
    retainNextBillingDate = new Date(retainNextBillingDate.getTime() + days * MS_PER_DAY);
  }

  return {
    totalDays: days,
    remainingDays,
    remainingFraction: Math.round(remainingFraction * 10000) / 10000,
    currentPlanPrice: currentPrice,
    newPlanPrice: newPrice,
    currentPlanCredit: currentCredit,
    newPlanCost: newCost,
    proratedAmount,
    retainNextBillingDate,
    currency: "GHS",
  };
};

export const calculateUpgradeProration = async (req, res) => {
  try {
    const { newPlanId, billingInterval } = req.query;

    if (!newPlanId) {
      return res.status(400).json({ message: "newPlanId is required" });
    }

    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church required" });
    }

    const subscription = await Subscription.findOne({ church: churchId })
      .populate("plan")
      .lean();

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    if (!subscription.nextBillingDate) {
      return res.status(400).json({ message: "No billing cycle found. Please contact support." });
    }

    const currentPlan = subscription.plan;
    if (!currentPlan) {
      return res.status(400).json({ message: "Current plan not found" });
    }

    const newPlan = await Plan.findById(newPlanId).lean();
    if (!newPlan) {
      return res.status(404).json({ message: "Target plan not found" });
    }

    if (planRank(newPlan.name) <= planRank(currentPlan.name)) {
      return res.status(400).json({ message: "Proration is only available for upgrades" });
    }

    const intervalKey = normalizeBillingIntervalKey(billingInterval || subscription.billingInterval);
    const breakdown = computeProration(subscription, currentPlan, newPlan, intervalKey);

    const church = await Church.findById(churchId).lean();
    const isGhana = String(church?.country || "").trim().toLowerCase() === "ghana";

    let usdRate = null;
    if (!isGhana) {
      try {
        const settings = await getSystemSettingsSnapshot();
        usdRate = Number(settings?.usdToGhsRate || 0) || null;
      } catch { usdRate = null; }
    }

    return res.json({
      breakdown,
      currentPlan: { _id: currentPlan._id, name: currentPlan.name },
      newPlan: { _id: newPlan._id, name: newPlan.name },
      intervalKey,
      usdRate,
      isGhana,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
