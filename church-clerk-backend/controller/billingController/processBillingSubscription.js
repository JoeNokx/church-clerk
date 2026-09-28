import Plan from "../../models/billingModel/planModel.js";
import BillingHistory from "../../models/billingModel/billingHistoryModel.js";
import ReferralCode from "../../models/referralModel/referralCodeModel.js";
import { addMonths, addDays, addInterval } from "../../utils/dateBillingUtils.js";
import Church from "../../models/churchModel.js";
import { getSystemSettingsSnapshot } from "../systemSettingsController.js";
import { isFreeTierPlanName } from "../../utils/planHelpers.js";

const normalizeLegacyCurrency = (currency) => {
  const cur = String(currency || "")
    .trim()
    .toUpperCase();
  if (cur === "GHS") return "GHS";
  return "GHS";
};

export const processBillingForSubscription = async (subscription) => {
  const now = new Date();

  // =============================
  // 0️⃣ FREE-TIER / ZERO-PRICED PLAN — NO BILLING CYCLE
  // =============================
  // Resolved before free-month consumption so banked referral months are
  // preserved until the church upgrades to a paid plan.
  const plan = await Plan.findById(subscription.plan);
  if (!plan) throw new Error("Plan not found");

  const billingCurrency = normalizeLegacyCurrency(subscription.currency);

  if (billingCurrency !== subscription.currency) {
    subscription.currency = billingCurrency;
    await subscription.save();
  }

  const price =
    plan.pricing?.[billingCurrency]?.[subscription.billingInterval];

  if (isFreeTierPlanName(plan?.name) || (price != null && Number(price) <= 0)) {
    // Clear the due date so the subscription leaves the billing loop
    // entirely — also self-heals subscriptions released before this existed.
    subscription.nextBillingDate = null;
    subscription.status = "active";
    subscription.gracePeriodEnd = null;
    await subscription.save();
    return { charged: false, reason: "free_plan" };
  }

  if (price == null) throw new Error("Pricing not configured");

  // =============================
  // 1️⃣ USE FREE MONTH IF AVAILABLE (paid plans only)
  // =============================
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

  // =============================
  // 2️⃣ PAID BILLING
  // =============================
  // Idempotency: if a pending billing record already exists for this subscription
  // (e.g., cron ran twice due to server restart), don't create a duplicate.
  const existingPending = await BillingHistory.findOne({
    subscription: subscription._id,
    status: "pending",
    type: "payment",
    amount: { $gt: 0 }
  }).sort({ createdAt: -1 });

  if (existingPending) {
    return { charged: true, amount: existingPending.amount };
  }

  // Also check if a billing record was already paid today (edge case: charge
  // succeeded but subscription.nextBillingDate save failed, leaving it in the past).
  // This prevents a double-charge on the next cron tick.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const existingPaidToday = await BillingHistory.findOne({
    subscription: subscription._id,
    status: "paid",
    type: "payment",
    amount: { $gt: 0 },
    createdAt: { $gte: startOfToday }
  }).sort({ createdAt: -1 });

  if (existingPaidToday) {
    // Already charged today — advance nextBillingDate to avoid re-processing
    subscription.nextBillingDate = addInterval(new Date(), subscription.billingInterval);
    subscription.status = "active";
    subscription.gracePeriodEnd = null;
    await subscription.save();
    return { charged: false, reason: "already_paid_today" };
  }

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


