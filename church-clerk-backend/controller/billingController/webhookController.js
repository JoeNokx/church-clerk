import crypto from "crypto";
import BillingHistory from "../../models/billingModel/billingHistoryModel.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import WebhookLog from "../../models/billingModel/webhookLogModel.js";
import ReferralHistory from "../../models/referralModel/referralHistoryModel.js";
import ReferralCode from "../../models/referralModel/referralCodeModel.js";
import { addMonths, addDays } from "../../utils/dateBillingUtils.js";
import { getSystemSettingsSnapshot } from "../systemSettingsController.js";

export const paystackWebhook = async (req, res) => {
  let log = null;
  try {
    // VERIFY PAYSTACK SIGNATURE
    if (!req.rawBody) {
      return res.status(400).send("Missing raw body");
    }

    let parsedEvent = null;
    try {
      parsedEvent = JSON.parse(req.rawBody.toString());
    } catch {
      parsedEvent = null;
    }

    const eventType = parsedEvent?.event || null;
    const reference = parsedEvent?.data?.reference || null;

    log = await WebhookLog.create({
      provider: "paystack",
      eventType,
      reference,
      status: "received",
      headers: {
        "x-paystack-signature": req.headers["x-paystack-signature"] || null,
        "user-agent": req.headers["user-agent"] || null
      },
      payload: parsedEvent
    });

    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || process.env.TEST_SECRET_KEY || "")
      .update(req.rawBody)
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      if (log) {
        log.status = "rejected";
        log.errorMessage = "Invalid signature";
        await log.save();
      }
      return res.status(401).send("Invalid signature");
    }

    const event = parsedEvent || JSON.parse(req.rawBody.toString());

    // HANDLE SUCCESSFUL PAYMENT
    if (event.event === "charge.success") {
      const reference = event.data.reference;

      const billingId = event?.data?.metadata?.billingId;

      const billing = billingId
        ? await BillingHistory.findOne({
            _id: billingId,
            paymentProvider: "paystack"
          })
        : await BillingHistory.findOne({
            providerReference: reference,
            paymentProvider: "paystack"
          }).sort({ createdAt: -1 });

      if (!billing) return res.sendStatus(200);

      if (billing.status === "paid") {
        if (log) {
          log.status = "processed";
          await log.save();
        }
        return res.sendStatus(200);
      }

      // Update billing record
      billing.status = "paid";
      billing.providerReference = reference;
      await billing.save();

      // Load subscription
      const subscription = await Subscription.findById(billing.subscription);
      if (!subscription) return res.sendStatus(200);

      const now = new Date();
      const wasFreeTrial = subscription.status === "free trial" || subscription.status === "trialing";

      subscription.status = "active";
      subscription.gracePeriodEnd = null;
      subscription.expiryWarning.shown = false;

      if (wasFreeTrial) {
        subscription.trialStart = null;
        subscription.trialEnd = null;
      }

      if (billing.invoiceSnapshot?.planId) {
        subscription.plan = billing.invoiceSnapshot.planId;
      }

      if (billing.invoiceSnapshot?.billingInterval) {
        subscription.billingInterval = billing.invoiceSnapshot.billingInterval;
      }

      subscription.paymentProvider = "paystack";

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
      const referralRecord = await ReferralHistory.findOne({
        referredChurch: subscription.church,
        rewardStatus: "pending"
      }).lean();

      if (referralRecord) {
        const referrerSubscription = await Subscription.findOne({
          church: referralRecord.referrerChurch
        });

        if (referrerSubscription) {
          const lockedReferral = await ReferralHistory.findOneAndUpdate(
            {
              _id: referralRecord._id,
              rewardStatus: "pending"
            },
            {
              rewardStatus: "rewarded",
              subscribedAt: new Date()
            },
            { new: true }
          );

          if (lockedReferral) {
            await Subscription.findByIdAndUpdate(referrerSubscription._id, {
              $inc: { "freeMonths.earned": 1 }
            });

            await ReferralCode.findOneAndUpdate(
              { church: referralRecord.referrerChurch },
              { $inc: { totalFreeMonthsEarned: 1 } }
            );

            await BillingHistory.create({
              church: referralRecord.referrerChurch,
              subscription: referrerSubscription._id,
              type: "free_month",
              status: "rewarded",
              amount: 0
            });
          }
        }
      }
    }

    //  HANDLE FAILED PAYMENT
    if (event.event === "charge.failed") {
      const reference = event.data.reference;

      const billingId = event?.data?.metadata?.billingId;

      const billing = billingId
        ? await BillingHistory.findOne({
            _id: billingId,
            paymentProvider: "paystack"
          })
        : await BillingHistory.findOne({
            providerReference: reference,
            paymentProvider: "paystack"
          });

      if (!billing) return res.sendStatus(200);

      if (billing.status === "failed") {
        return res.sendStatus(200);
      }

      billing.status = "failed";
      await billing.save();

      const subscription = await Subscription.findById(billing.subscription);
      if (!subscription) return res.sendStatus(200);

      subscription.status = "past_due";
      {
        const { gracePeriodDays } = await getSystemSettingsSnapshot();
        subscription.gracePeriodEnd = addDays(new Date(), Number(gracePeriodDays || 7));
      }

      await subscription.save();
    }

    if (log) {
      log.status = "processed";
      await log.save();
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Paystack Webhook Error:", error);
    try {
      if (log) {
        log.status = "failed";
        log.errorMessage = error?.message || String(error);
        await log.save();
      } else {
        await WebhookLog.create({
          provider: "paystack",
          status: "failed",
          errorMessage: error?.message || String(error),
          headers: {
            "x-paystack-signature": req.headers["x-paystack-signature"] || null,
            "user-agent": req.headers["user-agent"] || null
          }
        });
      }
    } catch {
      // ignore logging errors
    }
    return res.sendStatus(500);
  }
};
