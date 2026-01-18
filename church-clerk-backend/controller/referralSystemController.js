import ReferralCode from "../models/referralModel/referralCodeModel.js";
import ReferralHistory from "../models/referralModel/referralHistoryModel.js";
import Subscription from "../models/billingModel/subscriptionModel.js";
import BillingHistory from "../models/billingModel/billingHistoryModel.js";
import Church from "../models/churchModel.js";


/**
 * GET /api/referrals/my-code
 * Returns referral code for the logged-in church
 */
const getMyReferralCode = async (req, res) => {
  try {
    const referralCode = await ReferralCode.findOne({
  church: req.activeChurch._id
});

if (!referralCode) {
  return res.status(404).json({ message: "Referral code not found" });
}

res.json({
  referralCode: referralCode.code,
  totalFreeMonthsEarned: referralCode.totalFreeMonthsEarned,
  totalFreeMonthsUsed: referralCode.totalFreeMonthsUsed,
  freeMonthsRemaining:
    referralCode.totalFreeMonthsEarned - referralCode.totalFreeMonthsUsed
});

  } catch (error) {
    console.error("getMyReferralCode error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



/**
 * GET /api/referrals/history
 * Shows churches referred by the logged-in church
 */
const getReferralHistory = async (req, res) => {
  try {
    if (!req.activeChurch) {
      return res.status(400).json({ message: "Church context not found" });
    }

    const referrals = await ReferralHistory.find({
  referrerChurch: req.activeChurch._id
})
.populate("referredChurch", "name email")
.sort({ referredAt: -1 });


    const history = referrals.map((ref) => ({
  churchName: ref.referredChurch?.name,
  churchEmail: ref.referredChurchEmail,
  referredAt: ref.referredAt,
  subscribedAt: ref.subscribedAt,
  status: ref.rewardStatus
}));


    res.json({ referrals: history });
  } catch (error) {
    console.error("getReferralHistory error:", error);
    res.status(500).json({ message: "Server error" });
  }
};




// Reward a referrer if eligible


const rewardReferralIfEligible = async (churchId) => {
  const referral = await ReferralHistory.findOne({
    referredChurch: churchId,
    rewardStatus: "pending"
  });

  if (!referral) return;

  referral.rewardStatus = "rewarded";
  referral.subscribedAt = new Date();
  await referral.save();

  const subscription = await Subscription.findOne({
    church: referral.referrerChurch
  });

  if (!subscription) return;

  subscription.freeMonths.earned += 1;
  await subscription.save();

  await ReferralCode.findOneAndUpdate(
    { church: referral.referrerChurch },
    { $inc: { totalFreeMonthsEarned: 1 } }
  );

  await BillingHistory.create({
    church: referral.referrerChurch,
    subscription: subscription._id,
    type: "free_month",
    status: "rewarded",
    amount: 0
  });
};


export { getMyReferralCode, getReferralHistory, rewardReferralIfEligible };