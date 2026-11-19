import CareCase from "../../models/memberCareModel/careCaseModel.js";
import CareVisit from "../../models/memberCareModel/careVisitModel.js";
import PastoralAppointment from "../../models/memberCareModel/pastoralAppointmentModel.js";
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
    const apptScope = { church: churchId };

    if (!canSeeConfidential(req)) {
      caseScope.confidential = { $ne: true };
      apptScope.confidential = { $ne: true };
      const hidden = await confidentialCaseIds(churchId);
      if (hidden.length) visitScope.careCase = { $nin: hidden };
    }

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const [
      openCases,
      inProgress,
      overdueFollowUps,
      visitsThisMonth,
      visitsLastMonth,
      casesOpenedThisMonth,
      upcomingAppointments,
      appointmentsToday,
      closedCases
    ] = await Promise.all([
      CareCase.countDocuments({ ...caseScope, status: "open" }),
      CareCase.countDocuments({ ...caseScope, status: "in-progress" }),
      CareCase.countDocuments({ ...caseScope, status: { $in: ACTIVE_STATUSES }, nextFollowUpDate: { $lt: todayStart } }),
      CareVisit.countDocuments({ ...visitScope, visitDate: { $gte: startOfMonth } }),
      CareVisit.countDocuments({ ...visitScope, visitDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      CareCase.countDocuments({ ...caseScope, dateOpened: { $gte: startOfMonth } }),
      PastoralAppointment.countDocuments({ ...apptScope, status: { $in: ["scheduled", "confirmed", "rescheduled"] }, appointmentDate: { $gte: todayStart } }),
      PastoralAppointment.countDocuments({ ...apptScope, status: { $in: ["scheduled", "confirmed", "rescheduled"] }, appointmentDate: { $gte: todayStart, $lt: tomorrowStart } }),
      CareCase.countDocuments({ ...caseScope, status: { $in: ["resolved", "closed"] } })
    ]);

    return res.status(200).json({
      message: "Member care KPI fetched",
      data: {
        openCases,
        inProgress,
        overdueFollowUps,
        visitsThisMonth,
        casesOpenedThisMonth,
        upcomingAppointments,
        appointmentsToday,
        closedCases,
        change: {
          visitsThisMonth: pctChange(visitsThisMonth, visitsLastMonth)
        },
        diff: {
          visitsThisMonth: visitsThisMonth - visitsLastMonth
        }
      }
    });
  } catch (error) {
    return res.status(400).json({ message: "Member care KPI could not be fetched", error: error.message });
  }
};

export default getMemberCareKPI;
