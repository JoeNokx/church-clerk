// main routes file 


//system admin routes
import systemAdminRoute from "./systemAdminRoute.js";

//main dashboard
import dashboardRoute from "./dashboardRoute.js";

// referral system routes
import referralSystemRoute from "./referralSystemRoute.js";

// auth routes
import authRoutes from "./authRoute.js";

// user and church profile routes
import userRoutes from "./userRoute.js";
import churchRoute from "./churchRoute.js";

// main module routes
import subscriptionRoute from "./billingRoute/subscriptionRoute.js";
import memberRoute from "./memberRoute.js";
import eventRoute from "./eventRoute.js";
import attendanceRoute from "./attendanceRoute.js";
import announcementRoute from "./announcementRoute.js";
import activityLogRoute from "./activityLogRoute.js";

// ministry routes
import cellRoute from "./ministryRoute/cellRoute.js";
import groupRoute from "./ministryRoute/groupRoute.js";
import departmentRoute from "./ministryRoute/departmentRoute.js";

// finance routes
import titheRoute from "./financeRoute/titheRoute.js";
import incomeRoute from "./financeRoute/incomeExpenseRoute/incomeRoute.js";
import expenseRoute from "./financeRoute/incomeExpenseRoute/expenseRoute.js";
import specialFundRoute from "./financeRoute/specialFundRoute.js";
import offeringRoute from "./financeRoute/offeringRoute.js";
import financialStatementRoute from "./financeRoute/financialStatementRoute.js";
import pledgeRoute from "./financeRoute/pledgeRoute.js";
import welfareRoute from "./financeRoute/welfareRoute.js";
import generalExpensesRoute from "./financeRoute/generalExpensesRoute.js";
import businessVenturesRoute from "./financeRoute/businessVenturesRoute.js";
import churchProjectRoute from "./financeRoute/churchProjectRoute.js";


// export all routes
export {
  dashboardRoute,
  authRoutes,
  userRoutes,
  systemAdminRoute,
  churchRoute,
  subscriptionRoute,
  memberRoute,
  eventRoute,
  attendanceRoute,
  announcementRoute,
  activityLogRoute,
  cellRoute,
  groupRoute,
  departmentRoute,
  titheRoute,
  pledgeRoute,
  welfareRoute,
  generalExpensesRoute,
  incomeRoute,
  expenseRoute,
  specialFundRoute,
  offeringRoute,
  financialStatementRoute,
  churchProjectRoute,
  businessVenturesRoute,
  referralSystemRoute
};
