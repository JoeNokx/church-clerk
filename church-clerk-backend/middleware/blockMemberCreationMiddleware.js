import Subscription from "../models/billingModel/subscriptionModel.js";
import Plan from "../models/billingModel/planModel.js";
import Member from "../models/memberModel.js";

export const blockMemberCreationIfOverdue = async (req, res, next) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return next();

    const subscription = await Subscription.findOne({
      church: churchId
    }).lean();

    if (!subscription?.plan) return next();

    const plan = await Plan.findById(subscription.plan).select("memberLimit").lean();
    const memberLimit = plan?.memberLimit;
    if (memberLimit === null || memberLimit === undefined) return next();

    const totalMembers = await Member.countDocuments({ church: churchId });
    if (totalMembers >= Number(memberLimit)) {
      const formattedLimit = ` ${Number(memberLimit).toLocaleString()}`;
      return res.status(403).json({
        message: `You’ve reached your member limit${formattedLimit}. Upgrade to add more members to your church.`
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
