import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Subscription from "../models/billingModel/subscriptionModel.js";
import Plan from "../models/billingModel/planModel.js";
import Church from "../models/churchModel.js";



const protectWithCookie = (cookieNames) => async (req, res, next) => {
  try {
    const cookies = req.cookies || {};
    const names = Array.isArray(cookieNames) ? cookieNames : [cookieNames];
    let token = names.map((n) => cookies?.[n]).find(Boolean);

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
    let userChurch = null;
    if (
      effectiveRole !== "superadmin" &&
      effectiveRole !== "supportadmin" &&
      headerChurchId &&
      userChurchId &&
      headerChurchId.toString() !== userChurchId.toString()
    ) {
      userChurch = await Church.findById(userChurchId).lean();

      if (!userChurch || userChurch.type !== "Headquarters") {
        activeChurchId = userChurchId;
      }
    }

    if (!activeChurchId) {
      req.activeChurch = null;
      req.subscription = null;
      return next();
    }

    const activeChurch = await Church.findById(activeChurchId).lean();

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
        userChurch = await Church.findById(userChurchId).lean();
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
      const subscription = await Subscription.findOne({ church: req.activeChurch._id }).lean();
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
              const plan = await Plan.findById(subscription.plan).lean();
              planName = plan?.name || "basic";
            }

            if (planName === "basic") {
              return res.status(403).json({
                message:
                  "Your subscription plan does not include access to this module. Please upgrade to continue."
              });
            }
          }
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

        const isSuspended = subscription.status === "suspended";

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
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

const protect = protectWithCookie(["token", "userToken"]);
const protectAdmin = protectWithCookie(["adminToken"]);

export { protect, protectAdmin };
