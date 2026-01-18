import BillingHistory from "../../models/billingModel/billingHistoryModel.js";
import { addMonths } from "../../utils/dateBillingUtils.js";

export const chargeWithPaystack = async (subscription) => {
  const billing = await BillingHistory.findOne({
    subscription: subscription._id,
    status: "pending"
  }).sort({ createdAt: -1 });

  if (!billing) return;

  billing.status = "paid";
  billing.providerReference = "PAYSTACK_REF_123";
  await billing.save();

  const now = new Date();

  subscription.status = "active";
  subscription.gracePeriodEnd = null;
  subscription.expiryWarning.shown = false;

  subscription.nextBillingDate = addMonths(
    now,
    subscription.billingInterval === "monthly"
      ? 1
      : subscription.billingInterval === "halfYear"
      ? 6
      : 12
  );

  await subscription.save();
};
