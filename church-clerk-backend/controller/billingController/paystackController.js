import BillingHistory from "../../models/billingModel/billingHistoryModel.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import Plan from "../../models/billingModel/planModel.js";
import Church from "../../models/churchModel.js";
import https from "https";
import { addDays, addMonths } from "../../utils/dateBillingUtils.js";
import { getSystemSettingsSnapshot } from "../systemSettingsController.js";

const getSupportedPaystackCurrencies = () => {
  const raw = String(process.env.PAYSTACK_SUPPORTED_CURRENCIES || "").trim();
  const parsed = raw
    ? raw
        .split(",")
        .map((s) => String(s || "").trim().toUpperCase())
        .filter(Boolean)
    : [];

  const onlyGhs = parsed.filter((c) => c === "GHS");
  return onlyGhs.length ? onlyGhs : ["GHS"];
};

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
          const statusCode = res.statusCode || 0;

          let json = null;
          try {
            json = data ? JSON.parse(data) : {};
          } catch {
            json = null;
          }

          if (statusCode < 200 || statusCode >= 300) {
            const msg = json?.message || (data ? String(data).slice(0, 500) : "Paystack request failed");
            return reject(new Error(`${msg} (${statusCode})`));
          }

          if (!json) {
            return reject(new Error("Paystack returned a non-JSON response"));
          }

          if (json?.status === false) {
            return reject(new Error(json?.message || "Paystack returned an error"));
          }

          resolve(json);
        });

        res.on("error", reject);
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });

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
    const { planId, billingInterval = "monthly", channels } = req.body;

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

    const supportedCurrencies = getSupportedPaystackCurrencies();
    if (!supportedCurrencies.includes(currency)) {
      return res.status(400).json({
        message: `Paystack is not configured for ${currency} on this server. Supported currencies: ${supportedCurrencies.join(", ")}.`
      });
    }

    const normalizedChannels = Array.isArray(channels)
      ? channels
          .map((c) => String(c || "").trim().toLowerCase())
          .filter(Boolean)
      : [];

    const amount = plan.pricing?.GHS?.[billingInterval];
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
          churchId: subscription.church.toString()
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

    const email = String(req.user?.email || "").trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).json({ message: "Your account email is missing or invalid. Please update your profile email and try again." });
    }

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

    const currency = "GHS";

    const supportedCurrencies = getSupportedPaystackCurrencies();
    if (!supportedCurrencies.includes(currency)) {
      return res.status(400).json({
        message: `Paystack is not configured for ${currency} on this server. Supported currencies: ${supportedCurrencies.join(", ")}.`
      });
    }

    const amount = plan.pricing?.GHS?.[billingInterval];
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

    if (status === "failed") {
      if (billing.status !== "failed") {
        billing.status = "failed";
        await billing.save();
      }

      subscription.status = "past_due";
      {
        const { gracePeriodDays } = await getSystemSettingsSnapshot();
        subscription.gracePeriodEnd = addDays(new Date(), Number(gracePeriodDays || 7));
      }
      await subscription.save();

      const populated = await Subscription.findById(subscription._id).populate("plan").lean();
      return res.json({ status: "failed", subscription: populated });
    }

    if (status === "abandoned") {
      const populated = await Subscription.findById(subscription._id).populate("plan").lean();
      return res.json({ status: "pending", subscription: populated });
    }

    const populated = await Subscription.findById(subscription._id).populate("plan").lean();
    return res.json({ status: status || "unknown", subscription: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
