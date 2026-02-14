import Subscription from "../../models/billingModel/subscriptionModel.js";
import Plan from "../../models/billingModel/planModel.js";
import BillingHistory from "../../models/billingModel/billingHistoryModel.js";
import ReferralCode from "../../models/referralModel/referralCodeModel.js";
import { addMonths, addDays } from "../../utils/dateBillingUtils.js";
import Church from "../../models/churchModel.js";
import { getSystemSettingsSnapshot } from "../systemSettingsController.js";

const normalizeLegacyCurrency = (currency) => {
  const cur = String(currency || "")
    .trim()
    .toUpperCase();
  if (cur === "GHS") return "GHS";
  return "GHS";
};

const getIntervalMonths = (billingInterval) => {
  if (billingInterval === "monthly") return 1;
  if (billingInterval === "halfYear") return 6;
  if (billingInterval === "yearly") return 12;
  return 1;
};

// =============================
// Helper: HQ-only restriction
// =============================
const validatePlanForChurch = (church, plan) => {
  if (church.type === "Headquarters" && String(plan.name || "").toLowerCase() !== "premium") {
    throw new Error("HQ churches must subscribe to Premium plan only");
  }
};

// =============================
// Create subscription (trial or plan)
// =============================
export const createSubscriptionForChurch = async ({
  church,
  planId = null,
  trial = false,
  currency,
  billingInterval = "monthly",
  paymentProvider = "paystack"
}) => {
  if (!church) throw new Error("Church is required");

  // Prevent sending both trial + plan
  if (trial && planId) throw new Error("Cannot choose trial and plan at the same time");

  const normalizedCurrency = String(currency || "")
    .trim()
    .toUpperCase();
  const planCurrency = normalizedCurrency === "GHS" ? "GHS" : "GHS";

  let subscriptionData = {
    church: church._id,
    currency: planCurrency,
    billingInterval,
    paymentProvider
  };

  if (trial) {
    const { trialDays } = await getSystemSettingsSnapshot();
    subscriptionData.status = "free trial";
    subscriptionData.trialStart = new Date();
    subscriptionData.trialEnd = addDays(new Date(), Number(trialDays || 14));
    subscriptionData.nextBillingDate = subscriptionData.trialEnd;
  }

  if (planId) {
    const plan = await Plan.findById(planId);
    if (!plan) throw new Error("Plan not found");
    validatePlanForChurch(church, plan);

    subscriptionData.plan = plan._id;
    subscriptionData.status = "active";
    subscriptionData.nextBillingDate = addMonths(new Date(), getIntervalMonths(billingInterval));
  }

  const subscription = await Subscription.create(subscriptionData);
  return subscription;
};

// =============================
// Upgrade trial to plan immediately
// =============================
export const upgradeTrialToPlans = async (church, planId) => {
  const subscription = await Subscription.findOne({ church: church._id });
  if (!subscription) throw new Error("Subscription not found");

  const plan = await Plan.findById(planId);
  if (!plan) throw new Error("Plan not found");

  validatePlanForChurch(church, plan);

  subscription.plan = plan._id;
  subscription.status = "active";
  subscription.trialStart = null;
  subscription.trialEnd = null;
  subscription.nextBillingDate = addMonths(new Date(), getIntervalMonths(subscription.billingInterval));
  subscription.gracePeriodEnd = null;
  subscription.expiryWarning.shown = false;

  await subscription.save();
  return subscription;
};

// =============================
// Process subscription billing
// Handles free months, regular billing
// =============================
export const processSubscriptionBillings = async (subscription) => {
  // -----------------------------
  // Free months
  // -----------------------------
  if (subscription.freeMonths.earned > subscription.freeMonths.used) {
    subscription.freeMonths.used += 1;
    subscription.nextBillingDate = addMonths(
      subscription.nextBillingDate,
      getIntervalMonths(subscription.billingInterval)
    );
    subscription.status = "active"; 
    subscription.gracePeriodEnd = null;
    subscription.expiryWarning.shown = false;

    await subscription.save();

    await ReferralCode.findOneAndUpdate(
      { church: subscription.church },
      { $inc: { totalFreeMonthsUsed: 1 } }
    );

    await BillingHistory.create({
      church: subscription.church,
      subscription: subscription._id,
      type: "free_month",
      amount: 0,
      status: "rewarded"
    });

    return { charged: false, reason: "free_month" };
  }

  // -----------------------------
  // Paid billing
  // -----------------------------
  const plan = await Plan.findById(subscription.plan);
  if (!plan) throw new Error("Plan not found");

  const billingCurrency = normalizeLegacyCurrency(subscription.currency);

  if (billingCurrency !== subscription.currency) {
    subscription.currency = billingCurrency;
    await subscription.save();
  }

  const price = plan.pricing[billingCurrency]?.[subscription.billingInterval];
  if (!price) throw new Error("Pricing not configured");

  await BillingHistory.create({
    church: subscription.church,
    subscription: subscription._id,
    type: "payment",
    amount: price,
    currency: billingCurrency,
    status: "pending",
    paymentProvider: subscription.paymentProvider,
    invoiceSnapshot: {
      planId: plan._id,
      planName: plan.name,
      billingInterval: subscription.billingInterval,
      amount: price,
      currency: billingCurrency
    }
  });

  return { charged: true, amount: price };
};

// =============================
// Run billing cycle (daily or manual)
// =============================
export const runBillingCycles = async () => {
  const today = new Date();

  const subscriptions = await Subscription.find({
    nextBillingDate: { $lte: today },
    status: { $in: ["active", "past_due"] }
  });

  for (const subscription of subscriptions) {
    const result = await processSubscriptionBillings(subscription);

    if (result.charged) {
      const { gracePeriodDays } = await getSystemSettingsSnapshot();
      subscription.status = "past_due";
      subscription.gracePeriodEnd = addDays(new Date(), Number(gracePeriodDays || 3));
      await subscription.save();
    }

    // Apply scheduled downgrade
    if (subscription.pendingPlan) {
      subscription.plan = subscription.pendingPlan;
      subscription.pendingPlan = null;
      await subscription.save();
    }
  }
};

