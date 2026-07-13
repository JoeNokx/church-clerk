import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import Subscription from "../models/billingModel/subscriptionModel.js";
import Plan from "../models/billingModel/planModel.js";
import Church from "../models/churchModel.js";
import { FEATURE_ROUTE_MAP, isFeatureEnabledInPlan } from "../utils/featureUsageChecker.js";
import { getSystemSettingsSnapshot } from "../controller/systemSettingsController.js";
import { releaseExpiredTrialForChurch } from "../controller/billingController/subscriptionService.js";



// --- In-process TTL cache: reduces per-request DB queries for stable auth data ---
const _ac = new Map();
const _AC_TTL = { c: 30_000, s: 30_000, p: 300_000 }; // church 30s, sub 30s, plan 5min

function _acGet(key) {
  const e = _ac.get(key);
  if (!e) return undefined;
  if (Date.now() > e.exp) { _ac.delete(key); return undefined; }
  return e.v;
}
function _acSet(key, val, ttl) { _ac.set(key, { v: val, exp: Date.now() + ttl }); }
export function bustAuthCacheForChurch(churchId) { _ac.delete(`s:${String(churchId)}`); }

const protectWithCookie = (cookieNames) => async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Service unavailable. Database connection is not ready." });
    }

    const cookies = req.cookies || {};
    const names = Array.isArray(cookieNames) ? cookieNames : [cookieNames];
    let token = names.map((n) => cookies?.[n]).find(Boolean);

    if (!token) {
      const authHeader = String(req.headers?.authorization || "");
      if (authHeader.toLowerCase().startsWith("bearer ")) {
        token = authHeader.slice(7).trim();
      }
    }

    // If request comes from the system admin app, prefer adminToken for auth.
    // This avoids accidentally authenticating as a regular church user when both cookies exist.
    const clientApp = String(req.headers?.["x-client-app"] || "").trim().toLowerCase();
    const hasAdminToken = Boolean(cookies?.adminToken);
    if (clientApp === "system-admin" && hasAdminToken && names.includes("token")) {
      token = cookies.adminToken;
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    if (req.user?.isActive === false && isWrite) {
      return res.status(403).json({
        message: "This account has been deactivated. You can only view data allowed by your role.",
        readOnly: true
      });
    }

    const headerChurchId = req.headers["x-active-church"];
    const userChurchId = req.user.church;

    const normalizedRole = String(req.user?.role || "").trim().toLowerCase();
    const effectiveRole = normalizedRole === "super_admin" ? "superadmin" : normalizedRole === "support_admin" ? "supportadmin" : normalizedRole;

    let activeChurchId = headerChurchId || userChurchId;

    // Branch/Independent users should never switch context via header.
    // If a stale/foreign x-active-church is present, force it back to their home church.
    const _getChurch = async (id) => {
      const k = `c:${String(id)}`;
      let doc = _acGet(k);
      if (!doc) { doc = await Church.findById(id).lean(); if (doc) _acSet(k, doc, _AC_TTL.c); }
      return doc;
    };

    let userChurch = null;
    if (
      effectiveRole !== "superadmin" &&
      effectiveRole !== "supportadmin" &&
      headerChurchId &&
      userChurchId &&
      headerChurchId.toString() !== userChurchId.toString()
    ) {
      userChurch = await _getChurch(userChurchId);

      if (!userChurch || userChurch.type !== "Headquarters") {
        activeChurchId = userChurchId;
      }
    }

    if (!activeChurchId) {
      req.activeChurch = null;
      req.subscription = null;
      return next();
    }

    const activeChurch = await _getChurch(activeChurchId);

    if (!activeChurch) {
      return res.status(404).json({ message: "Church context not found" });
    }

    if (
      effectiveRole !== "superadmin" &&
      effectiveRole !== "supportadmin" &&
      userChurchId &&
      activeChurchId.toString() !== userChurchId.toString()
    ) {
      if (!userChurch) {
        userChurch = await _getChurch(userChurchId);
      }

      if (
        !userChurch ||
        userChurch.type !== "Headquarters" ||
        activeChurch.parentChurch?.toString() !== userChurch._id.toString()
      ) {
        return res.status(403).json({ message: "Unauthorized branch access" });
      }
    }

    req.activeChurch = activeChurch;

    if (req.user?.church) {
      const _subKey = `s:${String(req.activeChurch._id)}`;
      let subscription = _acGet(_subKey);
      if (!subscription) {
        subscription = await Subscription.findOne({ church: req.activeChurch._id }).lean();
        if (subscription) _acSet(_subKey, subscription, _AC_TTL.s);
      }
      req.subscription = subscription || null;

      if (subscription) {
        if (effectiveRole === "superadmin" || effectiveRole === "supportadmin") {
          return next();
        }

        {
          const financePrefixes = [
            "/api/v1/tithe",
            "/api/v1/income",
            "/api/v1/expense",
            "/api/v1/special-fund",
            "/api/v1/offering",
            "/api/v1/financial-statement",
            "/api/v1/church-project",
            "/api/v1/welfare",
            "/api/v1/pledge",
            "/api/v1/business-ventures",
            "/api/v1/general-expenses"
          ];

          const path = req.originalUrl || "";
          const isFinanceRoute = financePrefixes.some((p) => path.startsWith(p));

          if (isFinanceRoute) {
            let planName = "basic";
            if (subscription.status === "free trial" || subscription.status === "trialing") {
              planName = "premium";
            } else if (subscription.plan) {
              const _pk = `p:${String(subscription.plan)}`;
              let plan = _acGet(_pk);
              if (!plan) { plan = await Plan.findById(subscription.plan).lean(); if (plan) _acSet(_pk, plan, _AC_TTL.p); }
              planName = plan?.name || "basic";
            }

            if (planName === "basic") {
              if (isWrite) {
                return res.status(403).json({
                  message:
                    "Your subscription plan does not include access to this module. Please upgrade to continue."
                });
              }
            }
          }
        }

        // --- Grace period handling: on-the-fly Free Lite assignment ---
        const now = new Date();
        let effectiveSub = subscription;
        let inTrialGracePeriod = false;

        if (
          (subscription.status === "free trial" || subscription.status === "trialing") &&
          subscription.trialEnd &&
          now > new Date(subscription.trialEnd)
        ) {
          try {
            const { gracePeriodDays } = await getSystemSettingsSnapshot();
            const graceMs = Number(gracePeriodDays ?? 0) * 24 * 60 * 60 * 1000;
            const gracePassed = now.getTime() > new Date(subscription.trialEnd).getTime() + graceMs;

            if (gracePassed) {
              const updated = await releaseExpiredTrialForChurch(req.activeChurch._id);
              if (updated) {
                effectiveSub = updated;
                req.subscription = updated;
                _ac.delete(`s:${String(req.activeChurch._id)}`);
              }
            } else {
              inTrialGracePeriod = true;
            }
          } catch {
            inTrialGracePeriod = true;
          }
        }

        // --- Free Lite plan: enforce feature-level access ---
        const isEffectiveTrial = effectiveSub.status === "free trial" || effectiveSub.status === "trialing";
        if (!isEffectiveTrial && effectiveSub.plan) {
          const _fpk = `p:${String(effectiveSub.plan)}`;
          let freeLitePlan = _acGet(_fpk);
          if (!freeLitePlan) { freeLitePlan = await Plan.findById(effectiveSub.plan).lean(); if (freeLitePlan) _acSet(_fpk, freeLitePlan, _AC_TTL.p); }
          const isFreeLite = String(freeLitePlan?.name || "").trim().toLowerCase() === "free lite";

          if (isFreeLite && freeLitePlan) {
            const trialUsedSet = new Set(
              Array.isArray(effectiveSub.trialFeaturesUsed) ? effectiveSub.trialFeaturesUsed : []
            );
            const path = req.originalUrl || "";

            const matchedFeature = FEATURE_ROUTE_MAP.find((m) =>
              m.prefixes.some((p) => path.startsWith(p))
            );

            if (matchedFeature) {
              const inPlan = isFeatureEnabledInPlan(freeLitePlan?.features, matchedFeature.feature);

              if (!inPlan) {
                if (trialUsedSet.has(matchedFeature.feature)) {
                  if (isWrite) {
                    return res.status(403).json({
                      message: "Upgrade your plan to make changes. This feature is read-only on your current plan.",
                      readOnly: true
                    });
                  }
                } else {
                  return res.status(403).json({
                    message: "This feature is not available on your current plan. Please upgrade.",
                    readOnly: false
                  });
                }
              }
            }
          }
        }

        // --- Block writes for fully expired/suspended subscriptions ---
        const isTrialExpired =
          !inTrialGracePeriod &&
          (effectiveSub.status === "free trial" || effectiveSub.status === "trialing") &&
          effectiveSub.trialEnd &&
          now > new Date(effectiveSub.trialEnd);

        const isGraceExpired =
          effectiveSub.status === "past_due" &&
          effectiveSub.gracePeriodEnd &&
          now > new Date(effectiveSub.gracePeriodEnd);

        const isSuspended = effectiveSub.status === "suspended";

        const path = req.originalUrl || "";
        const isSubscriptionPaymentRoute =
          path.startsWith("/api/v1/subscription/payments/") ||
          path.startsWith("/api/v1/subscription/payment-methods/");

        if ((isTrialExpired || isGraceExpired || isSuspended) && isWrite && !isSubscriptionPaymentRoute) {
          return res.status(402).json({
            message: isTrialExpired
              ? "Trial expired. Please upgrade to continue using the system."
              : "Subscription expired. Please renew to continue using the system.",
            locked: true,
            readOnly: true
          });
        }
      }
    }

    next();
  } catch (error) {
    const msg = String(error?.message || "");
    console.error("Auth middleware error:", msg);

    const jwtErrorNames = new Set(["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"]);
    if (jwtErrorNames.has(error?.name)) {
      return res.status(401).json({ message: "Not authorized, token invalid" });
    }

    const looksLikeDbOrTls =
      msg.toLowerCase().includes("ssl") ||
      msg.toLowerCase().includes("tls") ||
      msg.toLowerCase().includes("mongodb") ||
      msg.toLowerCase().includes("server selection") ||
      error?.name === "MongoServerSelectionError" ||
      error?.name === "MongoNetworkError";

    if (looksLikeDbOrTls) {
      return res.status(503).json({ message: "Service unavailable. Database connection error." });
    }

    return res.status(500).json({ message: "Server error" });
  }
};

const protect = protectWithCookie(["token", "userToken"]);
const protectAdmin = protectWithCookie(["adminToken"]);

export { protect, protectAdmin };
