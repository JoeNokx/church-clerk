import Subscription from "../../models/billingModel/subscriptionModel.js";

import Plan from "../../models/billingModel/planModel.js";

import BillingHistory from "../../models/billingModel/billingHistoryModel.js";

import ReferralCode from "../../models/referralModel/referralCodeModel.js";

import { addDays, addInterval } from "../../utils/dateBillingUtils.js";

import Church from "../../models/churchModel.js";

import { getSystemSettingsSnapshot } from "../systemSettingsController.js";

import { chargeWithPaystack } from "./paystackController.js";
import { handlePaymentFailure } from "./gracePeriodController.js";

import {
  sendCancellationAppliedEmail,
  sendDowngradeAppliedEmail
} from "../../utils/subscriptionEmails.js";

import { findFreeLitePlan, isFreeTierPlanName } from "../../utils/planHelpers.js";
import { resetAllowanceForPeriod } from "../../services/announcement/allowanceService.js";

const validatePlanForChurch = (church, plan) => {
  if (church.type === "Headquarters") {
    const planName = String(plan.name || "").toLowerCase();
    if (planName !== "premium" && planName !== "enterprise") {
      throw new Error("HQ churches must subscribe to the Premium or Enterprise plan only");
    }
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

    // Free-tier plans have no billing cycle — no due date.
    subscriptionData.nextBillingDate = isFreeTierPlanName(plan?.name)
      ? null
      : addInterval(new Date(), billingInterval);

  }



  const subscription = await Subscription.create(subscriptionData);

  // Initialize the monthly SMS allowance for the new subscription / trial.
  try {
    await resetAllowanceForPeriod({
      churchId: church._id,
      periodIndex: subscription.nextBillingDate ? new Date(subscription.nextBillingDate).getTime() : Date.now(),
      periodEnd: subscription.nextBillingDate,
      planId: subscription.plan || null
    });
  } catch (allowanceErr) {
    console.error("[createSubscriptionForChurch] allowance init error:", allowanceErr?.message || allowanceErr);
  }

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

  // Free-tier plans have no billing cycle — no due date.
  subscription.nextBillingDate = isFreeTierPlanName(plan?.name)
    ? null
    : addInterval(new Date(), subscription.billingInterval);

  subscription.gracePeriodEnd = null;

  subscription.expiryWarning.shown = false;



  await subscription.save();

  // Reset the monthly SMS allowance for the new plan / billing period.
  try {
    await resetAllowanceForPeriod({
      churchId: church._id,
      periodIndex: subscription.nextBillingDate ? new Date(subscription.nextBillingDate).getTime() : Date.now(),
      periodEnd: subscription.nextBillingDate,
      planId: subscription.plan
    });
  } catch (allowanceErr) {
    console.error("[upgradeTrialToPlans] allowance reset error:", allowanceErr?.message || allowanceErr);
  }

  return subscription;

};



// =============================

// Process subscription billing

// Handles free months, regular billing

// =============================

export const processSubscriptionBillings = async (subscription) => {

  // -----------------------------

  // Resolve the plan first — free-tier / zero-priced plans have no billing
  // cycle at all, and their banked referral free months must be preserved.

  // -----------------------------

  const plan = await Plan.findById(subscription.plan);

  if (!plan) throw new Error("Plan not found");

  const billingCurrency = "GHS";

  if (billingCurrency !== subscription.currency) {
    subscription.currency = billingCurrency;
    await subscription.save();
  }

  const price = plan.pricing?.[billingCurrency]?.[subscription.billingInterval];

  // Free plan: clear the due date so the subscription leaves the billing
  // loop entirely (self-heals subscriptions released before this existed).
  if (isFreeTierPlanName(plan?.name) || (price != null && Number(price) <= 0)) {
    subscription.nextBillingDate = null;
    subscription.status = "active";
    subscription.gracePeriodEnd = null;
    if (subscription.expiryWarning) subscription.expiryWarning.shown = false;
    await subscription.save();
    return { charged: false, reason: "free_plan" };
  }

  if (price == null) throw new Error("Pricing not configured");

  // -----------------------------

  // Free months (paid plans only)

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



    // Reset the monthly SMS allowance for the new billing period (free month path).
    try {
      await resetAllowanceForPeriod({
        churchId: subscription.church,
        periodIndex: subscription.nextBillingDate ? new Date(subscription.nextBillingDate).getTime() : Date.now(),
        periodEnd: subscription.nextBillingDate,
        planId: subscription.plan
      });
    } catch (allowanceErr) {
      console.error("[processSubscriptionBillings] allowance reset error:", allowanceErr?.message || allowanceErr);
    }



    return { charged: false, reason: "free_month" };

  }



  // -----------------------------

  // Paid billing

  // -----------------------------

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

// Apply a scheduled plan change (cancel → Free Lite, or downgrade to a
// lower paid plan) once its effective date passes.
//
// Shared by both billing loops and the per-request lazy apply in
// authMiddleware. Saving the subscription triggers the model's pre-save
// hook, which re-scans feature usage — so modules first used on a paid
// plan become read-only (not fully blocked) on the new lower plan.

// =============================

export const applyPendingPlanChange = async (subscription) => {
  if (!subscription?.pendingPlan) return { applied: false, action: null };

  const effectiveAt = subscription.pendingPlanEffectiveDate || subscription.nextBillingDate;
  if (!effectiveAt || new Date(effectiveAt) > new Date()) {
    return { applied: false, action: null };
  }

  const pendingAction = subscription.pendingPlanAction;
  const newPlan = await Plan.findById(subscription.pendingPlan).lean();

  subscription.plan = subscription.pendingPlan;
  subscription.pendingPlan = null;
  subscription.pendingPlanEffectiveDate = null;
  subscription.pendingPlanAction = null;

  // Landing on a free-tier plan ends the billing relationship entirely.
  if (isFreeTierPlanName(newPlan?.name)) {
    subscription.nextBillingDate = null;
  } else if (!subscription.nextBillingDate) {
    // A paid plan with no due date (e.g. a pending plan applied after a
    // trial release already cleared it) must re-enter billing immediately,
    // otherwise the church would get the paid plan without ever being
    // charged.
    subscription.nextBillingDate = new Date();
  }

  await subscription.save();

  try {
    const church = await Church.findById(subscription.church).lean();
    if (pendingAction === "cancel") await sendCancellationAppliedEmail(church);
    else if (pendingAction === "downgrade") await sendDowngradeAppliedEmail(church, newPlan?.name || "new plan");
  } catch { /* email failure must not abort */ }

  return { applied: true, action: pendingAction };
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
    const { applied, action } = await applyPendingPlanChange(subscription);

    if (applied && action === "cancel") continue;

    const result = await processSubscriptionBillings(subscription);

    if (result.charged) {
      try {
        await chargeWithPaystack(subscription);
      } catch {
        await handlePaymentFailure(subscription);
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
    const { applied: pendingActionApplied, action: pendingAction } =
      await applyPendingPlanChange(subscription);

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
        await handlePaymentFailure(subscription);
      }
    }

  }

};



// =============================
// Release a single expired trial to Free Lite (on-the-fly, called per request)
// =============================

export const releaseExpiredTrialForChurch = async (churchId) => {
  const freeLitePlan = await findFreeLitePlan();
  if (!freeLitePlan) return null;

  const subscription = await Subscription.findOne({ church: churchId });
  if (!subscription) return null;

  if (subscription.status !== "free trial" && subscription.status !== "trialing") {
    return subscription.toObject();
  }

  subscription.plan = freeLitePlan._id;
  subscription.status = "active";
  subscription.trialStart = null;
  subscription.trialEnd = null;
  subscription.gracePeriodEnd = null;
  // Free Lite has no billing cycle — no due date, so the subscription never
  // enters the billing job, never gets due-date notifications, and banked
  // referral free months stay preserved until the church upgrades.
  subscription.nextBillingDate = null;
  if (subscription.expiryWarning) subscription.expiryWarning.shown = false;
  await subscription.save();

  // Reset the monthly SMS allowance for the Free Lite plan.
  try {
    await resetAllowanceForPeriod({
      churchId,
      periodIndex: subscription.nextBillingDate ? new Date(subscription.nextBillingDate).getTime() : Date.now(),
      periodEnd: subscription.nextBillingDate,
      planId: freeLitePlan._id
    });
  } catch (allowanceErr) {
    console.error("[releaseExpiredTrialForChurch] allowance reset error:", allowanceErr?.message || allowanceErr);
  }

  return subscription.toObject();
};

// =============================
// Release expired trials to Free Lite
// =============================

export const releaseExpiredTrials = async () => {
  // Trials do not get a grace period — grace applies to paid plans only.
  // Any trial whose trialEnd has passed is released to Free Lite immediately.
  const expiredTrials = await Subscription.find({
    status: { $in: ["free trial", "trialing"] },
    trialEnd: { $lte: new Date() }
  });

  if (!expiredTrials.length) return;

  const freeLitePlan = await findFreeLitePlan();

  if (!freeLitePlan) return;

  for (const subscription of expiredTrials) {
    try {
      subscription.plan = freeLitePlan._id;
      subscription.status = "active";
      subscription.trialStart = null;
      subscription.trialEnd = null;
      subscription.gracePeriodEnd = null;
      // Free Lite has no billing cycle — clear the due date entirely.
      subscription.nextBillingDate = null;
      subscription.expiryWarning.shown = false;

      await subscription.save();

      // Reset the monthly SMS allowance for the Free Lite plan.
      try {
        await resetAllowanceForPeriod({
          churchId: subscription.church,
          periodIndex: subscription.nextBillingDate ? new Date(subscription.nextBillingDate).getTime() : Date.now(),
          periodEnd: subscription.nextBillingDate,
          planId: freeLitePlan._id
        });
      } catch (allowanceErr) {
        console.error("[releaseExpiredTrials] allowance reset error:", allowanceErr?.message || allowanceErr);
      }
    } catch {
      // do not abort cycle for a single subscription failure
    }
  }
};


