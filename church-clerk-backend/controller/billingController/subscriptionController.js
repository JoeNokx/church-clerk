import Subscription from "../../models/billingModel/subscriptionModel.js";
import Church from "../../models/churchModel.js";
import BillingHistory from "../../models/billingModel/billingHistoryModel.js";
import PDFDocument from "pdfkit";
import { getSystemSettingsSnapshot } from "../systemSettingsController.js";
import { buildPaginationParams, buildPaginationResponse } from "../../utils/paginationHelper.js";
import {
  chooseSubscriptionPlan,
  upgradeTrial,
  executeBillingCycle,
  executeBillingCycleForChurch,
  getAvailablePlans as getAvailablePlansService,
  getSubscriptionForChurch,
  getEffectivePlan
} from "../../services/billing/subscriptionManagementService.js";
import { addCardPaymentMethod as addCardPaymentMethodService } from "../../services/billing/cardPaymentService.js";
import { addMobileMoneyPaymentMethod as addMobileMoneyPaymentMethodService, updateMobileMoneyPaymentMethod } from "../../services/billing/mobileMoneyPaymentService.js";

export const chooseSubscription = async (req, res) => {
  try {
    const {
      churchId,
      planId = null,
      trial = false,
      currency: requestedCurrency,
      billingInterval = "monthly",
      billingCycle
    } = req.body;

    const currency = "GHS";
    const subscription = await chooseSubscriptionPlan(churchId, planId, trial, currency, billingCycle || billingInterval);

    res.status(201).json({
      message: "Subscription created successfully",
      subscriptionId: subscription._id,
      status: subscription.status
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addBankPaymentMethod = async (req, res) => {
  return res.status(400).json({ message: "Bank payment methods are not supported" });
};

export const updatePaymentMethod = async (req, res) => {
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
    const method = subscription.paymentMethods.find((m) => String(m?._id || "") === String(methodId));
    if (!method) {
      return res.status(404).json({ message: "Payment method not found" });
    }

    const type = String(method?.type || "mobile_money").toLowerCase();

    if (type === "card") {
      return res.status(400).json({ message: "Card payment methods cannot be edited" });
    }

    if (type === "bank") {
      return res.status(400).json({ message: "Bank payment methods are not supported" });
    }

    if (type === "mobile_money") {
      const church = await Church.findById(churchId).lean();
      const country = String(church?.country || "").trim().toLowerCase();
      
      const updated = await updateMobileMoneyPaymentMethod(subscription, methodId, req.body, country);
      const populated = await Subscription.findById(updated._id).populate("plan").lean();
      return res.json({ subscription: populated });
    }

    return res.status(400).json({ message: "Unsupported payment method type" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const addCardPaymentMethod = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church is required" });
    }

    const { cardNumber, expMonth, expYear, cvv, holderName } = req.body;

    const subscription = await Subscription.findOne({ church: churchId });
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const updated = await addCardPaymentMethodService(subscription, { cardNumber, expMonth, expYear, cvv, holderName });
    const populated = await Subscription.findById(updated._id).populate("plan").lean();
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

    const subscription = await getSubscriptionForChurch(churchId);
    const { effectivePlan, isTrialExpired, isGraceExpired } = await getEffectivePlan(subscription);

    const readOnly = Boolean(
      isTrialExpired ||
        subscription.status === "suspended" ||
        isGraceExpired
    );

    res.json({
      subscription,
      effectivePlan: effectivePlan || subscription.plan || null,
      pendingPlan: subscription?.pendingPlan || null,
      pendingPlanEffectiveDate: subscription?.pendingPlanEffectiveDate || null,
      pendingPlanAction: subscription?.pendingPlanAction || null,
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

    const subscription = await upgradeTrial(req.user.church, planId);

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
    await executeBillingCycle();
    res.json({ message: "Billing cycle executed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const devRunBillingCycleForChurch = async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ message: "Not found" });
  }
  try {
    const churchId = req.params?.churchId;
    if (!churchId) return res.status(400).json({ message: "churchId is required" });

    await executeBillingCycleForChurch(churchId);

    const updated = await Subscription.findOne({ church: churchId }).populate("plan").lean();
    return res.json({
      message: "Billing cycle ran for this church only",
      subscription: updated
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const devFastForwardSubscription = async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ message: "Not found" });
  }
  try {
    const churchId = req.params?.churchId;
    if (!churchId) return res.status(400).json({ message: "churchId is required" });

    const minutes = Math.max(1, Math.min(Number(req.body?.minutes || 2), 1440));
    if (!Number.isFinite(minutes)) return res.status(400).json({ message: "Invalid minutes" });

    const subscription = await Subscription.findOne({ church: churchId });
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    const newDate = new Date(Date.now() + minutes * 60 * 1000);
    subscription.nextBillingDate = newDate;
    if (subscription.status === "free trial" || subscription.status === "trialing") {
      subscription.trialEnd = newDate;
    }
    await subscription.save();

    return res.json({
      message: `nextBillingDate fast-forwarded by ${minutes} minute(s)`,
      nextBillingDate: subscription.nextBillingDate,
      status: subscription.status
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAvailablePlans = async (req, res) => {
  try {
    const plans = await getAvailablePlansService();
    return res.json({ plans });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getPublicPlans = async (req, res) => {
  try {
    const plans = await getAvailablePlansService();
    return res.json({ plans });
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
    const currency = billing?.currency || billing?.invoiceSnapshot?.currency || "GHS";
    const status = billing?.status || "—";
    const reference = billing?.providerReference || "—";

    const church = await Church.findById(churchId).lean();
    const isGhana = String(church?.country || "").trim().toLowerCase() === "ghana";
    let usdToGhsRate = 0;
    if (!isGhana) {
      const settings = await getSystemSettingsSnapshot();
      usdToGhsRate = Number(settings.usdToGhsRate || 0);
    }
    const showUsd = !isGhana && usdToGhsRate > 0;
    const usdAmount = showUsd ? (amount / usdToGhsRate).toFixed(2) : null;
    const amountLine = showUsd
      ? `${Number(usdAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`
      : `${amount.toLocaleString()} ${currency}`;

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
    doc.text(`Amount: ${amountLine}`);

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

    const { page, limit, skip } = buildPaginationParams(req.query);

    const [totalItems, history] = await Promise.all([
      BillingHistory.countDocuments({ church: churchId }),
      BillingHistory.find({ church: churchId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);

    const pagination = buildPaginationResponse(totalItems, page, limit);

    return res.json({
      history,
      pagination
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

    const church = await Church.findById(churchId).lean();
    const country = String(church?.country || "").trim().toLowerCase();
    if (country !== "ghana") {
      return res.status(400).json({ message: "Mobile money is only available for churches in Ghana" });
    }

    const { provider, phone } = req.body;
    if (!provider || !phone) {
      return res.status(400).json({ message: "Provider and phone are required" });
    }

    const subscription = await Subscription.findOne({ church: churchId });
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const updated = await addMobileMoneyPaymentMethodService(subscription, provider, phone);
    const populated = await Subscription.findById(updated._id).populate("plan").lean();
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
