export const handlePaymentFailure = async (subscription) => {
  subscription.status = "past_due";
  subscription.gracePeriodEnd = addDays(new Date(), 3);
  await subscription.save();
};
