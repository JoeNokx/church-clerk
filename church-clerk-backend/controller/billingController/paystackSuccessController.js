export const handleSuccessfulPayment = async (subscription, providerRef) => {
  const billing = await BillingHistory.findOne({
    subscription: subscription._id,
    status: "pending"
  }).sort({ createdAt: -1 });

  if (!billing) return;

  billing.status = "paid";
  billing.providerReference = providerRef;
  await billing.save();

  subscription.status = "active";
  subscription.gracePeriodEnd = null;
  subscription.expiryWarning.shown = false;

  subscription.nextBillingDate = addMonths(
    subscription.nextBillingDate,
    subscription.billingInterval === "monthly"
      ? 1
      : subscription.billingInterval === "halfYear"
      ? 6
      : 12
  );

  await subscription.save();
};
