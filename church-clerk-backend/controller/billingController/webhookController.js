import crypto from "crypto";
import BillingHistory from "../../models/billingModel/billingHistoryModel.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import ReferralHistory from "../../models/referralModel/referralHistoryModel.js";
import ReferralCode from "../../models/referralModel/referralCodeModel.js";
import { addMonths } from "../utils/dateUtils.js";

export const paystackWebhook = async (req, res) => {
  try {
    // VERIFY PAYSTACK SIGNATURE
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(req.body)
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString());

    // HANDLE SUCCESSFUL PAYMENT
    if (event.event === "charge.success") {
      const reference = event.data.reference;

      // 🔒 Idempotency: do not reprocess
      const existingBilling = await BillingHistory.findOne({
        providerReference: reference
      });

      if (existingBilling) {
        return res.sendStatus(200);
      }

      const billing = await BillingHistory.findOne({
        status: "pending"
      }).sort({ createdAt: -1 });

      if (!billing) return res.sendStatus(200);

      // Update billing record
      billing.status = "paid";
      billing.providerReference = reference;
      await billing.save();

      // Load subscription
      const subscription = await Subscription.findById(billing.subscription);
      if (!subscription) return res.sendStatus(200);

      const now = new Date();

      subscription.status = "active";
      subscription.gracePeriodEnd = null;
      subscription.expiryWarning.shown = false;

      subscription.nextBillingDate = addMonths(
        now,
        subscription.billingInterval === "monthly"
          ? 1
          : subscription.billingInterval === "halfYear"
          ? 6
          : 12
      );

      await subscription.save();

      // =============================
      // 3️⃣ REFERRAL REWARD (FIRST PAYMENT ONLY)
      // =============================
      const referral = await ReferralHistory.findOne({
        referredChurch: subscription.church,
        rewardStatus: "pending"
      });

      if (referral) {
        referral.rewardStatus = "rewarded";
        referral.subscribedAt = new Date();
        await referral.save();

        // Increment referrer's free month
        const referrerSubscription = await Subscription.findOne({
          church: referral.referrerChurch
        });

        if (referrerSubscription) {
          referrerSubscription.freeMonths.earned += 1;
          await referrerSubscription.save();
        }

        await ReferralCode.findOneAndUpdate(
          { church: referral.referrerChurch },
          { $inc: { totalFreeMonthsEarned: 1 } }
        );

        await BillingHistory.create({
          church: referral.referrerChurch,
          subscription: referrerSubscription._id,
          type: "free_month",
          status: "rewarded",
          amount: 0
        });
      }
    }

    //  HANDLE FAILED PAYMENT
    if (event.event === "charge.failed") {
      const reference = event.data.reference;

      const billing = await BillingHistory.findOne({
        providerReference: reference
      });

      if (!billing) return res.sendStatus(200);

      billing.status = "failed";
      await billing.save();

      const subscription = await Subscription.findById(billing.subscription);
      if (!subscription) return res.sendStatus(200);

      subscription.status = "past_due";
      subscription.gracePeriodEnd = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      );

      await subscription.save();
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Paystack Webhook Error:", error);
    return res.sendStatus(500);
  }
};
