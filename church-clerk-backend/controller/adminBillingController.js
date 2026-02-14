import Plan from "../models/billingModel/planModel.js";
import Subscription from "../models/billingModel/subscriptionModel.js";
import BillingHistory from "../models/billingModel/billingHistoryModel.js";
import Church from "../models/churchModel.js";
import WebhookLog from "../models/billingModel/webhookLogModel.js";
import https from "https";
import PDFDocument from "pdfkit";

const clamp = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
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
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = data ? JSON.parse(data) : {};
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json);
            } else {
              reject(new Error(json?.message || `Paystack request failed (${res.statusCode})`));
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });

const normalizePriceByCurrency = (body) => {
  const priceByCurrency = body?.priceByCurrency || body?.pricing;
  if (!priceByCurrency) return null;
  return priceByCurrency;
};

const sanitizePriceByCurrency = (priceByCurrency) => {
  if (!priceByCurrency || typeof priceByCurrency !== "object") return null;
  const sanitized = {};
  if (priceByCurrency?.GHS) sanitized.GHS = priceByCurrency.GHS;
  return Object.keys(sanitized).length ? sanitized : null;
};

const sanitizePlanCurrencies = (plan) => {
  if (!plan) return plan;
  const obj = typeof plan.toObject === "function" ? plan.toObject() : plan;
  const copy = { ...obj };

  const nextPricing = {};
  if (copy?.pricing?.GHS) nextPricing.GHS = copy.pricing.GHS;
  copy.pricing = nextPricing;

  const nextPriceByCurrency = {};
  if (copy?.priceByCurrency?.GHS) nextPriceByCurrency.GHS = copy.priceByCurrency.GHS;
  copy.priceByCurrency = nextPriceByCurrency;

  return copy;
};

const normalizePlanName = (name) => {
  return typeof name === "string" ? name.trim().toLowerCase() : name;
};

const validatePlanName = (name) => {
  const allowed = ["free lite", "basic", "standard", "premium"];
  if (!allowed.includes(String(name || "").trim().toLowerCase())) {
    throw new Error("Invalid plan name. Allowed: free lite, basic, standard, premium");
  }
};

export const createPlan = async (req, res) => {
  try {
    const { name, description, memberLimit = null, features = {}, featureCategories = {}, isActive = true } = req.body;
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

    const plan = await Plan.create({
      name: normalizedName,
      description,
      memberLimit,
      features,
      featureCategories,
      isActive,
      priceByCurrency,
      pricing: priceByCurrency,
      createdBy: req.user._id
    });

    return res.status(201).json({ message: "Plan created successfully", plan: sanitizePlanCurrencies(plan) });
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

    if (!plan) return res.status(404).json({ message: "Plan not found" });

    return res.status(200).json({ message: "Plan updated", plan: sanitizePlanCurrencies(plan) });
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

    if (req.body?.planId) updates.plan = req.body.planId;
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
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 7);

    const [
      totalRevenueAgg,
      monthRevenueAgg,
      yearRevenueAgg,
      activeSubscriptions,
      expiringSubscriptions,
      failedPayments
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
      BillingHistory.countDocuments({ type: "payment", status: "failed", createdAt: { $gte: startOfMonth } })
    ]);

    const toMap = (agg) =>
      (Array.isArray(agg) ? agg : []).reduce((acc, row) => {
        acc[row._id || ""] = Number(row.amount || 0);
        return acc;
      }, {});

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
      }
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
