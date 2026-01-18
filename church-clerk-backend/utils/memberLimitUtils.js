import Plan from "../models/billingModel/planModel.js";
import Subscription from "../models/billingModel/subscriptionModel.js";
import { addDays } from "./dateBillingUtils.js";

export const checkAndHandleMemberLimit = async ({
  churchId,
  totalMembers
}) => {
  const subscription = await Subscription.findOne({ church: churchId });
  if (!subscription || !subscription.plan) return;

  const plan = await Plan.findById(subscription.plan);
  if (!plan || plan.memberLimit === null) return; // unlimited

  // Over limit
  if (totalMembers > plan.memberLimit) {
    if (!subscription.overage?.isOverLimit) {
      subscription.overage = {
        isOverLimit: true,
        startedAt: new Date(),
        graceEndsAt: addDays(new Date(), 7)
      };
      await subscription.save();
    }
  } else {
    // Back within limit → clear overage
    if (subscription.overage?.isOverLimit) {
      subscription.overage = {
        isOverLimit: false,
        startedAt: null,
        graceEndsAt: null
      };
      await subscription.save();
    }
  }
};
