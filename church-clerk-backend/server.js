import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";



import * as Routes from "./routes/index.js"; // imports the named exports from routes/index.js

dotenv.config();    // loads environment variables from .env file
connectDB();   // connects to the database

const app = express();   

// Logging middleware (logs every request)
app.use(morgan("dev"));

// Security headers
app.use(helmet());

app.use(cors({
  origin: "http://localhost:5173",  // frontend URL
  credentials: true                // allow cookies
}));

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);

app.use(cookieParser()); 

// mount all routes
app.use("/api/v1/dashboard", Routes.dashboardRoute);
app.use("/api/v1/auth", Routes.authRoutes);
app.use("/api/v1/user", Routes.userRoutes);
app.use("/api/v1/system-admin", Routes.systemAdminRoute);
app.use("/api/v1/church", Routes.churchRoute);

app.use("/api/admin/billing", Routes.adminBillingRoute);

app.use("/api/v1/subscription", Routes.subscriptionRoute);
app.use("/api/v1/member", Routes.memberRoute);
app.use("/api/v1/event", Routes.eventRoute);
app.use("/api/v1/attendance", Routes.attendanceRoute);
app.use("/api/v1/announcement", Routes.announcementRoute);
app.use("/api/v1/activity-log", Routes.activityLogRoute);
app.use("/api/v1/cell", Routes.cellRoute);
app.use("/api/v1/group", Routes.groupRoute);
app.use("/api/v1/department", Routes.departmentRoute);
app.use("/api/v1/tithe", Routes.titheRoute);
app.use("/api/v1/pledge", Routes.pledgeRoute);
app.use("/api/v1/general-expenses", Routes.generalExpensesRoute);
app.use("/api/v1/income", Routes.incomeRoute);
app.use("/api/v1/expense", Routes.expenseRoute);
app.use("/api/v1/special-fund", Routes.specialFundRoute);
app.use("/api/v1/offering", Routes.offeringRoute);
app.use("/api/v1/financial-statement", Routes.financialStatementRoute);
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
  console.error(err.stack);
  res.status(err.status || 500).json({ status: "error", message: err.message || "Server error" });
});


// start the server
const PORT = process.env.PORT || 5100;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
