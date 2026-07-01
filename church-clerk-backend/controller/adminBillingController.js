import Plan from "../models/billingModel/planModel.js";
import Subscription from "../models/billingModel/subscriptionModel.js";
import BillingHistory from "../models/billingModel/billingHistoryModel.js";
import Church from "../models/churchModel.js";
import WebhookLog from "../models/billingModel/webhookLogModel.js";
import PDFDocument from "pdfkit";
import { sendSuspensionEmail } from "../utils/subscriptionEmails.js";
import { rewardReferralIfEligible } from "./referralSystemController.js";
import {
  BILLING_INTERVALS,
  toPaystackInterval,
  paystackRequest,
  createOrUpdatePaystackPlansForInterval
} from "../utils/paystackHelpers.js";
import {
  normalizeBillingIntervalKey,
  clamp,
  normalizePriceByCurrency,
  sanitizePriceByCurrency,
  sanitizePlanCurrencies,
  normalizePlanName,
  validatePlanName
} from "../utils/planHelpers.js";

export const createPlan = async (req, res) => {
  try {
    const { name, description, memberLimit = null, userLimit = null, features = {}, featureCategories = {}, isActive = true } = req.body;
    const rawPriceByCurrency = normalizePriceByCurrency(req.body);
    const priceByCurrency = sanitizePriceByCurrency(rawPriceByCurrency);

    const normalizedName = normalizePlanName(name);

    if (!normalizedName || !priceByCurrency) {
      return res.status(400).json({ message: "Plan name and priceByCurrency are required" });
    }

    validatePlanName(normalizedName);

    const existingPlan = await Plan.findOne({ name: normalizedName });
    if (existingPlan) {
      return res.status(400).json({ message: "Plan already exists" });
    }

    const { codes: paystackPlanCodes, errors: paystackErrors } = await createOrUpdatePaystackPlansForInterval({
      planName: normalizedName,
      paystackPlanCodes: {},
      ghsPrices: priceByCurrency?.GHS || {}
    });

    const plan = await Plan.create({
      name: normalizedName,
      description,
      paystackPlanCodes,
      memberLimit,
      userLimit,
      features,
      featureCategories,
      isActive,
      priceByCurrency,
      pricing: priceByCurrency,
      createdBy: req.user._id
    });

    return res.status(201).json({
      message: "Plan created successfully",
      plan: sanitizePlanCurrencies(plan),
      ...(paystackErrors.length ? { paystackWarnings: paystackErrors } : {})
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });
    const sanitized = Array.isArray(plans) ? plans.map(sanitizePlanCurrencies) : [];
    return res.status(200).json({ message: "Plans fetched successfully", plans: sanitized });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const existing = await Plan.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Plan not found" });

    const before = typeof existing.toObject === "function" ? existing.toObject() : existing;
    const updates = { ...req.body };

    if (typeof updates.name === "string") {
      updates.name = normalizePlanName(updates.name);
      validatePlanName(updates.name);
    }

    const rawPriceByCurrency = normalizePriceByCurrency(req.body);
    const priceByCurrency = rawPriceByCurrency ? sanitizePriceByCurrency(rawPriceByCurrency) : null;
    if (rawPriceByCurrency && !priceByCurrency) {
      return res.status(400).json({ message: "Only GHS pricing is supported" });
    }
    if (priceByCurrency) {
      updates.priceByCurrency = priceByCurrency;
      updates.pricing = priceByCurrency;
    }

    delete updates.createdBy;

    const plan = await Plan.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    const after = typeof plan?.toObject === "function" ? plan.toObject() : plan;

    const prevGhs = before?.priceByCurrency?.GHS || before?.pricing?.GHS || {};
    const nextGhs = after?.priceByCurrency?.GHS || after?.pricing?.GHS || {};

    const changedIntervals = BILLING_INTERVALS.filter((k) => {
      const a = prevGhs?.[k];
      const b = nextGhs?.[k];
      if (a === undefined && b === undefined) return false;
      return Number(a) !== Number(b);
    });

    let paystackWarnings = [];
    if (changedIntervals.length) {
      const planName = after?.name || existing?.name || "";
      const partialPrices = {};
      for (const k of changedIntervals) partialPrices[k] = nextGhs?.[k];

      const { codes: updatedCodes, errors } = await createOrUpdatePaystackPlansForInterval({
        planName,
        paystackPlanCodes: after?.paystackPlanCodes || {},
        ghsPrices: partialPrices
      });

      paystackWarnings = errors;

      await Plan.findByIdAndUpdate(req.params.id, { paystackPlanCodes: updatedCodes }, { runValidators: false });
    }

    const finalPlan = await Plan.findById(req.params.id).lean();
    return res.status(200).json({
      message: "Plan updated",
      plan: sanitizePlanCurrencies(finalPlan),
      ...(paystackWarnings.length ? { paystackWarnings } : {})
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    return res.status(200).json({ message: "Plan deleted", plan });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().populate("church plan").sort({ createdAt: -1 });
    return res.status(200).json({ message: "Subscriptions fetched successfully", subscriptions });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Subscription id is required" });

    const allowed = [
      "status",
      "billingInterval",
      "nextBillingDate",
      "gracePeriodEnd",
      "trialStart",
      "trialEnd",
      "pendingPlan",
      "plan"
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) updates[key] = req.body[key];
    }

    if (req.body?.planId) {
      updates.plan = req.body.planId;
      updates.pendingPlan = null;
      updates.pendingPlanEffectiveDate = null;
      updates.pendingPlanAction = null;
    }
    if (req.body?.pendingPlanId) updates.pendingPlan = req.body.pendingPlanId;

    const sub = await Subscription.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    }).populate("church plan");

    if (!sub) return res.status(404).json({ message: "Subscription not found" });
    return res.json({ message: "Subscription updated", subscription: sub });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const adminSuspendSubscription = async (req, res) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Subscription id is required" });

    const sub = await Subscription.findById(id).populate("church plan");
    if (!sub) return res.status(404).json({ message: "Subscription not found" });

    sub.status = "suspended";
    await sub.save();

    try {
      const church = await Church.findById(sub.church).lean();
      await sendSuspensionEmail(church);
    } catch { /* email failure must not abort */ }

    return res.json({ message: "Subscription suspended", subscription: sub });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const adminResumeSubscription = async (req, res) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Subscription id is required" });

    const sub = await Subscription.findByIdAndUpdate(
      id,
      { status: "active", gracePeriodEnd: null },
      { new: true, runValidators: true }
    ).populate("church plan");

    if (!sub) return res.status(404).json({ message: "Subscription not found" });
    return res.json({ message: "Subscription resumed", subscription: sub });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getPayments = async (req, res) => {
  try {
    const page = clamp(req.query?.page || 1, 1, 100000);
    const limit = clamp(req.query?.limit || 25, 1, 200);
    const skip = (page - 1) * limit;

    const status = req.query?.status ? String(req.query.status).toLowerCase() : "";
    const churchId = req.query?.churchId ? String(req.query.churchId) : "";

    const query = { type: "payment" };
    if (status) query.status = status;
    if (churchId) query.church = churchId;

    const [totalItems, payments] = await Promise.all([
      BillingHistory.countDocuments(query),
      BillingHistory.find(query)
        .populate("church")
        .populate({ path: "subscription", populate: { path: "plan" } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return res.json({
      payments,
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

export const verifyPayment = async (req, res) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Payment id is required" });

    const billing = await BillingHistory.findById(id);
    if (!billing) return res.status(404).json({ message: "Payment not found" });
    if (billing.paymentProvider !== "paystack") {
      return res.status(400).json({ message: "Only Paystack payments can be verified" });
    }

    const reference = billing.providerReference;
    if (!reference) {
      return res.status(400).json({ message: "Payment reference is missing" });
    }

    const verification = await paystackRequest({
      method: "GET",
      path: `/transaction/verify/${encodeURIComponent(reference)}`
    });

    const paystackStatus = String(verification?.data?.status || "").toLowerCase();
    if (paystackStatus === "success") {
      billing.status = "paid";
      await billing.save();

      await Subscription.findByIdAndUpdate(billing.subscription, {
        status: "active",
        gracePeriodEnd: null
      });

      // Fire referral reward (idempotent — no-op if already rewarded)
      try {
        const sub = await Subscription.findById(billing.subscription).lean();
        if (sub?.church) await rewardReferralIfEligible(sub.church);
      } catch (referralErr) {
        console.error("[adminVerifyPayment] referral reward error:", referralErr?.message || referralErr);
      }
    } else if (paystackStatus === "failed" || paystackStatus === "abandoned") {
      billing.status = "failed";
      await billing.save();
      await Subscription.findByIdAndUpdate(billing.subscription, { status: "past_due" });
    }

    const populated = await BillingHistory.findById(billing._id)
      .populate("church")
      .populate({ path: "subscription", populate: { path: "plan" } })
      .lean();
    return res.json({ message: "Payment verified", payment: populated, paystackStatus });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getRevenueStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfTrend = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 7);

    const [
      totalRevenueAgg,
      monthRevenueAgg,
      yearRevenueAgg,
      activeSubscriptions,
      expiringSubscriptions,
      failedPayments,
      monthlyTrendAgg,
      planRevenueAgg
    ] = await Promise.all([
      BillingHistory.aggregate([
        { $match: { type: "payment", status: "paid" } },
        { $group: { _id: "$currency", amount: { $sum: "$amount" } } }
      ]),
      BillingHistory.aggregate([
        { $match: { type: "payment", status: "paid", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: "$currency", amount: { $sum: "$amount" } } }
      ]),
      BillingHistory.aggregate([
        { $match: { type: "payment", status: "paid", createdAt: { $gte: startOfYear } } },
        { $group: { _id: "$currency", amount: { $sum: "$amount" } } }
      ]),
      Subscription.countDocuments({ status: "active" }),
      Subscription.countDocuments({ nextBillingDate: { $gte: now, $lte: soon } }),
      BillingHistory.countDocuments({ type: "payment", status: "failed", createdAt: { $gte: startOfMonth } }),
      BillingHistory.aggregate([
        { $match: { type: "payment", status: "paid", createdAt: { $gte: startOfTrend } } },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            total: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),
      BillingHistory.aggregate([
        { $match: { type: "payment", status: "paid" } },
        {
          $group: {
            _id: "$invoiceSnapshot.planName",
            total: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } },
        { $limit: 6 }
      ])
    ]);

    const toMap = (agg) =>
      (Array.isArray(agg) ? agg : []).reduce((acc, row) => {
        acc[row._id || ""] = Number(row.amount || 0);
        return acc;
      }, {});

    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyTrend = (monthlyTrendAgg || []).map((r) => ({
      month: `${MONTHS[(r._id.month || 1) - 1]} ${r._id.year}`,
      amount: Math.round(Number(r.total || 0) * 100) / 100,
      transactions: Number(r.count || 0)
    }));

    const planRevenue = (planRevenueAgg || []).map((r) => ({
      plan: String(r._id || "Unknown"),
      total: Math.round(Number(r.total || 0) * 100) / 100,
      count: Number(r.count || 0)
    }));

    return res.json({
      totals: {
        totalRevenue: toMap(totalRevenueAgg),
        revenueThisMonth: toMap(monthRevenueAgg),
        revenueThisYear: toMap(yearRevenueAgg)
      },
      kpis: {
        activeSubscriptions,
        expiringSubscriptions,
        failedPayments
      },
      monthlyTrend,
      planRevenue
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const page = clamp(req.query?.page || 1, 1, 100000);
    const limit = clamp(req.query?.limit || 25, 1, 200);
    const skip = (page - 1) * limit;

    const status = req.query?.status ? String(req.query.status).toLowerCase() : "";
    const query = { type: "invoice" };
    if (status) query.status = status;

    const [totalItems, invoices] = await Promise.all([
      BillingHistory.countDocuments(query),
      BillingHistory.find(query)
        .populate("church")
        .populate({ path: "subscription", populate: { path: "plan" } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return res.json({
      invoices,
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

export const createInvoice = async (req, res) => {
  try {
    const { churchId, subscriptionId, amount, currency = "GHS", dueDate, planId, planName, billingInterval } = req.body;
    if (!churchId || !subscriptionId || amount === undefined || amount === null) {
      return res.status(400).json({ message: "churchId, subscriptionId and amount are required" });
    }

    const [church, subscription] = await Promise.all([
      Church.findById(churchId).lean(),
      Subscription.findById(subscriptionId).lean()
    ]);
    if (!church) return res.status(404).json({ message: "Church not found" });
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    let resolvedPlanName = planName || null;
    if (!resolvedPlanName && planId) {
      const p = await Plan.findById(planId).lean();
      resolvedPlanName = p?.name || null;
    }

    const invoiceNumber = `INV-${Date.now()}`;
    const inv = await BillingHistory.create({
      church: church._id,
      subscription: subscription._id,
      type: "invoice",
      status: "unpaid",
      amount: Number(amount || 0),
      currency,
      paymentProvider: null,
      invoiceNumber,
      dueDate: dueDate ? new Date(dueDate) : null,
      invoiceSnapshot: {
        planId: planId || subscription.plan || null,
        planName: resolvedPlanName,
        billingInterval: billingInterval || subscription.billingInterval || null,
        amount: Number(amount || 0),
        currency
      }
    });

    const populated = await BillingHistory.findById(inv._id)
      .populate("church")
      .populate({ path: "subscription", populate: { path: "plan" } })
      .lean();
    return res.status(201).json({ message: "Invoice created", invoice: populated });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const markInvoiceStatus = async (req, res) => {
  try {
    const id = req.params?.id;
    const { status } = req.body;
    if (!id) return res.status(400).json({ message: "Invoice id is required" });
    const nextStatus = String(status || "").toLowerCase();
    if (!nextStatus || !["paid", "unpaid"].includes(nextStatus)) {
      return res.status(400).json({ message: "Status must be paid or unpaid" });
    }

    const invoice = await BillingHistory.findOneAndUpdate(
      { _id: id, type: "invoice" },
      { status: nextStatus },
      { new: true }
    )
      .populate("church")
      .populate({ path: "subscription", populate: { path: "plan" } });

    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    return res.json({ message: "Invoice updated", invoice });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Invoice id is required" });

    const billing = await BillingHistory.findById(id)
      .populate("church")
      .populate({ path: "subscription", populate: { path: "plan" } })
      .lean();
    if (!billing) return res.status(404).json({ message: "Invoice not found" });

    const createdAt = billing?.createdAt ? new Date(billing.createdAt) : new Date();
    const dateText = createdAt.toLocaleDateString();
    const dueText = billing?.dueDate ? new Date(billing.dueDate).toLocaleDateString() : "—";

    const churchName = billing?.church?.name || "—";
    const planName = billing?.invoiceSnapshot?.planName || billing?.subscription?.plan?.name || "—";
    const billingInterval = billing?.invoiceSnapshot?.billingInterval || "—";
    const amount = Number(billing?.amount || 0);
    const currency = billing?.currency || billing?.invoiceSnapshot?.currency || "";
    const status = billing?.status || "—";
    const reference = billing?.providerReference || "—";
    const invoiceNumber = billing?.invoiceNumber || id;

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice_${invoiceNumber}.pdf`);
    doc.pipe(res);

    doc.fontSize(18).text("ChurchClerk Invoice", { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#555").text(`Invoice: ${invoiceNumber}`);
    doc.text(`Date: ${dateText}`);
    doc.text(`Due Date: ${dueText}`);
    doc.text(`Church: ${churchName}`);
    doc.text(`Status: ${status}`);
    doc.text(`Reference: ${reference}`);

    doc.moveDown(1);
    doc.fillColor("#000").fontSize(12).text("Billing Details", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Plan: ${planName}`);
    doc.text(`Billing Interval: ${billingInterval}`);
    doc.text(`Amount: ${amount.toLocaleString()} ${currency}`);

    doc.end();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getWebhookLogs = async (req, res) => {
  try {
    const page = clamp(req.query?.page || 1, 1, 100000);
    const limit = clamp(req.query?.limit || 25, 1, 200);
    const skip = (page - 1) * limit;

    const provider = req.query?.provider ? String(req.query.provider).toLowerCase() : "";
    const eventType = req.query?.eventType ? String(req.query.eventType) : "";
    const status = req.query?.status ? String(req.query.status).toLowerCase() : "";

    const query = {};
    if (provider) query.provider = provider;
    if (eventType) query.eventType = eventType;
    if (status) query.status = status;

    const [totalItems, logs] = await Promise.all([
      WebhookLog.countDocuments(query),
      WebhookLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return res.json({
      logs,
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
