import { addDays } from "../../utils/dateBillingUtils.js";
import { getSystemSettingsSnapshot } from "../systemSettingsController.js";

export const handlePaymentFailure = async (subscription) => {
  subscription.status = "past_due";
  const { gracePeriodDays } = await getSystemSettingsSnapshot();
  const graceEnd = addDays(new Date(), Number(gracePeriodDays || 3));
  subscription.gracePeriodEnd = graceEnd;
  // Advance nextBillingDate so the cron doesn't retry this subscription on every tick.
  // It will be retried once the grace period expires.
  subscription.nextBillingDate = graceEnd;
  await subscription.save();
};
