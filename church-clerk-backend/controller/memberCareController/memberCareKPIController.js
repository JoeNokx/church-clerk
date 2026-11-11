import CareCase from "../../models/memberCareModel/careCaseModel.js";
import CareVisit from "../../models/memberCareModel/careVisitModel.js";
import PrayerRequest from "../../models/memberCareModel/prayerRequestModel.js";
import { canSeeConfidential, confidentialCaseIds } from "./memberCareAccess.js";

const ACTIVE_STATUSES = ["open", "in-progress"];

const pctChange = (current, previous) => {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  if (!p) return c ? 100 : 0;
  return ((c - p) / p) * 100;
};

export const getMemberCareKPI = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const caseScope = { church: churchId };
    const visitScope = { church: churchId };
    const prayerScope = { church: churchId };

    if (!canSeeConfidential(req)) {
      caseScope.confidential = { $ne: true };
      prayerScope.isPrivate = { $ne: true };
      const hidden = await confidentialCaseIds(churchId);
      if (hidden.length) visitScope.careCase = { $nin: hidden };
    }

    const [
      openCases,
      inProgress,
      overdueFollowUps,
      visitsThisMonth,
      visitsLastMonth,
      activePrayerRequests,
      answeredThisMonth,
      answeredLastMonth,
      casesOpenedThisMonth
    ] = await Promise.all([
      CareCase.countDocuments({ ...caseScope, status: "open" }),
      CareCase.countDocuments({ ...caseScope, status: "in-progress" }),
      CareCase.countDocuments({ ...caseScope, status: { $in: ACTIVE_STATUSES }, nextFollowUpDate: { $lt: todayStart } }),
      CareVisit.countDocuments({ ...visitScope, visitDate: { $gte: startOfMonth } }),
      CareVisit.countDocuments({ ...visitScope, visitDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      PrayerRequest.countDocuments({ ...prayerScope, status: "active" }),
      PrayerRequest.countDocuments({ ...prayerScope, answeredDate: { $gte: startOfMonth } }),
      PrayerRequest.countDocuments({ ...prayerScope, answeredDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      CareCase.countDocuments({ ...caseScope, dateOpened: { $gte: startOfMonth } })
    ]);

    return res.status(200).json({
      message: "Member care KPI fetched",
      data: {
        openCases,
        inProgress,
        overdueFollowUps,
        visitsThisMonth,
        activePrayerRequests,
        answeredThisMonth,
        casesOpenedThisMonth,
        change: {
          visitsThisMonth: pctChange(visitsThisMonth, visitsLastMonth),
          answeredThisMonth: pctChange(answeredThisMonth, answeredLastMonth)
        },
        diff: {
          visitsThisMonth: visitsThisMonth - visitsLastMonth,
          answeredThisMonth: answeredThisMonth - answeredLastMonth
        }
      }
    });
  } catch (error) {
    return res.status(400).json({ message: "Member care KPI could not be fetched", error: error.message });
  }
};

export default getMemberCareKPI;
