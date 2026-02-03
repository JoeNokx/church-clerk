import Subscription from "../models/billingModel/subscriptionModel.js";
import {handleSuccessfulPayment} from "../controller/billingController/paystackSuccessController.js";
import {handlePaymentFailure} from "../controller/billingController/gracePeriodController.js";
import {processBillingForSubscription} from "../controller/billingController/processBillingSubscription.js";

export const runDailyBillingJob = async () => {
  const today = new Date();

  const subscriptions = await Subscription.find({
    nextBillingDate: { $lte: today },
    status: { $in: ["active", "past_due"] }
  });

  for (const subscription of subscriptions) {
    const result = await processBillingForSubscription(subscription);

    if (result.charged) {
      await handlePaymentFailure(subscription);
    }

    // Apply scheduled downgrade
    if (subscription.pendingPlan) {
      subscription.plan = subscription.pendingPlan;
      subscription.pendingPlan = null;
      await subscription.save();
    }
  }
};


