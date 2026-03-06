import mongoose from "mongoose";

import Notification from "../models/notificationModel.js";
import NotificationCursor from "../models/notificationCursorModel.js";

import BillingHistory from "../models/billingModel/billingHistoryModel.js";
import Subscription from "../models/billingModel/subscriptionModel.js";
import Plan from "../models/billingModel/planModel.js";

import Offering from "../models/financeModel/offeringModel.js";
import TitheIndividual from "../models/financeModel/tithesModel/titheIndividualModel.js";
import TitheAggregate from "../models/financeModel/tithesModel/titheAggregateModel.js";

import Church from "../models/churchModel.js";
import User from "../models/userModel.js";
import ActivityLog from "../models/activityLogModel.js";

const CHURCH_ROLES = [
  "churchadmin",
  "associateadmin",
  "secretary",
  "financialofficer",
  "leader"
];

const normalizeRole = (role) => {
  const r = String(role || "").trim().toLowerCase();
  if (r === "super_admin") return "superadmin";
  if (r === "support_admin") return "supportadmin";
  return r;
};

const dayKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const daysBetween = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;

  const startA = new Date(da.getFullYear(), da.getMonth(), da.getDate());
  const startB = new Date(db.getFullYear(), db.getMonth(), db.getDate());

  const diff = startB.getTime() - startA.getTime();
  return Math.round(diff / (24 * 60 * 60 * 1000));
};

async function getOrCreateCursor(name) {
  const existing = await NotificationCursor.findOne({ name }).lean();
  if (existing) return existing;
  const created = await NotificationCursor.create({ name, cursor: null, lastRunAt: null });
  return created.toObject();
}

async function updateCursor(name, cursor) {
  await NotificationCursor.findOneAndUpdate(
    { name },
    { $set: { cursor, lastRunAt: new Date() } },
    { upsert: true }
  );
}

async function getChurchRecipients(churchId) {
  const users = await User.find({
    church: churchId,
    role: { $in: CHURCH_ROLES },
    isActive: true
  })
    .select("_id")
    .lean();

  return users.map((u) => u._id);
}

async function createNotificationOnce({ userId, type, title, message, dedupeKey }) {
  try {
    await Notification.create({ userId, type, title, message, dedupeKey });
  } catch {
    // ignore dupes
  }
}

async function scanBillingHistoryPayments() {
  const cursorDoc = await getOrCreateCursor("billingHistory");

  const cursor = cursorDoc?.cursor?.createdAt ? new Date(cursorDoc.cursor.createdAt) : null;

  const query = cursor ? { createdAt: { $gt: cursor } } : {};

  const rows = await BillingHistory.find(query)
    .sort({ createdAt: 1 })
    .limit(250)
    .lean();

  if (!rows.length) return;

  for (const b of rows) {
    if (!b?.church) continue;

    const recipients = await getChurchRecipients(b.church);
    if (!recipients.length) continue;

    const isPaid = String(b.status) === "paid";
    const isFailed = String(b.status) === "failed";
    if (!isPaid && !isFailed) continue;

    const amount = typeof b.amount === "number" ? b.amount : 0;
    const currency = b.currency || "";
    const planName = b?.invoiceSnapshot?.planName || "";

    const title = isPaid ? "Payment successful" : "Payment failed";
    const message = b.type === "payment"
      ? `${isPaid ? "Your subscription payment" : "A subscription payment"} ${isPaid ? "was successful" : "failed"}${planName ? ` for ${planName}` : ""}. Amount: ${amount} ${currency}.`
      : `${isPaid ? "Payment processed" : "Payment failed"}. Amount: ${amount} ${currency}.`;

    for (const uid of recipients) {
      await createNotificationOnce({
        userId: uid,
        type: "payment",
        title,
        message,
        dedupeKey: `billing:${String(b._id)}:${String(b.status)}:${String(uid)}`
      });
    }
  }

  const last = rows[rows.length - 1];
  await updateCursor("billingHistory", { createdAt: last.createdAt });
}

async function scanTitheAndOfferingPayments() {
  const scan = async ({ name, Model, titlePrefix, buildMessage }) => {
    const cursorDoc = await getOrCreateCursor(name);
    const cursor = cursorDoc?.cursor?.createdAt ? new Date(cursorDoc.cursor.createdAt) : null;

    const query = cursor ? { createdAt: { $gt: cursor } } : {};

    const rows = await Model.find(query)
      .sort({ createdAt: 1 })
      .limit(250)
      .lean();

    if (!rows.length) return;

    for (const row of rows) {
      if (!row?.church) continue;

      const recipients = await getChurchRecipients(row.church);
      if (!recipients.length) continue;

      const title = `${titlePrefix} recorded`;
      const message = buildMessage(row);

      for (const uid of recipients) {
        await createNotificationOnce({
          userId: uid,
          type: "payment",
          title,
          message,
          dedupeKey: `${name}:${String(row._id)}:${String(uid)}`
        });
      }
    }

    const last = rows[rows.length - 1];
    await updateCursor(name, { createdAt: last.createdAt });
  };

  await scan({
    name: "offering",
    Model: Offering,
    titlePrefix: "Offering",
    buildMessage: (o) => {
      const amount = typeof o.amount === "number" ? o.amount : 0;
      const serviceDate = o.serviceDate ? new Date(o.serviceDate).toLocaleDateString() : "";
      return `An offering was recorded${serviceDate ? ` for ${serviceDate}` : ""}. Amount: ${amount}.`;
    }
  });

  await scan({
    name: "titheIndividual",
    Model: TitheIndividual,
    titlePrefix: "Tithe",
    buildMessage: (t) => {
      const amount = typeof t.amount === "number" ? t.amount : 0;
      const date = t.date ? new Date(t.date).toLocaleDateString() : "";
      return `A tithe payment was recorded${date ? ` for ${date}` : ""}. Amount: ${amount}.`;
    }
  });

  await scan({
    name: "titheAggregate",
    Model: TitheAggregate,
    titlePrefix: "Tithe",
    buildMessage: (t) => {
      const amount = typeof t.amount === "number" ? t.amount : 0;
      const date = t.date ? new Date(t.date).toLocaleDateString() : "";
      return `A tithe payment was recorded${date ? ` for ${date}` : ""}. Amount: ${amount}.`;
    }
  });
}

async function scanChurchWelcome() {
  const cursorDoc = await getOrCreateCursor("church");
  const cursor = cursorDoc?.cursor?.createdAt ? new Date(cursorDoc.cursor.createdAt) : null;

  const query = cursor ? { createdAt: { $gt: cursor } } : {};

  const rows = await Church.find(query)
    .sort({ createdAt: 1 })
    .limit(200)
    .select("_id name createdAt createdBy")
    .lean();

  if (!rows.length) return;

  for (const c of rows) {
    if (!c?.createdBy) continue;

    await createNotificationOnce({
      userId: c.createdBy,
      type: "welcome",
      title: "Welcome to your new church workspace",
      message: `Your church ${c.name || ""} has been registered successfully.`,
      dedupeKey: `church:${String(c._id)}:${String(c.createdBy)}`
    });
  }

  const last = rows[rows.length - 1];
  await updateCursor("church", { createdAt: last.createdAt });
}

async function scanSubscriptionDueAndTrial() {
  // Run daily-style checks; dedupeKey ensures idempotency.
  const todayKey = dayKey();

  const subs = await Subscription.find({
    status: { $in: ["active", "free trial", "trialing", "past_due"] }
  })
    .select("_id church status nextBillingDate trialEnd plan pendingPlan billingInterval")
    .lean();

  for (const s of subs) {
    if (!s?.church) continue;
    const recipients = await getChurchRecipients(s.church);
    if (!recipients.length) continue;

    // Subscription due warnings
    if (s.nextBillingDate) {
      const diff = daysBetween(new Date(), new Date(s.nextBillingDate));

      if (diff === 3 || diff === 0) {
        const title = diff === 3 ? "Subscription due in 3 days" : "Subscription due today";
        const message = `Your subscription is due ${diff === 3 ? "in 3 days" : "today"}. Please ensure your payment method is ready.`;

        for (const uid of recipients) {
          await createNotificationOnce({
            userId: uid,
            type: "subscription",
            title,
            message,
            dedupeKey: `subdue:${String(s._id)}:${todayKey}:${diff}:${String(uid)}`
          });
        }
      }
    }

    // Trial expiry warnings
    const isTrial = s.status === "free trial" || s.status === "trialing";
    if (isTrial && s.trialEnd) {
      const diff = daysBetween(new Date(), new Date(s.trialEnd));
      if (diff === 3 || diff === 0) {
        const title = diff === 3 ? "Trial expires in 3 days" : "Trial expires today";
        const message = `Your free trial expires ${diff === 3 ? "in 3 days" : "today"}. Upgrade to continue uninterrupted access.`;

        for (const uid of recipients) {
          await createNotificationOnce({
            userId: uid,
            type: "trial",
            title,
            message,
            dedupeKey: `trial:${String(s._id)}:${todayKey}:${diff}:${String(uid)}`
          });
        }
      }
    }
  }
}

async function scanPlanChangesFromActivityLog() {
  const cursorDoc = await getOrCreateCursor("activityLogPlanChange");
  const cursor = cursorDoc?.cursor?.createdAt ? new Date(cursorDoc.cursor.createdAt) : null;

  const query = {
    ...(cursor ? { createdAt: { $gt: cursor } } : {}),
    $or: [
      { path: { $regex: "change-plan", $options: "i" } },
      { path: { $regex: "subscriptions/upgrade", $options: "i" } }
    ]
  };

  const rows = await ActivityLog.find(query)
    .sort({ createdAt: 1 })
    .limit(200)
    .select("_id church user createdAt path")
    .lean();

  if (!rows.length) return;

  for (const log of rows) {
    if (!log?.church) continue;

    const subscription = await Subscription.findOne({ church: log.church }).select("plan pendingPlan status").lean();
    if (!subscription) continue;

    const recipients = await getChurchRecipients(log.church);
    if (!recipients.length) continue;

    let title = "Subscription plan updated";
    let message = "Your subscription plan has been updated.";

    if (subscription.pendingPlan) {
      const p = await Plan.findById(subscription.pendingPlan).select("name").lean();
      title = "Plan downgrade scheduled";
      message = `Your plan downgrade to ${p?.name || "the selected plan"} has been scheduled for the next billing cycle.`;
    } else if (subscription.plan) {
      const p = await Plan.findById(subscription.plan).select("name").lean();
      title = "Plan upgraded";
      message = `Your plan has been updated to ${p?.name || "the selected plan"}.`;
    }

    for (const uid of recipients) {
      await createNotificationOnce({
        userId: uid,
        type: "subscription",
        title,
        message,
        dedupeKey: `planChange:${String(log._id)}:${String(uid)}`
      });
    }
  }

  const last = rows[rows.length - 1];
  await updateCursor("activityLogPlanChange", { createdAt: last.createdAt });
}

async function runSweepOnce() {
  if (mongoose.connection?.readyState !== 1) return;

  await scanBillingHistoryPayments();
  await scanTitheAndOfferingPayments();
  await scanChurchWelcome();
  await scanSubscriptionDueAndTrial();
  await scanPlanChangesFromActivityLog();
}

let workerInterval = null;

export function startNotificationWorker({ intervalMs = 60_000 } = {}) {
  if (workerInterval) return;

  const tick = async () => {
    try {
      await runSweepOnce();
    } catch {
      void 0;
    }
  };

  void tick();
  workerInterval = setInterval(tick, intervalMs);
}

export function stopNotificationWorker() {
  if (!workerInterval) return;
  clearInterval(workerInterval);
  workerInterval = null;
}
