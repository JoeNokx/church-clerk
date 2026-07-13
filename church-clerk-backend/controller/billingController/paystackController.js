import BillingHistory from "../../models/billingModel/billingHistoryModel.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import Plan from "../../models/billingModel/planModel.js";
import Church from "../../models/churchModel.js";
import User from "../../models/userModel.js";
import { addDays, addInterval } from "../../utils/dateBillingUtils.js";
import { getSystemSettingsSnapshot } from "../systemSettingsController.js";
import { toGhanaNationalFromE164, validatePhoneNumber } from "../../utils/validatePhoneNumber.js";
import { computeProration } from "./prorationController.js";
import { getPaystackSecretKey, paystackRequest } from "../../utils/paystackHelpers.js";
import { normalizeBillingIntervalKey } from "../../utils/planHelpers.js";
import { rewardReferralIfEligible } from "../referralSystemController.js";

const getSupportedPaystackCurrencies = () => {
  const raw = String(process.env.PAYSTACK_SUPPORTED_CURRENCIES || "").trim();
  const parsed = raw
    ? raw
        .split(",")
        .map((s) => String(s || "").trim().toUpperCase())
        .filter(Boolean)
    : [];
  return parsed.length ? parsed : ["GHS", "USD"];
};

export const chargeWithPaystack = async (subscription) => {
  const paymentMethods = Array.isArray(subscription.paymentMethods) ? subscription.paymentMethods : [];
  const card = [...paymentMethods].reverse().find(
    (pm) => String(pm?.type || "") === "card" && pm?.authorizationCode
  );

  if (!card) {
    throw new Error(
      "No stored card authorization found. The subscriber must complete a manual payment to enable automatic renewal."
    );
  }

  const billing = await BillingHistory.findOne({
    subscription: subscription._id,
    status: "pending",
    type: "payment",
    amount: { $gt: 0 }
  }).sort({ createdAt: -1 });

  if (!billing) return;

  // Prefer the email stored on the card (matches Paystack's authorization record).
  // For existing cards without a stored email, look up the customer record from
  // Paystack using the customer code, then backfill the email for future charges.
  const cardEmail = String(card.email || "").trim();
  let email = cardEmail;
  if (!email && subscription.paystackCustomerCode) {
    const fetchedEmail = await fetchPaystackCustomerEmail(subscription.paystackCustomerCode);
    if (fetchedEmail) {
      email = fetchedEmail;
      const cardIdx = subscription.paymentMethods.findIndex(
        (pm) => String(pm?.authorizationCode || "") === String(card.authorizationCode)
      );
      if (cardIdx >= 0) {
        subscription.paymentMethods[cardIdx].email = fetchedEmail;
        await subscription.save();
      }
    }
  }
  if (!email) {
    const church = await Church.findById(subscription.church).lean();
    email = String(church?.email || "").trim();
  }
  if (!email) {
    const adminUser = await User.findOne({ church: subscription.church, role: "churchadmin" }).select("email").lean();
    email = String(adminUser?.email || "").trim();
  }
  if (!email) {
    throw new Error("No email available for automatic card charge. Please re-add your card.");
  }

  const currency = "GHS";
  const amount = Number(billing.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid billing amount for automatic charge.");
  }

  const reference = `CCK_RENEW_${billing._id.toString()}`;

  const response = await paystackRequest({
    method: "POST",
    path: "/transaction/charge_authorization",
    body: {
      email,
      amount: Math.round(amount * 100),
      authorization_code: card.authorizationCode,
      currency,
      reference,
      metadata: {
        type: "auto_renewal",
        billingId: billing._id.toString(),
        subscriptionId: subscription._id.toString(),
        churchId: subscription.church.toString()
      }
    }
  });

  const chargeStatus = String(response?.data?.status || "").toLowerCase();

  if (chargeStatus === "success") {
    billing.status = "paid";
    billing.providerReference = reference;
    await billing.save();

    const now = new Date();
    subscription.status = "active";
    subscription.gracePeriodEnd = null;
    subscription.expiryWarning.shown = false;
    subscription.nextBillingDate = addInterval(now, subscription.billingInterval);
    await subscription.save();
  } else {
    billing.status = "failed";
    billing.providerReference = reference;
    await billing.save();
    throw new Error(`Paystack auto-charge failed with status: ${chargeStatus}`);
  }
};

const fetchPaystackCustomerEmail = async (customerCode) => {
  if (!customerCode) return null;
  try {
    const res = await paystackRequest({ method: "GET", path: `/customer/${encodeURIComponent(customerCode)}` });
    const email = String(res?.data?.email || "").trim();
    return email || null;
  } catch {
    return null;
  }
};

export const getPaystackBanks = async (req, res) => {
  try {
    const currency = String(req.query?.currency || "GHS")
      .trim()
      .toUpperCase();

    if (currency !== "GHS") {
      return res.status(400).json({ message: "Only GHS banks are supported" });
    }

    const supportedCurrencies = getSupportedPaystackCurrencies();
    if (!supportedCurrencies.includes(currency)) {
      return res.status(400).json({
        message: `Paystack is not configured for ${currency} on this server. Supported currencies: ${supportedCurrencies.join(", ")}.`
      });
    }

    const banks = await paystackRequest({
      method: "GET",
      path: `/bank?currency=${encodeURIComponent(currency)}`
    });

    return res.status(200).json({ banks: banks?.data || [] });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const initializePaystackPayment = async (req, res) => {
  try {
    const { planId, billingInterval = "monthly", channels, payment_method, currency: reqCurrency, displayAmount, isUpgrade } = req.body;

    const intervalKey = normalizeBillingIntervalKey(billingInterval) || "monthly";

    const email = String(req.user?.email || "").trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).json({ message: "Your account email is missing or invalid. Please update your profile email and try again." });
    }

    const churchId = req.activeChurch?._id || req.user?.church;
    const subscription = churchId ? await Subscription.findOne({ church: churchId }) : null;
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const currency = "GHS";

    const normalizedChannels = Array.isArray(channels)
      ? channels
          .map((c) => String(c || "").trim().toLowerCase())
          .filter(Boolean)
      : [];

    const normalizedPaymentMethod = payment_method ? String(payment_method).trim().toLowerCase() : "";
    const isCardPayment =
      normalizedPaymentMethod === "card" || (normalizedChannels.length === 1 && normalizedChannels[0] === "card");

    const fullAmount = plan.pricing?.GHS?.[intervalKey] ?? plan.priceByCurrency?.GHS?.[intervalKey];
    if (!fullAmount) {
      return res.status(400).json({ message: "GHS pricing is not configured for this plan and interval" });
    }

    let amount = fullAmount;
    let proratedBreakdown = null;
    let retainNextBillingDate = null;
    let isProrationPayment = false;

    if (isUpgrade && subscription.plan && subscription.nextBillingDate) {
      const currentPlan = await Plan.findById(subscription.plan).lean();
      if (currentPlan) {
        const proration = computeProration(subscription, currentPlan, plan, intervalKey);
        amount = proration.proratedAmount > 0 ? proration.proratedAmount : fullAmount;
        proratedBreakdown = proration;
        retainNextBillingDate = proration.retainNextBillingDate;
        isProrationPayment = true;
      }
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Calculated charge amount is invalid. Please try again." });
    }

    subscription.billingInterval = intervalKey;
    subscription.currency = currency;
    subscription.paymentProvider = "paystack";

    await subscription.save();

    const billing = await BillingHistory.create({
      church: subscription.church,
      subscription: subscription._id,
      type: "payment",
      amount,
      currency,
      status: "pending",
      paymentProvider: "paystack",
      invoiceSnapshot: {
        planId: plan._id,
        planName: plan.name,
        billingInterval: intervalKey,
        amount,
        currency,
        isProration: isProrationPayment,
        retainNextBillingDate: retainNextBillingDate || null,
        proratedBreakdown: proratedBreakdown || null
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const reference = `CCK_${billing._id.toString()}`;

    const init = await paystackRequest({
      method: "POST",
      path: "/transaction/initialize",
      body: {
        email,
        amount: Math.round(amount * 100),
        currency,
        reference,
        ...(normalizedChannels.length ? { channels: normalizedChannels } : {}),
        callback_url: `${frontendUrl}/dashboard/billing`,
        metadata: {
          billingId: billing._id.toString(),
          subscriptionId: subscription._id.toString(),
          churchId: subscription.church.toString(),
          custom_fields: [
            {
              display_name: "Full Name",
              variable_name: "full_name",
              value: String(req.user?.fullName || req.user?.name || "").trim()
            },
            {
              display_name: "Phone Number",
              variable_name: "phone_number",
              value: String(req.user?.phoneNumber || "").trim()
            }
          ]
        }
      }
    });

    billing.providerReference = reference;
    await billing.save();

    return res.status(200).json({
      authorizationUrl: init.data.authorization_url,
      reference,
      accessCode: init.data.access_code
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const chargePaystackMobileMoney = async (req, res) => {
  try {
    const { planId, billingInterval = "monthly", provider, phone } = req.body;

    if (!provider || !phone) {
      return res.status(400).json({ message: "Provider and phone are required" });
    }

    const normalizedProvider = String(provider).toLowerCase();

    let phoneE164;
    try {
      phoneE164 = validatePhoneNumber(phone, "GH");
    } catch (e) {
      return res.status(400).json({ message: e?.message || "Invalid phone number" });
    }

    let paystackNationalPhone;
    try {
      paystackNationalPhone = toGhanaNationalFromE164(phoneE164);
    } catch (e) {
      return res.status(400).json({ message: e?.message || "Invalid phone number" });
    }

    if (!["mtn", "vod", "tgo"].includes(normalizedProvider)) {
      return res.status(400).json({ message: "Unsupported mobile money provider" });
    }

    const email = String(req.user?.email || "").trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).json({ message: "Your account email is missing or invalid. Please update your profile email and try again." });
    }

    const churchId = req.activeChurch?._id || req.user?.church;
    const subscription = churchId ? await Subscription.findOne({ church: churchId }) : null;
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const currency = "GHS";

    const amount = plan.pricing?.GHS?.[billingInterval] ?? plan.priceByCurrency?.GHS?.[billingInterval];
    if (!amount) {
      return res.status(400).json({ message: "Pricing not configured" });
    }

    subscription.billingInterval = billingInterval;
    subscription.currency = currency;
    subscription.paymentProvider = "paystack";

    subscription.paymentMethods = Array.isArray(subscription.paymentMethods) ? subscription.paymentMethods : [];
    const exists = subscription.paymentMethods.some(
      (m) => String(m?.type || "mobile_money") === "mobile_money" && String(m?.provider || "") === normalizedProvider && String(m?.phone || "") === phoneE164
    );
    if (!exists) {
      subscription.paymentMethods.push({ type: "mobile_money", provider: normalizedProvider, phone: phoneE164 });
    }

    await subscription.save();

    const billing = await BillingHistory.create({
      church: subscription.church,
      subscription: subscription._id,
      type: "payment",
      amount,
      currency,
      status: "pending",
      paymentProvider: "paystack",
      invoiceSnapshot: {
        planId: plan._id,
        planName: plan.name,
        billingInterval,
        amount,
        currency
      }
    });

    const reference = `CCK_${billing._id.toString()}`;
    billing.providerReference = reference;
    await billing.save();

    try {
      const charge = await paystackRequest({
        method: "POST",
        path: "/charge",
        body: {
          email,
          amount: Math.round(amount * 100),
          currency,
          reference,
          mobile_money: {
            phone: paystackNationalPhone,
            provider: normalizedProvider
          },
          metadata: {
            billingId: billing._id.toString(),
            subscriptionId: subscription._id.toString(),
            churchId: subscription.church.toString(),
            custom_fields: [
              {
                display_name: "Full Name",
                variable_name: "full_name",
                value: String(req.user?.fullName || req.user?.name || "").trim()
              },
              {
                display_name: "Phone Number",
                variable_name: "phone_number",
                value: String(phoneE164 || "").trim()
              }
            ]
          }
        }
      });

      return res.status(200).json({ reference, status: charge?.data?.status || "pending" });
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("charge attempted")) {
        return res.status(200).json({ reference, status: "pending" });
      }
      throw e;
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const cancelPaystackPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ message: "Payment reference is required" });
    }

    const billing = await BillingHistory.findOne({
      providerReference: reference,
      paymentProvider: "paystack",
      status: "pending"
    });

    if (!billing) {
      return res.status(200).json({ message: "No pending billing record found for this reference" });
    }

    billing.status = "cancelled";
    await billing.save();

    return res.status(200).json({ message: "Payment cancelled" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const verifyPaystackPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ message: "Payment reference is required" });
    }

    const churchId = req.activeChurch?._id || req.user?.church;
    if (!churchId) {
      return res.status(400).json({ message: "Active church is required" });
    }

    const verification = await paystackRequest({
      method: "GET",
      path: `/transaction/verify/${encodeURIComponent(reference)}`
    });

    const status = String(verification?.data?.status || "").toLowerCase();

    let billing = await BillingHistory.findOne({
      church: churchId,
      providerReference: reference,
      paymentProvider: "paystack"
    }).sort({ status: 1, createdAt: -1 });

    if (!billing) {
      const fallback = await BillingHistory.findOne({
        providerReference: reference,
        paymentProvider: "paystack"
      }).sort({ status: 1, createdAt: -1 });

      if (fallback) {
        const userChurchId = req.user?.church;
        if (userChurchId && String(fallback.church) === String(userChurchId)) {
          billing = fallback;
        } else if (userChurchId) {
          const userChurch = await Church.findById(userChurchId).lean();
          if (userChurch?.type === "Headquarters") {
            const targetChurch = await Church.findById(fallback.church).lean();
            if (targetChurch?.parentChurch?.toString() === userChurchId.toString()) {
              billing = fallback;
            }
          }
        }
      }
    }

    if (!billing) {
      return res.status(404).json({ message: "Billing record not found" });
    }

    const subscription = await Subscription.findById(billing.subscription);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    if (status === "success") {
      if (billing.status !== "paid") {
        billing.status = "paid";
        billing.providerReference = reference;
        await billing.save();

        const now = new Date();
        const wasFreeTrial = subscription.status === "free trial" || subscription.status === "trialing";

        subscription.status = "active";
        subscription.gracePeriodEnd = null;
        subscription.expiryWarning.shown = false;

        const customerCode = String(verification?.data?.customer?.customer_code || "").trim() || null;
        if (customerCode) subscription.paystackCustomerCode = customerCode;

        const authorization = verification?.data?.authorization || null;
        const authCode = authorization?.authorization_code;
        const customerEmail = String(verification?.data?.customer?.email || "").trim() || null;
        if (authCode && authorization?.reusable !== false) {
          subscription.paymentMethods = Array.isArray(subscription.paymentMethods) ? subscription.paymentMethods : [];
          const authLast4 = String(authorization?.last4 || "");
          const existingIdx = subscription.paymentMethods.findIndex(
            (pm) =>
              String(pm?.type || "") === "card" &&
              (String(pm?.authorizationCode || "") === String(authCode) ||
                (authLast4 && String(pm?.last4 || "") === authLast4))
          );
          if (existingIdx >= 0) {
            if (!subscription.paymentMethods[existingIdx].authorizationCode) {
              subscription.paymentMethods[existingIdx].authorizationCode = authCode;
            }
            if (!subscription.paymentMethods[existingIdx].brand && authorization?.brand) {
              subscription.paymentMethods[existingIdx].brand = authorization.brand;
            }
            if (customerEmail) {
              subscription.paymentMethods[existingIdx].email = customerEmail;
            }
          } else {
            subscription.paymentMethods.push({
              type: "card",
              brand: authorization?.brand || null,
              last4: authorization?.last4 || null,
              expMonth: authorization?.exp_month ? Number(authorization.exp_month) : null,
              expYear: authorization?.exp_year ? Number(authorization.exp_year) : null,
              authorizationCode: authCode,
              email: customerEmail
            });
          }
        }

        subscription.status = "active";
        subscription.gracePeriodEnd = null;
        subscription.expiryWarning.shown = false;

        if (wasFreeTrial) {
          subscription.trialStart = null;
          subscription.trialEnd = null;
        }

        if (billing.invoiceSnapshot?.planId) {
          subscription.plan = billing.invoiceSnapshot.planId;
          subscription.pendingPlan = null;
          subscription.pendingPlanEffectiveDate = null;
          subscription.pendingPlanAction = null;
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

        // Fire referral reward for the referrer church (idempotent — no-op if already rewarded)
        try {
          await rewardReferralIfEligible(subscription.church);
        } catch (referralErr) {
          console.error("[verifyPaystackPayment] referral reward error:", referralErr?.message || referralErr);
        }
      }

      const populated = await Subscription.findById(subscription._id).populate("plan").lean();
      return res.json({ status: "paid", subscription: populated });
    }

    if (status === "failed") {
      if (billing.status !== "failed") {
        billing.status = "failed";
        await billing.save();
      }

      subscription.status = "past_due";
      const { gracePeriodDays } = await getSystemSettingsSnapshot();
      const graceEnd = addDays(new Date(), Number(gracePeriodDays ?? 0));
      subscription.gracePeriodEnd = graceEnd;
      subscription.nextBillingDate = graceEnd;
      await subscription.save();

      const populated = await Subscription.findById(subscription._id).populate("plan").lean();
      return res.json({ status: "failed", subscription: populated });
    }

    if (status === "abandoned") {
      if (billing.status === "pending") {
        billing.status = "cancelled";
        await billing.save();
      }
      const populated = await Subscription.findById(subscription._id).populate("plan").lean();
      return res.json({ status: "cancelled", subscription: populated });
    }

    const populated = await Subscription.findById(subscription._id).populate("plan").lean();
    return res.json({ status: status || "unknown", subscription: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
