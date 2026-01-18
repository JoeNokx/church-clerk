import Subscription from "../models/billingModel/subscriptionModel.js";
import { getExpiryInfo } from "../utils/expiryWarningUtils.js";

export const attachBillingBanner = async (req, res, next) => {
  if (!req.activeChurch) return next();

  const subscription = await Subscription.findOne({
    church: req.activeChurch._id
  }).lean();

  if (!subscription) return next();

  const expiryInfo = getExpiryInfo(subscription);

  if (!expiryInfo?.isExpiring) return next();

  req.billingBanner = {
    type: expiryInfo.type,
    daysRemaining: expiryInfo.daysRemaining,
    message:
      expiryInfo.type === "trial_expiry"
        ? `Your trial ends in ${expiryInfo.daysRemaining} day${expiryInfo.daysRemaining > 1 ? "s" : ""}`
        : `Your subscription expires in ${expiryInfo.daysRemaining} day${expiryInfo.daysRemaining > 1 ? "s" : ""}`
  };

  next();
};

