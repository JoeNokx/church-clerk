import Subscription from "../models/billingModel/subscriptionModel.js";
import Plan from "../models/billingModel/planModel.js";

export const blockMemberCreationIfOverdue = async (req, res, next) => {
  const subscription = await Subscription.findOne({
    church: req.activeChurch._id
  }).lean();

  let memberLimit = null;
  if (subscription?.plan) {
    const plan = await Plan.findById(subscription.plan).select("memberLimit").lean();
    if (plan && plan.memberLimit !== undefined) memberLimit = plan.memberLimit;
  }

  if (subscription?.overage?.isOverLimit) {
    const formattedLimit =
      memberLimit === null || memberLimit === undefined
        ? ""
        : ` {${Number(memberLimit).toLocaleString()}}`;

    return res.status(403).json({
      message: `You’ve reached your member limit${formattedLimit}. Upgrade to add more members.`
    });
  }

  next();
};
