import BillingHistory from "../../models/billingModel/billingHistoryModel.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import Plan from "../../models/billingModel/planModel.js";
import https from "https";
import { addMonths } from "../../utils/dateBillingUtils.js";

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

    const req = https.request(
      {
        hostname: "api.paystack.co",
        path,
        method,
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
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
    const { planId, billingInterval = "monthly" } = req.body;

    const subscription = await Subscription.findOne({ church: req.user.church });
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const currency = subscription.currency;
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
      reference: init.data.reference
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
