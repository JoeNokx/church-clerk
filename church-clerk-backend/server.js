import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import cors from "cors";
import * as Routes from "./routes/index.js"; // imports the named exports from routes/index.js

dotenv.config();    // loads environment variables from .env file
connectDB();   // connects to the database

const app = express();   
app.use(cors());    // allows cross-origin requests
app.use(express.json());

// mount all routes
app.use("/api/dashboard", Routes.dashboardRoute);
app.use("/api/auth", Routes.authRoutes);
app.use("/api/user", Routes.userRoutes);
app.use("/api/system-admin", Routes.systemAdminRoute);
app.use("/api/church", Routes.churchRoute);
app.use("/api/subscription", Routes.subscriptionRoute);
app.use("/api/member", Routes.memberRoute);
app.use("/api/event", Routes.eventRoute);
app.use("/api/attendance", Routes.attendanceRoute);
app.use("/api/announcement", Routes.announcementRoute);
app.use("/api/activity-log", Routes.activityLogRoute);
app.use("/api/cell", Routes.cellRoute);
app.use("/api/group", Routes.groupRoute);
app.use("/api/department", Routes.departmentRoute);
app.use("/api/tithe", Routes.titheRoute);
app.use("/api/pledge", Routes.pledgeRoute);
app.use("/api/general-expenses", Routes.generalExpensesRoute);
app.use("/api/income", Routes.incomeRoute);
app.use("/api/expense", Routes.expenseRoute);
app.use("/api/special-fund", Routes.specialFundRoute);
app.use("/api/offering", Routes.offeringRoute);
app.use("/api/financial-statement", Routes.financialStatementRoute);
app.use("/api/church-project", Routes.churchProjectRoute);
app.use("/api/welfare", Routes.welfareRoute);
app.use("/api/business-ventures", Routes.businessVenturesRoute);
app.use("/api/referral", Routes.referralSystemRoute);


// start the server
const PORT = process.env.PORT || 5100;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
