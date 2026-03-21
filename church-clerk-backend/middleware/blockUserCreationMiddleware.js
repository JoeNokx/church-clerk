import Subscription from "../models/billingModel/subscriptionModel.js";
import Plan from "../models/billingModel/planModel.js";
import User from "../models/userModel.js";

export const blockUserCreationIfOverLimit = async (req, res, next) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return next();

    const subscription = await Subscription.findOne({ church: churchId }).lean();
    if (!subscription?.plan) return next();

    const plan = await Plan.findById(subscription.plan).select("userLimit").lean();
    const userLimit = plan?.userLimit;
    if (userLimit === null || userLimit === undefined) return next(); // unlimited

    const totalUsers = await User.countDocuments({ church: churchId });

    if (totalUsers >= Number(userLimit)) {
      return res.status(403).json({
        message: "User limit reached. Upgrade to add more team members."
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
