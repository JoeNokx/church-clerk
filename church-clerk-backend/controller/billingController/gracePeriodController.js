import { addDays } from "../../utils/dateBillingUtils.js";
import { getSystemSettingsSnapshot } from "../systemSettingsController.js";

export const handlePaymentFailure = async (subscription) => {
  subscription.status = "past_due";
  const { gracePeriodDays } = await getSystemSettingsSnapshot();
  subscription.gracePeriodEnd = addDays(new Date(), Number(gracePeriodDays || 3));
  await subscription.save();
};
