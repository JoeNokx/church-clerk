import Plan from "../../models/billingModel/planModel.js";
import BillingHistory from "../../models/billingModel/billingHistoryModel.js";
import ReferralCode from "../../models/referralModel/referralCodeModel.js";
import { addMonths } from "../../utils/dateBillingUtils.js";
import Church from "../../models/churchModel.js";

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
  // 1️⃣ USE FREE MONTH IF AVAILABLE
  // =============================
  if (subscription.freeMonths.earned > subscription.freeMonths.used) {
    subscription.freeMonths.used += 1;

    subscription.nextBillingDate = addMonths(
      subscription.nextBillingDate,
      subscription.billingInterval === "monthly"
        ? 1
        : subscription.billingInterval === "halfYear"
        ? 6
        : 12
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
  const plan = await Plan.findById(subscription.plan);
  if (!plan) throw new Error("Plan not found");

  const billingCurrency = normalizeLegacyCurrency(subscription.currency);

  if (billingCurrency !== subscription.currency) {
    subscription.currency = billingCurrency;
    await subscription.save();
  }

  const price =
    plan.pricing[billingCurrency]?.[subscription.billingInterval];

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
    planName: plan.name,
    billingInterval: subscription.billingInterval,
    amount: price,
    currency: billingCurrency
  }
});


  return { charged: true, amount: price };
};


