import SmsAllowance from "../../models/billingModel/smsAllowanceModel.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import Plan from "../../models/billingModel/planModel.js";

/**
 * Returns the current billing period window for a subscription.
 * periodStart = previous nextBillingDate (or trialStart for trials), periodEnd = nextBillingDate.
 * For simplicity we treat [lastBillingDate, nextBillingDate) as the current period.
 */
function getPeriodWindow(subscription) {
  if (!subscription) return null;
  const nextBillingDate = subscription.nextBillingDate ? new Date(subscription.nextBillingDate) : null;
  if (!nextBillingDate) return null;

  // Approximate period start: we don't store the last charge date explicitly, so we
  // derive it from the interval. This is only used to label the period; the reset is
  // triggered by the billing cycle, not by date comparison.
  return { periodEnd: nextBillingDate };
}

/**
 * Resolve the current plan for a church from its subscription.
 * Returns { planId, planMonthly }.
 */
async function resolvePlanForChurch(churchId) {
  const subscription = await Subscription.findOne({ church: churchId }).lean();
  const planId = subscription?.plan || null;
  if (!planId) return { planId: null, planMonthly: 0, subscription };
  const plan = await Plan.findById(planId).select("monthlySmsCredits").lean();
  return { planId, planMonthly: Number(plan?.monthlySmsCredits || 0), subscription };
}

/**
 * Get (or lazily create) the SmsAllowance doc for a church.
 * Always syncs grantedCredits with the live plan's monthlySmsCredits so that
 * admin changes to plan configuration are reflected dynamically.
 * Does NOT reset usedCredits — that only happens on billing period boundaries.
 */
async function getOrCreateAllowance({ churchId }) {
  const { planId, planMonthly, subscription } = await resolvePlanForChurch(churchId);
  const periodWindow = getPeriodWindow(subscription);

  let allowance = await SmsAllowance.findOne({ church: churchId });

  if (!allowance) {
    allowance = await SmsAllowance.create({
      church: churchId,
      subscription: subscription?._id || null,
      plan: planId,
      grantedCredits: planMonthly,
      usedCredits: 0,
      planMonthlySmsCredits: planMonthly,
      periodStart: subscription?.trialStart || subscription?.createdAt || new Date(),
      periodEnd: periodWindow?.periodEnd || null,
      periodIndex: 0
    });
    return allowance;
  }

  // Sync: if the plan's monthlySmsCredits changed since last read, update grantedCredits
  // dynamically. This makes admin plan changes reflect immediately on the church side.
  const currentPlanMonthly = Number(allowance.planMonthlySmsCredits || 0);
  const currentPlanId = allowance.plan?.toString?.() || null;
  const planChanged = (planId && planId.toString() !== currentPlanId) || planMonthly !== currentPlanMonthly;

  if (planChanged) {
    allowance.plan = planId;
    allowance.planMonthlySmsCredits = planMonthly;
    allowance.grantedCredits = planMonthly;
    // Cap usedCredits so it doesn't exceed the new grant (avoids negative remaining).
    if (Number(allowance.usedCredits) > planMonthly) {
      allowance.usedCredits = planMonthly;
    }
    allowance.subscription = subscription?._id || allowance.subscription;
    if (periodWindow?.periodEnd) {
      allowance.periodEnd = periodWindow.periodEnd;
    }
    await allowance.save();
  }

  return allowance;
}

/**
 * Reset (or initialize) the allowance for the current billing period.
 * Called by the billing cycle when a new period begins (charge success, free month, or trial start).
 * Idempotent within a period: if `periodIndex` matches the supplied index, it's a no-op.
 */
async function resetAllowanceForPeriod({ churchId, periodIndex, periodEnd, planId = null }) {
  if (!churchId) return null;

  const idx = Number(periodIndex);
  if (!Number.isFinite(idx)) return null;

  let resolvedPlanId = planId;
  let planMonthly = 0;
  if (resolvedPlanId) {
    const plan = await Plan.findById(resolvedPlanId).select("monthlySmsCredits").lean();
    planMonthly = Number(plan?.monthlySmsCredits || 0);
  } else {
    const existing = await SmsAllowance.findOne({ church: churchId }).lean();
    if (existing?.plan) {
      const plan = await Plan.findById(existing.plan).select("monthlySmsCredits").lean();
      planMonthly = Number(plan?.monthlySmsCredits || 0);
      resolvedPlanId = existing.plan;
    }
  }

  const filter = { church: churchId };
  const update = {
    $set: {
      plan: resolvedPlanId,
      grantedCredits: planMonthly,
      usedCredits: 0,
      planMonthlySmsCredits: planMonthly,
      periodEnd: periodEnd || null,
      periodIndex: idx
    },
    $setOnInsert: { periodStart: new Date() }
  };

  // If a doc already exists with the same periodIndex, treat as already reset.
  const existing = await SmsAllowance.findOne({ church: churchId });
  if (existing && Number(existing.periodIndex) === idx) {
    // Still refresh plan config in case admin changed the plan's allowance.
    if (planMonthly !== Number(existing.planMonthlySmsCredits || 0)) {
      existing.planMonthlySmsCredits = planMonthly;
      existing.grantedCredits = planMonthly;
      await existing.save();
    }
    return existing;
  }

  const allowance = await SmsAllowance.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true
  });
  return allowance;
}

/**
 * Sync all allowance docs that reference a given plan with the plan's current
 * monthlySmsCredits. Called when the admin updates a plan so that churches on
 * that plan see the new allowance dynamically without waiting for a billing reset.
 */
async function syncAllowancesForPlan(planId) {
  if (!planId) return null;
  const plan = await Plan.findById(planId).select("monthlySmsCredits").lean();
  const planMonthly = Number(plan?.monthlySmsCredits || 0);

  const result = await SmsAllowance.updateMany(
    { plan: planId },
    {
      $set: {
        planMonthlySmsCredits: planMonthly,
        grantedCredits: planMonthly
      }
    }
  );

  return result;
}

/**
 * Remaining included credits for the current period.
 */
function remainingIncluded(allowance) {
  if (!allowance) return 0;
  const granted = Number(allowance.grantedCredits || 0);
  const used = Number(allowance.usedCredits || 0);
  return Math.max(0, granted - used);
}

export { getOrCreateAllowance, resetAllowanceForPeriod, syncAllowancesForPlan, remainingIncluded };
