export const getExpiryInfo = (subscription) => {
  const today = new Date();

  const isTrial = subscription.status === "free trial" || subscription.status === "trialing";

  const expiryDate =
    isTrial
      ? subscription.trialEnd
      : subscription.nextBillingDate;

  if (!expiryDate) return null;

  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 7 && diffDays > 0) {
    return {
      isExpiring: true,
      daysRemaining: diffDays,
      type: isTrial
        ? "trial_expiry"
        : "expiry_warning"
    };
  }

  return { isExpiring: false };
};


