import mongoose from "mongoose";
import Subscription from "../models/billingModel/subscriptionModel.js";
import Plan from "../models/billingModel/planModel.js";
import Church from "../models/churchModel.js";
import {handlePaymentFailure} from "../controller/billingController/gracePeriodController.js";
import {processBillingForSubscription} from "../controller/billingController/processBillingSubscription.js";
import {chargeWithPaystack} from "../controller/billingController/paystackController.js";
import {
  sendCancellationAppliedEmail,
  sendDowngradeAppliedEmail
} from "../utils/subscriptionEmails.js";

export const runDailyBillingJob = async () => {
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

    if (subscription.pendingPlan) {
      const effectiveAt = subscription.pendingPlanEffectiveDate || subscription.nextBillingDate;
      if (effectiveAt && new Date(effectiveAt) <= today) {
        pendingAction = subscription.pendingPlanAction;
        const newPlan = await Plan.findById(subscription.pendingPlan).lean();

        subscription.plan = subscription.pendingPlan;
        subscription.pendingPlan = null;
        subscription.pendingPlanEffectiveDate = null;
        subscription.pendingPlanAction = null;
        pendingActionApplied = true;

        await subscription.save();

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
    const result = await processBillingForSubscription(subscription);

    if (result.charged) {
      // Attempt card auto-deduction if a stored card exists.
      // Mobile money cannot be auto-debited — always goes to past_due.
      const hasCard = (subscription.paymentMethods || []).some(
        (pm) => String(pm?.type || "") === "card" && pm?.authorizationCode
      );

      if (hasCard) {
        try {
          await chargeWithPaystack(subscription);
          // chargeWithPaystack marks billing paid and advances nextBillingDate on success
        } catch (chargeErr) {
          console.error("[BillingCron] card auto-charge failed:", chargeErr?.message || chargeErr);
          await handlePaymentFailure(subscription);
        }
      } else {
        await handlePaymentFailure(subscription);
      }
    }
  }
};

let billingWorkerInterval = null;

export function startBillingCronWorker({ intervalMs = 24 * 60 * 60 * 1000 } = {}) {
  if (billingWorkerInterval) return;

  const tick = async () => {
    if (mongoose.connection?.readyState !== 1) return;
    try {
      await runDailyBillingJob();
    } catch (e) {
      console.error("[BillingCron] error:", e?.message || e);
    }
  };

  void tick();
  billingWorkerInterval = setInterval(tick, intervalMs);
}

export function stopBillingCronWorker() {
  if (!billingWorkerInterval) return;
  clearInterval(billingWorkerInterval);
  billingWorkerInterval = null;
}
