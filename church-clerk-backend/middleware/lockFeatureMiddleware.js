import Subscription from "../models/billingModel/subscriptionModel.js";

const WRITE_METHODS = new Set(["post", "put", "patch", "delete"]);

export const featureAccessGuard = async (req, res, next) => {
  if (!req.activeChurch) return next();

  // Only block write operations. Reads (GET) remain available so the
  // "read-only" promise shown in the UI banner stays truthful.
  const method = String(req.method || "").toLowerCase();
  if (!WRITE_METHODS.has(method)) return next();

  const subscription = await Subscription.findOne({
    church: req.activeChurch._id
  });

  if (!subscription) return next();

  if (
    subscription.status === "suspended" ||
    (subscription.status === "past_due" &&
      subscription.gracePeriodEnd &&
      new Date() > subscription.gracePeriodEnd)
  ) {
    return res.status(402).json({
      message: "Subscription expired. Please renew to continue using the system.",
      locked: true,
      readOnly: true
    });
  }

  next();
};
