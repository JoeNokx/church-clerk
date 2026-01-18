import Subscription from "../models/billingModel/subscriptionModel.js";

export const blockMemberCreationIfOverdue = async (req, res, next) => {
  const subscription = await Subscription.findOne({
    church: req.activeChurch._id
  });

  if (
    subscription?.overage?.isOverLimit &&
    new Date() > new Date(subscription.overage.graceEndsAt)
  ) {
    return res.status(403).json({
      message:
        "Member limit exceeded. Please upgrade your plan to add more members."
    });
  }

  next();
};
