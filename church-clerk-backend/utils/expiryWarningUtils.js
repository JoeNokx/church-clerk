export const getExpiryInfo = (subscription) => {
  const today = new Date();

  const expiryDate =
    subscription.status === "trialing"
      ? subscription.trialEnd
      : subscription.nextBillingDate;

  if (!expiryDate) return null;

  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 7 && diffDays > 0) {
    return {
      isExpiring: true,
      daysRemaining: diffDays,
      type: subscription.status === "trialing"
        ? "trial_expiry"
        : "expiry_warning"
    };
  }

  return { isExpiring: false };
};


