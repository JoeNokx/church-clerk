import crypto from "crypto";
import BillingHistory from "../../models/billingModel/billingHistoryModel.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import WebhookLog from "../../models/billingModel/webhookLogModel.js";
import ReferralHistory from "../../models/referralModel/referralHistoryModel.js";
import ReferralCode from "../../models/referralModel/referralCodeModel.js";
import { addDays, addInterval } from "../../utils/dateBillingUtils.js";
import { getSystemSettingsSnapshot } from "../systemSettingsController.js";
import { getPaystackSecretKey } from "../../utils/paystackHelpers.js";

const isCardChargeEvent = (event) => {
  const ch = event?.data?.channel;
  if (!ch) return false;
  return String(ch).trim().toLowerCase() === "card";
};

const extractPaystackSubscriptionCodes = (data) => {
  const d = data || {};
  const customerCode = d?.customer?.customer_code || d?.customer?.code || null;
  const planCode = d?.plan?.plan_code || d?.plan?.plan_code || (typeof d?.plan === "string" ? d.plan : null);
  const subscriptionCode = d?.subscription?.subscription_code || d?.subscription_code || null;
  return {
    customerCode: customerCode ? String(customerCode) : null,
    planCode: planCode ? String(planCode) : null,
    subscriptionCode: subscriptionCode ? String(subscriptionCode) : null
  };
};

const applyPaystackSubscriptionCodesToSubscription = (subscription, codes) => {
  if (!subscription || !codes) return;
  if (codes.customerCode) subscription.paystackCustomerCode = codes.customerCode;
  if (codes.planCode) subscription.paystackPlanCode = codes.planCode;
  if (codes.subscriptionCode) subscription.paystackSubscriptionCode = codes.subscriptionCode;
};

const findSubscriptionFromPaystackEvent = async (event) => {
  const subscriptionId = event?.data?.metadata?.subscriptionId;
  if (subscriptionId) {
    const s = await Subscription.findById(subscriptionId);
    if (s) return s;
  }

  const codes = extractPaystackSubscriptionCodes(event?.data);
  if (codes.customerCode) {
    const s = await Subscription.findOne({ paystackCustomerCode: codes.customerCode });
    if (s) return s;
  }
  if (codes.subscriptionCode) {
    const s = await Subscription.findOne({ paystackSubscriptionCode: codes.subscriptionCode });
    if (s) return s;
  }

  return null;
};

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
      .createHmac("sha512", getPaystackSecretKey())
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

    if (event.event === "subscription.create" || event.event === "invoice.create" || event.event === "invoice.payment_failed") {
      const subscription = await findSubscriptionFromPaystackEvent(event);
      if (subscription) {
        const codes = extractPaystackSubscriptionCodes(event?.data);
        applyPaystackSubscriptionCodesToSubscription(subscription, codes);

        if (event.event === "invoice.payment_failed") {
          subscription.status = "past_due";
          const { gracePeriodDays } = await getSystemSettingsSnapshot();
          const graceEnd = addDays(new Date(), Number(gracePeriodDays ?? 0));
          subscription.gracePeriodEnd = graceEnd;
          subscription.nextBillingDate = graceEnd;
        }

        await subscription.save();
      }
    }

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

      if (isCardChargeEvent(event)) {
        applyPaystackSubscriptionCodesToSubscription(subscription, extractPaystackSubscriptionCodes(event?.data));

        const whAuthorization = event?.data?.authorization || null;
        const whAuthCode = whAuthorization?.authorization_code;
        const whCustomerEmail = String(event?.data?.customer?.email || "").trim() || null;
        if (whAuthCode && whAuthorization?.reusable !== false) {
          subscription.paymentMethods = Array.isArray(subscription.paymentMethods) ? subscription.paymentMethods : [];
          const whLast4 = String(whAuthorization?.last4 || "");
          const whIdx = subscription.paymentMethods.findIndex(
            (pm) =>
              String(pm?.type || "") === "card" &&
              (String(pm?.authorizationCode || "") === String(whAuthCode) ||
                (whLast4 && String(pm?.last4 || "") === whLast4))
          );
          if (whIdx >= 0) {
            if (!subscription.paymentMethods[whIdx].authorizationCode) {
              subscription.paymentMethods[whIdx].authorizationCode = whAuthCode;
            }
            if (whCustomerEmail) {
              subscription.paymentMethods[whIdx].email = whCustomerEmail;
            }
          } else {
            subscription.paymentMethods.push({
              type: "card",
              brand: whAuthorization?.brand || null,
              last4: whAuthorization?.last4 || null,
              expMonth: whAuthorization?.exp_month ? Number(whAuthorization.exp_month) : null,
              expYear: whAuthorization?.exp_year ? Number(whAuthorization.exp_year) : null,
              authorizationCode: whAuthCode,
              email: whCustomerEmail
            });
          }
        }
      }

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

      if (billing.invoiceSnapshot?.isProration && billing.invoiceSnapshot?.retainNextBillingDate) {
        subscription.nextBillingDate = new Date(billing.invoiceSnapshot.retainNextBillingDate);
      } else {
        subscription.nextBillingDate = addInterval(now, subscription.billingInterval);
      }

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
      const { gracePeriodDays } = await getSystemSettingsSnapshot();
      const graceEnd = addDays(new Date(), Number(gracePeriodDays ?? 0));
      subscription.gracePeriodEnd = graceEnd;
      subscription.nextBillingDate = graceEnd;

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
