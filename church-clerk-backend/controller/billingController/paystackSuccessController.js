import BillingHistory from "../../models/billingModel/billingHistoryModel.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import { addInterval } from "../../utils/dateBillingUtils.js";

export const handleSuccessfulPayment = async (subscription, providerRef) => {
  const billing = await BillingHistory.findOne({
    subscription: subscription._id,
    status: "pending"
  }).sort({ createdAt: -1 });

  if (!billing) return;

  billing.status = "paid";
  billing.providerReference = providerRef;
  await billing.save();

  const now = new Date();
  subscription.status = "active";
  subscription.gracePeriodEnd = null;
  subscription.expiryWarning.shown = false;
  subscription.nextBillingDate = addInterval(now, subscription.billingInterval);

  await subscription.save();
};
