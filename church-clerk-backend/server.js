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



import * as Routes from "./routes/index.js"; // imports the named exports from routes/index.js
import { activityLogMiddleware } from "./middleware/activityLogMiddleware.js";
import { impersonationNotificationMiddleware } from "./middleware/impersonationNotificationMiddleware.js";
import { startNotificationWorker } from "./services/notificationWorker.js";
import { startSystemInAppAnnouncementWorker } from "./services/systemInAppAnnouncementWorker.js";
import { startAnnouncementMessagingWorker } from "./services/announcementMessagingWorker.js";
import { seedDefaultRoles } from "./services/roleSeeder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();   

app.set("trust proxy", true);

// Logging middleware (logs every request)
app.use(morgan("dev"));

// Security headers
app.use(helmet());

// app.use(cors({
//   origin: ["http://localhost:5173", "http://localhost:5174"],  // frontend URLs
//   credentials: true                // allow cookies
// }));

app.use(cors({
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
}));

app.use(compression());

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);

app.use(cookieParser()); 

// Audit logging (records all write actions on protected routes)
app.use(activityLogMiddleware);
app.use(impersonationNotificationMiddleware);

// mount all routes
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



// 404
app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Route not found" });
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
};

startServer();
