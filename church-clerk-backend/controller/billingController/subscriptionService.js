import Subscription from "../../models/billingModel/subscriptionModel.js";

import Plan from "../../models/billingModel/planModel.js";

import BillingHistory from "../../models/billingModel/billingHistoryModel.js";

import ReferralCode from "../../models/referralModel/referralCodeModel.js";

import { addDays, addInterval } from "../../utils/dateBillingUtils.js";

import Church from "../../models/churchModel.js";

import { getSystemSettingsSnapshot } from "../systemSettingsController.js";

import { chargeWithPaystack } from "./paystackController.js";

import {
  sendCancellationAppliedEmail,
  sendDowngradeAppliedEmail
} from "../../utils/subscriptionEmails.js";

import { detectTrialFeatureUsage } from "../../utils/featureUsageChecker.js";

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



  const planCurrency = "GHS";



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

    subscriptionData.nextBillingDate = addInterval(new Date(), billingInterval);

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

  subscription.nextBillingDate = addInterval(new Date(), subscription.billingInterval);

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

    const { referralBonusDays } = await getSystemSettingsSnapshot();

    subscription.freeMonths.used += 1;

    subscription.nextBillingDate = addDays(

      subscription.nextBillingDate,

      Number(referralBonusDays || 30)

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

  const billingCurrency = "GHS";

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

export const runBillingCycleForChurch = async (churchId) => {
  const today = new Date();

  const subscriptions = await Subscription.find({
    church: churchId,
    nextBillingDate: { $lte: today },
    status: { $in: ["active", "past_due"] }
  });

  for (const subscription of subscriptions) {
    let pendingActionApplied = false;
    let pendingAction = null;
    let newPlan = null;

    if (subscription.pendingPlan) {
      const effectiveAt = subscription.pendingPlanEffectiveDate || subscription.nextBillingDate;
      if (effectiveAt && new Date(effectiveAt) <= today) {
        pendingAction = subscription.pendingPlanAction;
        newPlan = await Plan.findById(subscription.pendingPlan).lean();
        subscription.plan = subscription.pendingPlan;
        subscription.pendingPlan = null;
        subscription.pendingPlanEffectiveDate = null;
        subscription.pendingPlanAction = null;
        pendingActionApplied = true;
        await subscription.save();
        try {
          const church = await Church.findById(subscription.church).lean();
          if (pendingAction === "cancel") await sendCancellationAppliedEmail(church);
          else if (pendingAction === "downgrade") await sendDowngradeAppliedEmail(church, newPlan?.name || "new plan");
        } catch { /* email failure must not abort */ }
      }
    }

    if (pendingActionApplied && pendingAction === "cancel") continue;

    const result = await processSubscriptionBillings(subscription);

    if (result.charged) {
      try {
        await chargeWithPaystack(subscription);
      } catch {
        const { gracePeriodDays } = await getSystemSettingsSnapshot();
        subscription.status = "past_due";
        subscription.gracePeriodEnd = addDays(new Date(), Number(gracePeriodDays || 3));
        await subscription.save();
      }
    }
  }
};

export const runBillingCycles = async () => {

  const today = new Date();



  const subscriptions = await Subscription.find({

    nextBillingDate: { $lte: today },

    status: { $in: ["active", "past_due"] }

  });



  for (const subscription of subscriptions) {

    // -------------------------------------------------------
    // STEP 1: Apply pending cancel/downgrade BEFORE charging.
    // Idempotency: pendingPlan is cleared after first apply.
    // -------------------------------------------------------
    let pendingActionApplied = false;
    let pendingAction = null;
    let newPlan = null;

    if (subscription.pendingPlan) {
      const effectiveAt = subscription.pendingPlanEffectiveDate || subscription.nextBillingDate;
      if (effectiveAt && new Date(effectiveAt) <= today) {
        pendingAction = subscription.pendingPlanAction;
        newPlan = await Plan.findById(subscription.pendingPlan).lean();

        subscription.plan = subscription.pendingPlan;
        subscription.pendingPlan = null;
        subscription.pendingPlanEffectiveDate = null;
        subscription.pendingPlanAction = null;
        pendingActionApplied = true;

        await subscription.save();

        // Notify church
        try {
          const church = await Church.findById(subscription.church).lean();
          if (pendingAction === "cancel") {
            await sendCancellationAppliedEmail(church);
          } else if (pendingAction === "downgrade") {
            await sendDowngradeAppliedEmail(church, newPlan?.name || "new plan");
          }
        } catch { /* email failure must not abort billing cycle */ }
      }
    }

    // -------------------------------------------------------
    // STEP 2: Skip charging if subscription was just cancelled.
    // -------------------------------------------------------
    if (pendingActionApplied && pendingAction === "cancel") {
      continue;
    }

    // -------------------------------------------------------
    // STEP 3: Process billing (free months or paid charge).
    // -------------------------------------------------------
    const result = await processSubscriptionBillings(subscription);

    if (result.charged) {

      try {

        await chargeWithPaystack(subscription);

      } catch {

        const { gracePeriodDays } = await getSystemSettingsSnapshot();

        subscription.status = "past_due";

        subscription.gracePeriodEnd = addDays(new Date(), Number(gracePeriodDays || 3));

        await subscription.save();

      }

    }

  }

};



// =============================
// Release a single expired trial to Free Lite (on-the-fly, called per request)
// =============================

export const releaseExpiredTrialForChurch = async (churchId) => {
  const freeLitePlan = await Plan.findOne({
    name: { $regex: /^free\s*lite$/i },
    isActive: true
  }).lean();
  if (!freeLitePlan) return null;

  const subscription = await Subscription.findOne({ church: churchId });
  if (!subscription) return null;

  if (subscription.status !== "free trial" && subscription.status !== "trialing") {
    return subscription.toObject();
  }

  const usedFeatures = await detectTrialFeatureUsage(churchId);
  subscription.plan = freeLitePlan._id;
  subscription.status = "active";
  subscription.trialStart = null;
  subscription.trialEnd = null;
  subscription.gracePeriodEnd = null;
  subscription.trialFeaturesUsed = usedFeatures;
  subscription.nextBillingDate = addInterval(new Date(), subscription.billingInterval);
  if (subscription.expiryWarning) subscription.expiryWarning.shown = false;
  await subscription.save();

  return subscription.toObject();
};

// =============================
// Release expired trials to Free Lite
// =============================

export const releaseExpiredTrials = async () => {
  const { gracePeriodDays } = await getSystemSettingsSnapshot();
  const graceMs = Number(gracePeriodDays || 7) * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - graceMs);

  const expiredTrials = await Subscription.find({
    status: { $in: ["free trial", "trialing"] },
    trialEnd: { $lt: cutoff }
  });

  if (!expiredTrials.length) return;

  const freeLitePlan = await Plan.findOne({
    name: { $regex: /^free\s*lite$/i },
    isActive: true
  }).lean();

  if (!freeLitePlan) return;

  for (const subscription of expiredTrials) {
    try {
      const usedFeatures = await detectTrialFeatureUsage(subscription.church);

      subscription.plan = freeLitePlan._id;
      subscription.status = "active";
      subscription.trialStart = null;
      subscription.trialEnd = null;
      subscription.gracePeriodEnd = null;
      subscription.trialFeaturesUsed = usedFeatures;
      subscription.nextBillingDate = addInterval(new Date(), subscription.billingInterval);
      subscription.expiryWarning.shown = false;

      await subscription.save();
    } catch {
      // do not abort cycle for a single subscription failure
    }
  }
};


