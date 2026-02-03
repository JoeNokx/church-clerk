import Subscription from "../models/billingModel/subscriptionModel.js";

export const featureAccessGuard = async (req, res, next) => {
  if (!req.activeChurch) return next();

  const subscription = await Subscription.findOne({
    church: req.activeChurch._id
  });

  if (!subscription) return next();

  if (
  subscription.status === "suspended" ||
  (subscription.status === "past_due" &&
    subscription.gracePeriodEnd &&
    new Date() > subscription.gracePeriodEnd)
) {
  return res.status(402).json({
    message: "Subscription expired. Please renew to continue using the system.",
    locked: true
  });
}


  next();
};
