import { createSubscriptionForChurch, upgradeTrialToPlans, runBillingCycles } from "./subscriptionService.js";
import Subscription from "../../models/billingModel/subscriptionModel.js";
import Plan from "../../models/billingModel/planModel.js";
import Church from "../../models/churchModel.js";
import BillingHistory from "../../models/billingModel/billingHistoryModel.js";
import PDFDocument from "pdfkit";


const planRank = (plan) => {
  const n = String(plan?.name || "")
    .trim()
    .toLowerCase();
  if (n === "free lite") return 0;
  if (n === "basic") return 1;
  if (n === "standard") return 2;
  if (n === "premium") return 3;
  return 99;
};

const sortPlans = (plans) => {
  const rows = Array.isArray(plans) ? plans : [];
  return rows.slice().sort((a, b) => {
    const ar = planRank(a);
    const br = planRank(b);
    if (ar !== br) return ar - br;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });
};

export const chooseSubscription = async (req, res) => {
  try {
    const {
      churchId,
      planId = null,
      trial = false,
      currency = "GHS",
      billingInterval = "monthly",
      billingCycle
    } = req.body;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({ message: "Church not found" });
    }

    const subscription = await createSubscriptionForChurch({
      church,
      planId,
      trial,
      currency,
      billingInterval: billingCycle || billingInterval
    });

    res.status(201).json({
      message: "Subscription created successfully",
      subscriptionId: subscription._id,
      status: subscription.status
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const luhnCheck = (value) => {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (Number.isNaN(d)) return false;
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

const detectCardBrand = (digits) => {
  const v = String(digits || "");
  if (/^4/.test(v)) return "Visa";
  if (/^(5[1-5])/.test(v)) return "Mastercard";
  if (/^(2[2-7])/.test(v)) return "Mastercard";
  return "Visa/Mastercard";
};

export const addCardPaymentMethod = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church is required" });
    }

    const { cardNumber, expMonth, expYear, cvv, holderName } = req.body;

    const digits = String(cardNumber || "").replace(/\D+/g, "");
    if (!digits || digits.length < 13 || digits.length > 19) {
      return res.status(400).json({ message: "Card number is invalid" });
    }
    if (!luhnCheck(digits)) {
      return res.status(400).json({ message: "Card number is invalid" });
    }

    const m = Number(expMonth);
    const y = Number(expYear);
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      return res.status(400).json({ message: "Expiry month is invalid" });
    }
    if (!Number.isInteger(y) || y < 2000) {
      return res.status(400).json({ message: "Expiry year is invalid" });
    }

    const now = new Date();
    const expiryDate = new Date(y, m, 0, 23, 59, 59, 999);
    if (expiryDate.getTime() < now.getTime()) {
      return res.status(400).json({ message: "Card is expired" });
    }

    const cvvDigits = String(cvv || "").replace(/\D+/g, "");
    if (!cvvDigits || (cvvDigits.length !== 3 && cvvDigits.length !== 4)) {
      return res.status(400).json({ message: "CVV is invalid" });
    }

    const name = String(holderName || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Cardholder name is required" });
    }

    const subscription = await Subscription.findOne({ church: churchId });
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const brand = detectCardBrand(digits);
    const last4 = digits.slice(-4);

    subscription.paymentMethods = Array.isArray(subscription.paymentMethods) ? subscription.paymentMethods : [];
    const exists = subscription.paymentMethods.some(
      (pm) => String(pm?.type || "") === "card" && String(pm?.last4 || "") === String(last4) && Number(pm?.expMonth) === m && Number(pm?.expYear) === y
    );
    if (!exists) {
      subscription.paymentMethods.push({
        type: "card",
        brand,
        last4,
        expMonth: m,
        expYear: y,
        holderName: name
      });
      await subscription.save();
    }

    const populated = await Subscription.findById(subscription._id).populate("plan").lean();
    return res.json({ subscription: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


export const getMySubscription = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church is required" });
    }

    let subscription = await Subscription.findOne({ church: churchId }).populate("plan").lean();

    if (!subscription) {
      const church = await Church.findById(churchId).lean();
      if (!church) {
        return res.status(404).json({ message: "Church not found" });
      }

      await createSubscriptionForChurch({
        church,
        trial: true,
        currency: "GHS",
        billingInterval: "monthly"
      });

      subscription = await Subscription.findOne({ church: churchId }).populate("plan").lean();
    }

    if (!subscription) {
      return res.status(404).json({ message: "No subscription found" });
    }

    const now = new Date();

    const isTrialExpired =
      (subscription.status === "free trial" || subscription.status === "trialing") &&
      subscription.trialEnd &&
      now > new Date(subscription.trialEnd);

    const isGraceExpired =
      subscription.status === "past_due" &&
      subscription.gracePeriodEnd &&
      now > new Date(subscription.gracePeriodEnd);

    const effectivePlan = (subscription.status === "free trial" || subscription.status === "trialing")
      ? await Plan.findOne({ name: { $regex: /^premium$/i }, isActive: true }).lean()
      : subscription.plan;

    const readOnly = Boolean(
      isTrialExpired ||
        subscription.status === "suspended" ||
        isGraceExpired
    );

    res.json({
      subscription,
      effectivePlan: effectivePlan || subscription.plan || null,
      readOnly
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const upgradeTrialToPlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const church = await Church.findById(req.user.church);
    if (!church) return res.status(404).json({ message: "Church not found" });

    const subscription = await upgradeTrialToPlans(church, planId);

    res.json({
      message: "Trial upgraded to plan successfully",
      subscriptionId: subscription._id,
      status: subscription.status
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const runBillingCycle = async (req, res) => {
  try {
    await runBillingCycles();
    res.json({ message: "Billing cycle executed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAvailablePlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).lean();
    return res.json({ plans: sortPlans(plans) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getPublicPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).lean();
    return res.json({ plans: sortPlans(plans) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const downloadBillingInvoice = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church is required" });
    }

    const id = req.params?.id;
    if (!id) {
      return res.status(400).json({ message: "Invoice id is required" });
    }

    const billing = await BillingHistory.findOne({ _id: id, church: churchId }).lean();
    if (!billing) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const createdAt = billing?.createdAt ? new Date(billing.createdAt) : new Date();
    const dateText = createdAt.toLocaleDateString();

    const planName = billing?.invoiceSnapshot?.planName || "—";
    const billingInterval = billing?.invoiceSnapshot?.billingInterval || "—";
    const amount = Number(billing?.amount || 0);
    const currency = billing?.currency || billing?.invoiceSnapshot?.currency || "";
    const status = billing?.status || "—";
    const reference = billing?.providerReference || "—";

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice_${id}.pdf`);
    doc.pipe(res);

    doc.fontSize(18).text("ChurchClerk Invoice", { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#555").text(`Invoice ID: ${id}`);
    doc.text(`Date: ${dateText}`);
    doc.text(`Type: ${billing?.type || "—"}`);
    doc.text(`Status: ${status}`);
    doc.text(`Reference: ${reference}`);

    doc.moveDown(1);
    doc.fillColor("#000").fontSize(12).text("Subscription Snapshot", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Plan: ${planName}`);
    doc.text(`Billing Interval: ${billingInterval}`);
    doc.text(`Amount: ${amount.toLocaleString()} ${currency}`);

    doc.end();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMyBillingHistory = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church is required" });
    }

    const page = Math.max(1, Number(req.query?.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit || 10)));
    const skip = (page - 1) * limit;

    const [totalItems, history] = await Promise.all([
      BillingHistory.countDocuments({ church: churchId }),
      BillingHistory.find({ church: churchId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return res.json({
      history,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const addMobileMoneyPaymentMethod = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church is required" });
    }

    const { provider, phone } = req.body;
    if (!provider || !phone) {
      return res.status(400).json({ message: "Provider and phone are required" });
    }

    const subscription = await Subscription.findOne({ church: churchId });
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const normalizedProvider = String(provider).toLowerCase();
    let normalizedPhone = String(phone).replace(/\D+/g, "");
    if (normalizedPhone.startsWith("233") && normalizedPhone.length === 12) {
      normalizedPhone = `0${normalizedPhone.slice(3)}`;
    }

    if (!["mtn", "vod", "tgo"].includes(normalizedProvider)) {
      return res.status(400).json({ message: "Unsupported mobile money provider" });
    }

    if (!normalizedPhone || normalizedPhone.length !== 10 || !normalizedPhone.startsWith("0")) {
      return res.status(400).json({ message: "Mobile number must be 10 digits and start with 0" });
    }

    const prefix = normalizedPhone.slice(0, 3);
    const prefixByProvider = {
      mtn: ["024", "054", "055", "059"],
      vod: ["020", "050"],
      tgo: ["026", "027", "056", "057"]
    };
    const allowedPrefixes = prefixByProvider[normalizedProvider] || [];
    if (allowedPrefixes.length > 0 && !allowedPrefixes.includes(prefix)) {
      return res.status(400).json({ message: "Mobile number does not match selected provider" });
    }

    subscription.paymentMethods = Array.isArray(subscription.paymentMethods) ? subscription.paymentMethods : [];
    const exists = subscription.paymentMethods.some(
      (m) => String(m?.type || "mobile_money") === "mobile_money" && String(m?.provider || "") === normalizedProvider && String(m?.phone || "") === normalizedPhone
    );
    if (!exists) {
      subscription.paymentMethods.push({ type: "mobile_money", provider: normalizedProvider, phone: normalizedPhone });
      await subscription.save();
    }

    const populated = await Subscription.findById(subscription._id).populate("plan").lean();
    return res.json({ subscription: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const removePaymentMethod = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church is required" });
    }

    const methodId = req.params?.methodId;
    if (!methodId) {
      return res.status(400).json({ message: "Payment method id is required" });
    }

    const subscription = await Subscription.findOne({ church: churchId });
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    subscription.paymentMethods = Array.isArray(subscription.paymentMethods) ? subscription.paymentMethods : [];
    const before = subscription.paymentMethods.length;
    subscription.paymentMethods = subscription.paymentMethods.filter((m) => String(m?._id || "") !== String(methodId));
    if (subscription.paymentMethods.length !== before) {
      await subscription.save();
    }

    const populated = await Subscription.findById(subscription._id).populate("plan").lean();
    return res.json({ subscription: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
