import Subscription from "../../models/billingModel/subscriptionModel.js";
import Plan from "../../models/billingModel/planModel.js";
import Church from "../../models/churchModel.js";
import { createSubscriptionForChurch, upgradeTrialToPlans, runBillingCycles, runBillingCycleForChurch, releaseExpiredTrials } from "../../controller/billingController/subscriptionService.js";

const planRank = (plan) => {
  const n = String(plan?.name || "")
    .trim()
    .toLowerCase();
  if (n === "free lite") return 0;
  if (n === "basic") return 1;
  if (n === "standard") return 2;
  if (n === "premium") return 3;
  return 99;
};

const sortPlans = (plans) => {
  const rows = Array.isArray(plans) ? plans : [];
  return rows.slice().sort((a, b) => {
    const ar = planRank(a);
    const br = planRank(b);
    if (ar !== br) return ar - br;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });
};

const sanitizePlanCurrencies = (plan) => {
  if (!plan || typeof plan !== "object") return plan;
  const copy = { ...plan };

  const nextPricing = {};
  if (plan?.pricing?.GHS) nextPricing.GHS = plan.pricing.GHS;
  copy.pricing = nextPricing;

  const nextPriceByCurrency = {};
  if (plan?.priceByCurrency?.GHS) nextPriceByCurrency.GHS = plan.priceByCurrency.GHS;
  copy.priceByCurrency = nextPriceByCurrency;

  return copy;
};

async function getSubscriptionForChurch(churchId) {
  let subscription = await Subscription.findOne({ church: churchId })
    .populate("plan")
    .populate("pendingPlan")
    .lean();

  if (!subscription) {
    const church = await Church.findById(churchId).lean();
    if (!church) {
      throw new Error("Church not found");
    }

    await createSubscriptionForChurch({
      church,
      trial: true,
      currency: church?.currency,
      billingInterval: "monthly"
    });

    subscription = await Subscription.findOne({ church: churchId })
      .populate("plan")
      .populate("pendingPlan")
      .lean();
  }

  if (!subscription) {
    throw new Error("No subscription found");
  }

  return subscription;
}

async function getEffectivePlan(subscription) {
  const now = new Date();

  const isTrialExpired =
    (subscription.status === "free trial" || subscription.status === "trialing") &&
    subscription.trialEnd &&
    now > new Date(subscription.trialEnd);

  const isGraceExpired =
    subscription.status === "past_due" &&
    subscription.gracePeriodEnd &&
    now > new Date(subscription.gracePeriodEnd);

  let effectivePlan = (subscription.status === "free trial" || subscription.status === "trialing")
    ? await Plan.findOne({ name: { $regex: /^premium$/i }, isActive: true }).lean()
    : subscription.plan;

  if (subscription?.pendingPlan) {
    const effectiveAt = subscription.pendingPlanEffectiveDate || subscription.nextBillingDate;
    if (effectiveAt && new Date(effectiveAt) <= now) {
      effectivePlan = subscription.pendingPlan;
    }
  }

  return { effectivePlan, isTrialExpired, isGraceExpired };
}

async function chooseSubscriptionPlan(churchId, planId, trial, currency, billingInterval) {
  const church = await Church.findById(churchId);
  if (!church) {
    throw new Error("Church not found");
  }

  const subscription = await createSubscriptionForChurch({
    church,
    planId,
    trial,
    currency,
    billingInterval
  });

  return subscription;
}

async function upgradeTrial(churchId, planId) {
  const church = await Church.findById(churchId);
  if (!church) throw new Error("Church not found");

  const subscription = await upgradeTrialToPlans(church, planId);
  return subscription;
}

async function executeBillingCycle() {
  await releaseExpiredTrials();
  await runBillingCycles();
}

async function executeBillingCycleForChurch(churchId) {
  const now = new Date();

  const sub = await Subscription.findOne({ church: churchId }).lean();
  if (!sub) throw new Error("Subscription not found");

  const isTrial = sub.status === "free trial" || sub.status === "trialing";
  if (isTrial && sub.trialEnd && now > new Date(sub.trialEnd)) {
    await releaseExpiredTrials();
    return;
  }

  // Run billing cycle scoped to this church only
  await runBillingCycleForChurch(churchId);
}

async function getAvailablePlans() {
  const plans = await Plan.find({ isActive: true }).lean();
  const sanitized = sortPlans(plans).map(sanitizePlanCurrencies);
  return sanitized;
}

export {
  planRank,
  sortPlans,
  sanitizePlanCurrencies,
  getSubscriptionForChurch,
  getEffectivePlan,
  chooseSubscriptionPlan,
  upgradeTrial,
  executeBillingCycle,
  executeBillingCycleForChurch,
  getAvailablePlans
};
