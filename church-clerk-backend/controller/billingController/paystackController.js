import BillingHistory from "../../models/billingModel/billingHistoryModel.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import Plan from "../../models/billingModel/planModel.js";
import https from "https";
import { addDays, addMonths } from "../../utils/dateBillingUtils.js";
import { getSystemSettingsSnapshot } from "../systemSettingsController.js";

export const chargeWithPaystack = async (subscription) => {
  const billing = await BillingHistory.findOne({
    subscription: subscription._id,
    status: "pending"
  }).sort({ createdAt: -1 });

  if (!billing) return;

  billing.status = "paid";
  billing.providerReference = "PAYSTACK_REF_123";
  await billing.save();

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
};

const paystackRequest = ({ path, method, body }) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : "";

    const secretKey = process.env.PAYSTACK_SECRET_KEY || process.env.TEST_SECRET_KEY;

    if (!secretKey) {
      return reject(new Error("Paystack secret key is not configured"));
    }

    const req = https.request(
      {
        hostname: "api.paystack.co",
        path,
        method,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
              return reject(new Error(json?.message || "Paystack request failed"));
            }
            if (!json?.status) {
              return reject(new Error(json?.message || "Paystack returned an error"));
            }
            resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });

export const initializePaystackPayment = async (req, res) => {
  try {
    const { planId, billingInterval = "monthly", currency: requestedCurrency } = req.body;

    const churchId = req.activeChurch?._id || req.user?.church;
    const subscription = churchId ? await Subscription.findOne({ church: churchId }) : null;
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const currency = requestedCurrency ? String(requestedCurrency).trim().toUpperCase() : subscription.currency;
    if (currency !== "GHS" && currency !== "NGN" && currency !== "USD") {
      return res.status(400).json({ message: "Unsupported currency" });
    }

    if (currency !== "GHS" && currency !== "NGN") {
      return res.status(400).json({
        message: "Paystack is only available for GHS and NGN churches"
      });
    }

    const amount = plan.pricing?.[currency]?.[billingInterval];
    if (!amount) {
      return res.status(400).json({ message: "Pricing not configured" });
    }

    subscription.billingInterval = billingInterval;
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
        billingInterval,
        amount,
        currency
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const init = await paystackRequest({
      method: "POST",
      path: "/transaction/initialize",
      body: {
        email: req.user.email,
        amount: Math.round(amount * 100),
        currency,
        callback_url: `${frontendUrl}/dashboard/billing`,
        metadata: {
          billingId: billing._id.toString(),
          subscriptionId: subscription._id.toString(),
          churchId: subscription.church.toString()
        }
      }
    });

    billing.providerReference = init.data.reference;
    await billing.save();

    return res.status(200).json({
      authorizationUrl: init.data.authorization_url,
      reference: init.data.reference,
      accessCode: init.data.access_code
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const chargePaystackMobileMoney = async (req, res) => {
  try {
    const { planId, billingInterval = "monthly", provider, phone, currency: requestedCurrency } = req.body;

    if (!provider || !phone) {
      return res.status(400).json({ message: "Provider and phone are required" });
    }

    const normalizedProvider = String(provider).toLowerCase();
    const normalizedPhone = String(phone).replace(/\D+/g, "");

    if (!["mtn", "vod", "tgo"].includes(normalizedProvider)) {
      return res.status(400).json({ message: "Unsupported mobile money provider" });
    }

    if (!normalizedPhone || normalizedPhone.length !== 10 || !normalizedPhone.startsWith("0")) {
      return res.status(400).json({ message: "Mobile number must be 10 digits and start with 0" });
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

    const currency = requestedCurrency ? String(requestedCurrency).trim().toUpperCase() : subscription.currency;
    if (currency !== "GHS" && currency !== "NGN" && currency !== "USD") {
      return res.status(400).json({ message: "Unsupported currency" });
    }

    if (currency !== "GHS") {
      return res.status(400).json({ message: "Mobile money is only available for GHS churches" });
    }

    const amount = plan.pricing?.[currency]?.[billingInterval];
    if (!amount) {
      return res.status(400).json({ message: "Pricing not configured" });
    }

    subscription.billingInterval = billingInterval;
    subscription.currency = currency;
    subscription.paymentProvider = "paystack";

    subscription.paymentMethods = Array.isArray(subscription.paymentMethods) ? subscription.paymentMethods : [];
    const exists = subscription.paymentMethods.some(
      (m) => String(m?.type || "mobile_money") === "mobile_money" && String(m?.provider || "") === normalizedProvider && String(m?.phone || "") === normalizedPhone
    );
    if (!exists) {
      subscription.paymentMethods.push({ type: "mobile_money", provider: normalizedProvider, phone: normalizedPhone });
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

    const charge = await paystackRequest({
      method: "POST",
      path: "/charge",
      body: {
        email: req.user.email,
        amount: Math.round(amount * 100),
        currency,
        mobile_money: {
          phone: normalizedPhone,
          provider: normalizedProvider
        },
        metadata: {
          billingId: billing._id.toString(),
          subscriptionId: subscription._id.toString(),
          churchId: subscription.church.toString()
        }
      }
    });

    const reference = charge?.data?.reference;
    if (reference) {
      billing.providerReference = reference;
      await billing.save();
    }

    return res.status(200).json({ reference, status: charge?.data?.status || "pending" });
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

    const billing = await BillingHistory.findOne({
      church: churchId,
      providerReference: reference,
      paymentProvider: "paystack"
    }).sort({ status: 1, createdAt: -1 });

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

        const authorization = verification?.data?.authorization || null;
        const authCode = authorization?.authorization_code;
        if (authCode) {
          subscription.paymentMethods = Array.isArray(subscription.paymentMethods) ? subscription.paymentMethods : [];
          const exists = subscription.paymentMethods.some(
            (pm) =>
              String(pm?.type || "") === "card" &&
              String(pm?.authorizationCode || "") === String(authCode)
          );
          if (!exists) {
            subscription.paymentMethods.push({
              type: "card",
              brand: authorization?.brand || null,
              last4: authorization?.last4 || null,
              expMonth: authorization?.exp_month ? Number(authorization.exp_month) : null,
              expYear: authorization?.exp_year ? Number(authorization.exp_year) : null,
              authorizationCode: authCode
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
      }

      const populated = await Subscription.findById(subscription._id).populate("plan").lean();
      return res.json({ status: "paid", subscription: populated });
    }

    if (status === "failed" || status === "abandoned") {
      if (billing.status !== "failed") {
        billing.status = "failed";
        await billing.save();
      }

      subscription.status = "past_due";
      {
        const { gracePeriodDays } = await getSystemSettingsSnapshot();
        subscription.gracePeriodEnd = addDays(new Date(), Number(gracePeriodDays || 3));
      }
      await subscription.save();

      const populated = await Subscription.findById(subscription._id).populate("plan").lean();
      return res.json({ status: "failed", subscription: populated });
    }

    const populated = await Subscription.findById(subscription._id).populate("plan").lean();
    return res.json({ status: status || "unknown", subscription: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
