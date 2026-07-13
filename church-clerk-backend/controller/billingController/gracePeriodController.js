import { addDays } from "../../utils/dateBillingUtils.js";
import { getSystemSettingsSnapshot } from "../systemSettingsController.js";
import Church from "../../models/churchModel.js";
import { sendSuspensionEmail } from "../../utils/subscriptionEmails.js";

export const handlePaymentFailure = async (subscription) => {
  const now = new Date();

  // If already past_due and grace period has passed → auto-suspend instead of extending.
  if (
    subscription.status === "past_due" &&
    subscription.gracePeriodEnd &&
    now >= new Date(subscription.gracePeriodEnd)
  ) {
    subscription.status = "suspended";
    await subscription.save();

    try {
      const church = await Church.findById(subscription.church).lean();
      if (church) await sendSuspensionEmail(church);
    } catch { /* email failure must not abort */ }

    return;
  }

  // First failure: enter grace period.
  subscription.status = "past_due";
  const { gracePeriodDays } = await getSystemSettingsSnapshot();
  const graceEnd = addDays(new Date(), Number(gracePeriodDays ?? 0));
  subscription.gracePeriodEnd = graceEnd;
  // Advance nextBillingDate so the cron doesn't retry this subscription on every tick.
  // It will be retried once the grace period expires.
  subscription.nextBillingDate = graceEnd;
  await subscription.save();
};
