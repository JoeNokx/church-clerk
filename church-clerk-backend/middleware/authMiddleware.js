import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import Subscription from "../models/billingModel/subscriptionModel.js";
import Plan from "../models/billingModel/planModel.js";
import Church from "../models/churchModel.js";
import { FEATURE_ROUTE_MAP, isFeatureEnabledInPlan } from "../utils/featureUsageChecker.js";
import { isSystemRole } from "../utils/resolvePermissions.js";
import { releaseExpiredTrialForChurch, applyPendingPlanChange } from "../controller/billingController/subscriptionService.js";



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

const protectWithCookie = (cookieNames, options = {}) => async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Service unavailable. Database connection is not ready." });
    }

    const cookies = req.cookies || {};
    const names = Array.isArray(cookieNames) ? cookieNames : [cookieNames];
    const allowBearer = options.allowBearer !== false; // default true

    // Check the Bearer header FIRST (for church-facing routes only), then
    // fall back to cookies.
    // This matters for delegated sessions: the delegate token is sent as a
    // Bearer token, but the browser may also send a stale `token` cookie
    // from a previous church login on the same domain. If the cookie is
    // checked first, the stale token authenticates the wrong user and the
    // request fails with "Unauthorized branch access".
    //
    // Admin routes (protectAdmin) set allowBearer=false so a church user's
    // Bearer token can NEVER authenticate against an admin endpoint —
    // admin auth is strictly via the adminToken cookie.
    let token = "";
    if (allowBearer) {
      const authHeader = String(req.headers?.authorization || "");
      if (authHeader.toLowerCase().startsWith("bearer ")) {
        token = authHeader.slice(7).trim();
      }
    }

    if (!token) {
      token = names.map((n) => cookies?.[n]).find(Boolean);
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

    // Flag delegated sessions issued by the system admin "View as Church" flow.
    // The token payload contains { delegate: true, delegateChurch: churchId }.
    req.isDelegate = Boolean(decoded?.delegate);
    req.delegateChurch = decoded?.delegateChurch || null;

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

    // System accounts have no home church — skip the DB lookup for the
    // common church-user path.
    const roleIsSystem = req.user?.church ? false : await isSystemRole(effectiveRole);

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
      !roleIsSystem &&
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
      !roleIsSystem &&
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
        const now = new Date();
        const isTrialStatus =
          subscription.status === "free trial" || subscription.status === "trialing";
        if (roleIsSystem) {
          return next();
        }

        // --- Trial expiry: trials end at trialEnd — no grace period.
        // Grace applies to paid (past_due) subscriptions only. An expired
        // trial is released to Free Lite immediately on the first request
        // past trialEnd (the daily cron also does this for inactive churches).
        let effectiveSub = subscription;

        if (isTrialStatus && subscription.trialEnd && now > new Date(subscription.trialEnd)) {
          try {
            const updated = await releaseExpiredTrialForChurch(req.activeChurch._id);
            if (updated) {
              effectiveSub = updated;
              req.subscription = updated;
              _ac.delete(`s:${String(req.activeChurch._id)}`);
            }
          } catch {
            // Release failed — isTrialExpired below still blocks writes.
          }
        }

        // --- Scheduled plan changes: a pending cancel/downgrade takes effect
        // on the first request past its effective date (the billing crons
        // remain the backstop for inactive churches). Applying re-scans the
        // feature-usage ledger via the model's pre-save hook, so modules
        // first used on a paid plan become read-only — not blocked — on the
        // new lower plan.
        if (effectiveSub.pendingPlan) {
          const effectiveAt =
            effectiveSub.pendingPlanEffectiveDate || effectiveSub.nextBillingDate;
          if (effectiveAt && now >= new Date(effectiveAt)) {
            try {
              const subDoc = await Subscription.findById(effectiveSub._id);
              const applied = subDoc ? await applyPendingPlanChange(subDoc) : null;
              if (applied?.applied) {
                effectiveSub = subDoc.toObject();
                req.subscription = effectiveSub;
                _ac.delete(`s:${String(req.activeChurch._id)}`);
              }
            } catch {
              // Apply failed — enforcement below still uses the current plan.
            }
          }
        }

        // --- Feature-level access: enforced on every plan, not only Free
        // Lite. A module the plan doesn't include is read-only when the
        // church has data in it (usage ledger), and fully blocked when it
        // was never used. Downgrades therefore gate modules the same way a
        // Free Lite release does.
        const isEffectiveTrial = effectiveSub.status === "free trial" || effectiveSub.status === "trialing";
        if (!isEffectiveTrial && effectiveSub.plan) {
          const _fpk = `p:${String(effectiveSub.plan)}`;
          let currentPlan = _acGet(_fpk);
          if (!currentPlan) { currentPlan = await Plan.findById(effectiveSub.plan).lean(); if (currentPlan) _acSet(_fpk, currentPlan, _AC_TTL.p); }

          if (currentPlan) {
            const usedSet = new Set(
              Array.isArray(effectiveSub.trialFeaturesUsed) ? effectiveSub.trialFeaturesUsed : []
            );
            const path = req.originalUrl || "";

            const matchedFeature = FEATURE_ROUTE_MAP.find((m) =>
              m.prefixes.some((p) => path.startsWith(p))
            );

            if (matchedFeature) {
              const inPlan = isFeatureEnabledInPlan(currentPlan?.features, matchedFeature.feature);

              if (!inPlan) {
                if (usedSet.has(matchedFeature.feature)) {
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
// Admin routes are strictly cookie-authenticated. A church user's Bearer
// token must NEVER authenticate against an admin endpoint.
const protectAdmin = protectWithCookie(["adminToken"], { allowBearer: false });

export { protect, protectAdmin };
