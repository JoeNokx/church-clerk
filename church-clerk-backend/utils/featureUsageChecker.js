import Member from "../models/memberModel.js";
import Attendance from "../models/attendanceModel.js";
import Event from "../models/eventModel.js";
import GroupModel from "../models/ministryModel/groupModel.js";
import DepartmentModel from "../models/ministryModel/departmentModel.js";
import Announcement from "../models/announcementModel.js";
import TitheIndividual from "../models/financeModel/tithesModel/titheIndividualModel.js";
import Budget from "../models/financeModel/budgetingModel.js";
import ChurchProject from "../models/financeModel/projectModel/churchProjectModel.js";
import SpecialFund from "../models/financeModel/specialFundModel.js";
import Offering from "../models/financeModel/offeringModel.js";
import WelfareContribution from "../models/financeModel/welfareModel/welfareContributionModel.js";
import Pledge from "../models/financeModel/pledgeModel/pledgeModel.js";
import BusinessVenture from "../models/financeModel/businessModel/businessVenturesModel.js";
import Expense from "../models/financeModel/incomeExpenseModel/expenseModel.js";
import FinancialStatement from "../models/financeModel/financialStatementModel.js";

const hasData = async (Model, churchId) => {
  try {
    return (await Model.countDocuments({ church: churchId })) > 0;
  } catch {
    return false;
  }
};

export const detectTrialFeatureUsage = async (churchId) => {
  const [
    members, attendance, events,
    groups, departments,
    announcements, tithes, budgeting,
    projects, specialFunds, offerings,
    welfare, pledges, businessVentures,
    expenses, financialStatement
  ] = await Promise.all([
    hasData(Member, churchId),
    hasData(Attendance, churchId),
    hasData(Event, churchId),
    hasData(GroupModel, churchId),
    hasData(DepartmentModel, churchId),
    hasData(Announcement, churchId),
    hasData(TitheIndividual, churchId),
    hasData(Budget, churchId),
    hasData(ChurchProject, churchId),
    hasData(SpecialFund, churchId),
    hasData(Offering, churchId),
    hasData(WelfareContribution, churchId),
    hasData(Pledge, churchId),
    hasData(BusinessVenture, churchId),
    hasData(Expense, churchId),
    hasData(FinancialStatement, churchId)
  ]);

  const used = [];
  if (members) used.push("Members");
  if (attendance) used.push("Attendance");
  if (events) used.push("ProgramsEvents");
  if (groups || departments) used.push("Ministries");
  if (announcements) used.push("Announcements");
  if (tithes) used.push("Tithe");
  if (budgeting) used.push("Budgeting");
  if (projects) used.push("ChurchProjects");
  if (specialFunds) used.push("SpecialFunds");
  if (offerings) used.push("Offerings");
  if (welfare) used.push("Welfare");
  if (pledges) used.push("Pledges");
  if (businessVentures) used.push("BusinessVentures");
  if (expenses) used.push("Expenses");
  if (financialStatement) used.push("FinancialStatement");

  return used;
};

export const FEATURE_ROUTE_MAP = [
  { feature: "Members",          prefixes: ["/api/v1/member"] },
  { feature: "Attendance",       prefixes: ["/api/v1/attendance"] },
  { feature: "ProgramsEvents",   prefixes: ["/api/v1/event"] },
  { feature: "Ministries",       prefixes: ["/api/v1/cell", "/api/v1/group", "/api/v1/department"] },
  { feature: "Announcements",    prefixes: ["/api/v1/announcement"] },
  { feature: "Tithe",            prefixes: ["/api/v1/tithe"] },
  { feature: "Budgeting",        prefixes: ["/api/v1/budgeting"] },
  { feature: "ChurchProjects",   prefixes: ["/api/v1/church-project"] },
  { feature: "SpecialFunds",     prefixes: ["/api/v1/special-fund"] },
  { feature: "Offerings",        prefixes: ["/api/v1/offering"] },
  { feature: "Welfare",          prefixes: ["/api/v1/welfare"] },
  { feature: "Pledges",          prefixes: ["/api/v1/pledge"] },
  { feature: "BusinessVentures", prefixes: ["/api/v1/business-ventures"] },
  { feature: "Expenses",         prefixes: ["/api/v1/expense", "/api/v1/income", "/api/v1/general-expenses"] },
  { feature: "FinancialStatement", prefixes: ["/api/v1/financial-statement"] },
  { feature: "ReportsAnalytics", prefixes: ["/api/v1/reports-analytics"] }
];

export const isFeatureEnabledInPlan = (planFeatures, moduleKey) => {
  const f = planFeatures || {};
  switch (moduleKey) {
    case "Members":          return Boolean(f.members);
    case "Attendance":       return Boolean(f.attendance);
    case "ProgramsEvents":   return Boolean(f.programsEvents);
    case "Ministries":       return Boolean(f.ministries);
    case "Announcements":    return Boolean(f.announcements || f.announcement);
    case "Tithe":            return Boolean(f.tithes);
    case "Budgeting":        return Boolean(f.budgeting || f.financeModule);
    case "ChurchProjects":   return Boolean(f.churchProjects);
    case "SpecialFunds":     return Boolean(f.specialFunds || f.specialFund);
    case "Offerings":        return Boolean(f.offerings);
    case "Welfare":          return Boolean(f.welfare);
    case "Pledges":          return Boolean(f.pledges);
    case "BusinessVentures": return Boolean(f.businessVentures);
    case "Expenses":         return Boolean(f.expenses);
    case "FinancialStatement": return Boolean(f.financialStatement);
    case "ReportsAnalytics": return Boolean(f.reportsAnalytics);
    default:                 return true;
  }
};
