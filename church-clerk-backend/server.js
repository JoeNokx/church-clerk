import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import compression from "compression";
import mongoSanitize from "mongo-sanitize";
import rateLimit from "express-rate-limit";
import Tokens from "csrf";

import * as Routes from "./routes/index.js"; // imports the named exports from routes/index.js
import { activityLogMiddleware } from "./middleware/activityLogMiddleware.js";
import { impersonationNotificationMiddleware } from "./middleware/impersonationNotificationMiddleware.js";
import { startNotificationWorker } from "./services/notificationWorker.js";
import { startSystemInAppAnnouncementWorker } from "./services/systemInAppAnnouncementWorker.js";
import { startAnnouncementMessagingWorker } from "./services/announcementMessagingWorker.js";
import { startBillingCronWorker } from "./cron/billingCronController.js";
import { seedDefaultRoles } from "./services/roleSeeder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();   

app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);

// Logging middleware (logs every request)
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// CORS
app.use(
  cors({
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);

      const isLocal = origin.includes("localhost");
      const isMainApp = origin === "https://app.churchclerkapp.com";
      const isAdmin = origin === "https://admin.churchclerkapp.com";
      const isSubdomain = /^https:\/\/.*\.churchclerkapp\.com$/.test(origin);

      if (isLocal || isMainApp || isAdmin || isSubdomain) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(compression());

// ------------------------------
// GLOBAL SECURITY MIDDLEWARE (REQUIRED ORDER)
// 1. express.json()
// 2. mongo-sanitize
// 3. xss-clean
// 4. helmet
// 5. rate-limit (general)
// 6. cookie-parser
// 7. csrf (custom middleware)
// ------------------------------

const isPaystackWebhookRoute = (req) => {
  const url = String(req.originalUrl || "");
  return url.startsWith("/api/v1/subscription/webhooks/paystack");
};

const sanitizeXssString = (value) => {
  if (typeof value !== "string") return value;
  return value.replace(/<[^>]*>/g, "");
};

const sanitizeXssInPlace = (obj) => {
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i += 1) {
      const v = obj[i];
      if (typeof v === "string") {
        obj[i] = sanitizeXssString(v);
      } else if (v && typeof v === "object") {
        sanitizeXssInPlace(v);
      }
    }
    return;
  }

  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (typeof v === "string") {
      obj[key] = sanitizeXssString(v);
    } else if (v && typeof v === "object") {
      sanitizeXssInPlace(v);
    }
  }
};

const sanitizeRouteParam = (value, paramName) => {
  if (value === undefined || value === null) return value;

  if (typeof value === "string") {
    const nosql = mongoSanitize({ [paramName]: value });
    const next = nosql?.[paramName];
    return sanitizeXssString(next);
  }

  const nosql = mongoSanitize({ [paramName]: value });
  return nosql?.[paramName];
};

app.param(
  [
    "id",
    "memberId",
    "meetingId",
    "groupId",
    "attendanceId",
    "offeringId",
    "departmentId",
    "cellId"
  ],
  (req, res, next, value, name) => {
    if (isPaystackWebhookRoute(req)) return next();

    const sanitized = sanitizeRouteParam(value, name);
    if (req.params && typeof req.params === "object") {
      try {
        req.params[name] = sanitized;
      } catch {
        // ignore
      }
    }
    return next();
  }
);

// 1) JSON body parser
const jsonParser = express.json({
  limit: "50kb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
});

app.use((req, res, next) => {
  if (isPaystackWebhookRoute(req)) return next();
  return jsonParser(req, res, next);
});

// 2) NoSQL injection protection (sanitize req.body + req.query)
app.use((req, res, next) => {
  if (isPaystackWebhookRoute(req)) return next();
  if (req.body) {
    req.body = mongoSanitize(req.body);
  }
  if (req.query) {
    const sanitizedQuery = mongoSanitize({ ...req.query });
    for (const key of Object.keys(req.query)) {
      delete req.query[key];
    }
    Object.assign(req.query, sanitizedQuery);
  }
  if (req.params && typeof req.params === "object") {
    const sanitizedParams = mongoSanitize({ ...req.params });
    for (const key of Object.keys(req.params)) {
      delete req.params[key];
    }
    Object.assign(req.params, sanitizedParams);
  }
  next();
});

// 3) XSS protection
app.use((req, res, next) => {
  if (isPaystackWebhookRoute(req)) return next();

  sanitizeXssInPlace(req.body);
  sanitizeXssInPlace(req.query);
  sanitizeXssInPlace(req.params);

  return next();
});

// 4) Secure headers
app.use(
  helmet({
    frameguard: { action: "deny" },
    noSniff: true,
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: []
      }
    }
  })
);

// 5) Rate limiting (separated by endpoint type)
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." }
});

const getLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." }
});

// Apply loose limits for normal data fetching, medium limits for writes
app.use((req, res, next) => {
  if (isPaystackWebhookRoute(req)) return next();

  if (req.method === "GET") {
    return getLimiter(req, res, next);
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  return next();
});

// 6) Cookies
app.use(cookieParser());

// 7) CSRF (cookie-based) — uses csrf package with custom middleware
const _csrfTokens = new Tokens();
const _CSRF_COOKIE = "_csrf";

function csrfProtection(req, res, next) {
  let secret = req.cookies?.[_CSRF_COOKIE];
  if (!secret) {
    secret = _csrfTokens.secretSync();
    res.cookie(_CSRF_COOKIE, secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });
  }

  req.csrfToken = () => _csrfTokens.create(secret);

  const method = String(req.method || "").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return next();
  }

  const token =
    req.headers["csrf-token"] ||
    req.headers["x-csrf-token"] ||
    req.headers["x-xsrf-token"] ||
    req.body?._csrf ||
    req.query?._csrf ||
    "";

  if (!_csrfTokens.verify(secret, String(token))) {
    const err = new Error("invalid csrf token");
    err.code = "EBADCSRFTOKEN";
    err.status = 403;
    return next(err);
  }

  return next();
}

app.use((req, res, next) => {
  if (isPaystackWebhookRoute(req)) return next();
  return csrfProtection(req, res, next);
});

// Provide CSRF token for frontends
app.get(["/api/csrf-token", "/api/v1/csrf-token"], (req, res) => {
  return res.status(200).json({ csrfToken: req.csrfToken() });
});

// Audit logging (records all write actions on protected routes)
app.use(activityLogMiddleware);
app.use(impersonationNotificationMiddleware);

// mount all routes

// health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "ChurchClerk API is running"})
})

//Root redirect to frontend
app.get("/", (req, res) => {
  res.redirect("https://app.churchclerkapp.com")
})

app.use(
  "/api/v1/dashboard",
  (req, res, next) => {
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "private, max-age=60");
    }
    next();
  },
  Routes.dashboardRoute
);
app.use("/api/v1/auth", Routes.authRoutes);
app.use("/api/v1/admin", Routes.adminAuthRoute);
app.use("/api/v1/user", Routes.userRoutes);
app.use("/api/v1/system-admin", Routes.systemAdminRoute);
app.use("/api/v1/church", Routes.churchRoute);

app.use("/api/admin/billing", Routes.adminBillingRoute);

app.use("/api/v1/admin/billing", Routes.adminBillingRoute);

app.use("/api/v1/subscription", Routes.subscriptionRoute);
app.use("/api/v1/notifications", Routes.notificationRoute);
app.use("/api/v1/in-app-announcements", Routes.inAppAnnouncementRoute);
app.use("/api/v1/lookups", Routes.lookupRoute);
app.use("/api/v1/member", Routes.memberRoute);
app.use("/api/v1/event", Routes.eventRoute);
app.use("/api/v1/attendance", Routes.attendanceRoute);
app.use("/api/v1/announcement", Routes.announcementRoute);
app.use("/api/v1/activity-log", Routes.activityLogRoute);
app.use("/api/v1/cell", Routes.cellRoute);
app.use("/api/v1/group", Routes.groupRoute);
app.use("/api/v1/department", Routes.departmentRoute);
app.use("/api/v1/tithe", Routes.titheRoute);
app.use("/api/v1/budgeting", Routes.budgetingRoute);
app.use("/api/v1/pledge", Routes.pledgeRoute);
app.use("/api/v1/general-expenses", Routes.generalExpensesRoute);
app.use("/api/v1/income", Routes.incomeRoute);
app.use("/api/v1/expense", Routes.expenseRoute);
app.use("/api/v1/special-fund", Routes.specialFundRoute);
app.use("/api/v1/offering", Routes.offeringRoute);
app.use("/api/v1/financial-statement", Routes.financialStatementRoute);
app.use("/api/v1/reports-analytics", Routes.reportsAnalyticsRoute);
app.use("/api/v1/church-project", Routes.churchProjectRoute);
app.use("/api/v1/welfare", Routes.welfareRoute);
app.use("/api/v1/business-ventures", Routes.businessVenturesRoute);
app.use("/api/v1/referral", Routes.referralSystemRoute);
app.use("/api/v1/church-governance", Routes.churchGovernanceRoute);

// 404
app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});

// CSRF error handler
app.use((err, req, res, next) => {
  if (err && err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({ status: "error", message: "Invalid CSRF token" });
  }
  return next(err);
});

// Global error handler
app.use((err, req, res, next) => {
  const status = Number(err?.status) || 500;
  const msg = String(err?.message || "");

  const lower = msg.toLowerCase();
  const looksLikeDbOrTls =
    lower.includes("ssl") ||
    lower.includes("tls") ||
    lower.includes("mongodb") ||
    lower.includes("mongo") ||
    lower.includes("server selection") ||
    err?.name === "MongoServerSelectionError" ||
    err?.name === "MongoNetworkError";

  if (looksLikeDbOrTls) {
    console.error("DB/TLS error:", msg);
    return res.status(503).json({ status: "error", message: "Service unavailable. Database connection error." });
  }

  console.error(err?.stack || err);
  if (status >= 500) {
    return res.status(status).json({ status: "error", message: "Server error" });
  }
  return res.status(status).json({ status: "error", message: msg || "Request failed" });
});
 

// start the server
const startServer = async () => {
  await connectDB();
  try {
    await seedDefaultRoles();
  } catch (e) {
    console.error(e);
  }

  const PORT = process.env.PORT || 5100;
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  server.setTimeout(5 * 60 * 1000);

  startNotificationWorker({ intervalMs: 60_000 });
  startSystemInAppAnnouncementWorker({ intervalMs: 60_000 });
  startAnnouncementMessagingWorker({ intervalMs: 60_000 });
  startBillingCronWorker();
};

startServer();
