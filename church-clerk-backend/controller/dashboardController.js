import Member from "../models/memberModel.js"
import Attendance from "../models/attendanceModel.js"
import Event from "../models/eventModel.js"; 
import Offering from "../models/financeModel/offeringModel.js";
import Visitor from "../models/visitorsModel.js";
import { withCacheJson } from "../utils/cache.js";



const getDashboardKPI = async (req, res) => {
 try {
    // --- MAIN QUERY (church scoped) ---
    const query = {};
    const churchId = req.activeChurch?._id || req.user?.church;
    if (churchId) {
      query.church = churchId;
    }

    const cacheKey = `dashboard:kpi:${String(query.church || "global")}`;
    const payload = await withCacheJson({
      key: cacheKey,
      ttlSeconds: 60,
      getValue: async () => {
        const now = new Date();

        // --- Start of current month for new members ---
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // --- Previous month range ---
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const pctChange = (current, previous) => {
          const c = Number(current || 0);
          const p = Number(previous || 0);
          if (!p) return c ? 100 : 0;
          return ((c - p) / p) * 100;
        };

        // --- MEMBER KPIs (parallel) ---
        const [
          totalMembers,
          currentMembers,
          newMembersThisMonth,
          totalMembersPrev,
          currentMembersPrev,
          newMembersPrevMonth
        ] = await Promise.all([
          Member.countDocuments(query),
          Member.countDocuments({ ...query, status: "active" }),
          Member.countDocuments({ ...query, dateJoined: { $gte: startOfMonth, $lt: startOfNextMonth } }),

          // Previous month comparators
          Member.countDocuments({ ...query, dateJoined: { $lt: startOfMonth } }),
          Member.countDocuments({ ...query, status: "active", dateJoined: { $lt: startOfMonth } }),
          Member.countDocuments({ ...query, dateJoined: { $gte: startOfPrevMonth, $lt: startOfMonth } })
        ]);

        // --- THIS SUNDAY ATTENDANCE (vs last Sunday) ---
        const today = new Date();
        const dayOfWeek = today.getDay(); // Sunday = 0

        // Most recent Sunday (today if Sunday, else previous Sunday)
        const thisSunday = new Date(today);
        thisSunday.setDate(today.getDate() - dayOfWeek);
        thisSunday.setHours(0, 0, 0, 0);

        const thisSundayNextDay = new Date(thisSunday);
        thisSundayNextDay.setDate(thisSunday.getDate() + 1);

        const lastSunday = new Date(thisSunday);
        lastSunday.setDate(thisSunday.getDate() - 7);
        lastSunday.setHours(0, 0, 0, 0);

        const lastSundayNextDay = new Date(lastSunday);
        lastSundayNextDay.setDate(lastSunday.getDate() + 1);

        const [thisSundayServices, lastSundayServices] = await Promise.all([
          Attendance.find({
            church: query.church,
            serviceDate: { $gte: thisSunday, $lt: thisSundayNextDay }
          })
            .select("totalNumber")
            .lean(),
          Attendance.find({
            church: query.church,
            serviceDate: { $gte: lastSunday, $lt: lastSundayNextDay }
          })
            .select("totalNumber")
            .lean()
        ]);

        const thisSundayAttendance = thisSundayServices.reduce((total, service) => total + (service.totalNumber || 0), 0);
        const lastSundayAttendancePrevWeek = lastSundayServices.reduce((total, service) => total + (service.totalNumber || 0), 0);

        const serviceCount = thisSundayServices.length;
        const thisSundayDate = thisSunday.toISOString().split("T")[0]; // YYYY-MM-DD

        const change = {
          totalMembers: pctChange(totalMembers, totalMembersPrev),
          currentMembers: pctChange(currentMembers, currentMembersPrev),
          newMembersThisMonth: pctChange(newMembersThisMonth, newMembersPrevMonth),
          lastSundayAttendance: pctChange(thisSundayAttendance, lastSundayAttendancePrevWeek)
        };

        const diff = {
          totalMembers: totalMembers - totalMembersPrev,
          currentMembers: currentMembers - currentMembersPrev,
          newMembersThisMonth: newMembersThisMonth - newMembersPrevMonth,
          lastSundayAttendance: thisSundayAttendance - lastSundayAttendancePrevWeek
        };

        return {
          message: "Dashboard KPI fetched successfully",
          kpis: {
            totalMembers,
            currentMembers,
            newMembersThisMonth,
            lastSundayAttendance: thisSundayAttendance,
            change,
            diff,
            lastSundayInfo: `${serviceCount} service${serviceCount !== 1 ? 's' : ''} · ${thisSundayDate}`
          }
        };
      }
    });

    return res.status(200).json(payload);

  } catch (error) {
    return res.status(400).json({
      message: "Dashboard KPI could not be fetched",
      error: error.message
    });
  }
};


// get dashboard analytics

const getDashboardAnalytics = async (req, res) => {
  try {
    const query = {};
    const churchId = req.activeChurch?._id || req.user?.church;
    if (churchId) {
      query.church = churchId;
    }

    // --- Year parameter (default: current year) ---
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const cacheKey = `dashboard:analytics:${String(query.church || "global")}:${String(year)}`;
    const payload = await withCacheJson({
      key: cacheKey,
      ttlSeconds: 60,
      getValue: async () => {

        // --- Gender Distribution (all members) ---
        const genderAgg = await Member.aggregate([
          { $match: { ...query } },
          { $group: { _id: "$gender", count: { $sum: 1 } } }
        ]);

        let maleCount = 0;
        let femaleCount = 0;
        genderAgg.forEach(g => {
          if (g._id === "male") maleCount = g.count;
          if (g._id === "female") femaleCount = g.count;
        });

        const totalMembers = maleCount + femaleCount;
        const genderData = {
          male: maleCount,
          female: femaleCount,
          malePercentage: totalMembers ? ((maleCount / totalMembers) * 100).toFixed(1) : 0,
          femalePercentage: totalMembers ? ((femaleCount / totalMembers) * 100).toFixed(1) : 0
        };

        // --- Last 10 Sundays Attendance (across all time) ---
        const last10SundaysAgg = await Attendance.aggregate([
          { $match: { church: query.church, $or: [{ serviceType: { $regex: /^Sunday/i } }, { $expr: { $eq: [{ $dayOfWeek: "$serviceDate" }, 1] } }] } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$serviceDate" } }, totalAttendance: { $sum: "$totalNumber" }, records: { $push: { serviceType: "$serviceType", totalNumber: "$totalNumber" } } } },
          { $sort: { "_id": -1 } },
          { $limit: 10 },
          { $sort: { "_id": 1 } }
        ]);
        const last10SundaysGraph = last10SundaysAgg.map(s => {
          const d = new Date(s._id + "T00:00:00");
          return { date: s._id, label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), totalAttendance: s.totalAttendance, records: s.records };
        });

        // --- Monthly Attendance Graph (Sundays, for selected year) ---
        const monthlyAttAgg = await Attendance.aggregate([
          { $match: { church: query.church, serviceDate: { $gte: startOfYear, $lte: endOfYear }, $or: [{ serviceType: { $regex: /^Sunday/i } }, { $expr: { $eq: [{ $dayOfWeek: "$serviceDate" }, 1] } }] } },
          { $addFields: { month: { $month: "$serviceDate" } } },
          { $group: { _id: "$month", totalAttendance: { $sum: "$totalNumber" } } },
          { $sort: { "_id": 1 } }
        ]);
        const attendanceGraph = [];
        for (let m = 1; m <= 12; m++) {
          const rec = monthlyAttAgg.find(a => a._id === m);
          attendanceGraph.push({ month: new Date(year, m - 1).toLocaleString("default", { month: "long" }), totalAttendance: rec ? rec.totalAttendance : 0 });
        }

        // --- Age Group Distribution (all members) ---
        const ageGroupAgg = await Member.aggregate([
          { $match: { ...query, ageGroup: { $exists: true, $ne: null } } },
          { $group: { _id: "$ageGroup", count: { $sum: 1 } } }
        ]);
        const totalWithAgeGroup = ageGroupAgg.reduce((s, g) => s + g.count, 0);
        const AGE_GROUP_COLORS = { children: "#8b5cf6", teenagers: "#ec4899", youth: "#3b82f6", adult: "#10b981", elderly: "#f59e0b" };
        const ageGroupDistribution = ["children", "teenagers", "youth", "adult", "elderly"].map(ag => {
          const found = ageGroupAgg.find(g => g._id === ag);
          const count = found ? found.count : 0;
          return {
            name: ag.charAt(0).toUpperCase() + ag.slice(1),
            value: count,
            percentage: totalWithAgeGroup ? parseFloat(((count / totalWithAgeGroup) * 100).toFixed(1)) : 0,
            color: AGE_GROUP_COLORS[ag]
          };
        });

        // --- Monthly New Members vs Visitors ---
        const [membersPerMonth, visitorsPerMonth] = await Promise.all([
          Member.aggregate([
            { $match: { ...query, dateJoined: { $gte: startOfYear, $lte: endOfYear } } },
            { $addFields: { month: { $month: "$dateJoined" } } },
            { $group: { _id: "$month", count: { $sum: 1 } } },
            { $sort: { "_id": 1 } }
          ]),
          Visitor.aggregate([
            { $match: { church: query.church, createdAt: { $gte: startOfYear, $lte: endOfYear } } },
            { $addFields: { month: { $month: "$createdAt" } } },
            { $group: { _id: "$month", count: { $sum: 1 } } },
            { $sort: { "_id": 1 } }
          ])
        ]);
        const membersVsVisitorsGraph = [];
        for (let m = 1; m <= 12; m++) {
          const mRec = membersPerMonth.find(r => r._id === m);
          const vRec = visitorsPerMonth.find(r => r._id === m);
          membersVsVisitorsGraph.push({
            month: new Date(year, m - 1).toLocaleString("default", { month: "short" }),
            newMembers: mRec ? mRec.count : 0,
            visitors: vRec ? vRec.count : 0
          });
        }

        return {
          message: `Analytics Dashboard data for ${year} fetched successfully`,
          analyticsDashboard: {
            genderDistribution: genderData,
            attendanceGraph,
            last10SundaysGraph,
            ageGroupDistribution,
            membersVsVisitorsGraph
          }
        };
      }
    });

    return res.status(200).json(payload);

  } catch (error) {
    return res.status(400).json({
      message: "Analytics Dashboard data could not be fetched",
      error: error.message
    });
  }
};


// dashboard widgets

const getDashboardWidget = async (req, res) => {
  try {
    // --- Church scoping ---
    const query = {};
    const churchId = req.activeChurch?._id || req.user?.church;
    if (churchId) {
      query.church = churchId;
    }

    const today = new Date();

    const rawBirthdaysLimit = req.query?.birthdaysLimit;
    let birthdaysLimit = 10;
    if (rawBirthdaysLimit !== undefined && rawBirthdaysLimit !== null && rawBirthdaysLimit !== "") {
      const parsed = parseInt(rawBirthdaysLimit);
      if (!Number.isNaN(parsed)) birthdaysLimit = parsed;
    }
    if (birthdaysLimit <= 0) birthdaysLimit = Number.MAX_SAFE_INTEGER;

    const cacheKey = `dashboard:widgets:${String(query.church || "global")}:${String(birthdaysLimit)}`;
    const payload = await withCacheJson({
      key: cacheKey,
      ttlSeconds: 60,
      getValue: async () => {
        // --- 1. Upcoming Birthdays (next 30 days) ---
        // MongoDB cannot match by month/day directly, so we handle in JS after fetching
        const birthdayQuery = { ...query, status: { $in: ["active", "dormant", "temporarily_away"] } };
        const allMembers = await Member.find(birthdayQuery,
          "firstName lastName dateOfBirth profileImageUrl photoUrl").lean();

        const upcomingBirthdays = allMembers
          .map(m => {
            if (!m.dateOfBirth) return null;
            const dob = new Date(m.dateOfBirth);
            const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            if (nextBirthday < today) {
              nextBirthday.setFullYear(today.getFullYear() + 1);
            }
            const diffDays = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
            return { ...m, nextBirthday: nextBirthday.toISOString().split("T")[0], daysAway: diffDays };
          })
          .filter(Boolean)
          .sort((a, b) => a.daysAway - b.daysAway)
          .slice(0, birthdaysLimit);

        // --- 2. Recent Members (last 10 created) ---
        const recentMembers = await Member.find(query)
          .sort({ createdAt: -1 })
          .limit(10)
          .select("firstName lastName createdAt status phoneNumber ageGroup city profileImageUrl photoUrl")
          .lean();

        // --- 3. Upcoming Events ---
        const upcomingEvents = await Event.find({
          ...query,
          $or: [
            // Single-day future events
            {
              dateTo: { $exists: false },
              dateFrom: { $gt: today }
            },

            // Multi-day events that start in the future
            {
              dateFrom: { $gt: today },
              dateTo: { $gt: today }
            }
          ]
        })
          .sort({ dateFrom: 1 })
          .limit(10)
          .select("title dateFrom venue")
          .lean();

        return {
          message: "Dashboard widgets fetched successfully",
          dashboardWidget: {
            upcomingBirthdays,
            recentMembers,
            upcomingEvents
          }
        };
      }
    });

    return res.status(200).json(payload);

  } catch (error) {
    return res.status(400).json({
      message: "Dashboard widgets could not be fetched",
      error: error.message
    });
  }
};


const getDashboardSummary = async (req, res) => {
  return getDashboardKPI(req, res);
};


const getDashboardChart = async (req, res) => {
  return getDashboardAnalytics(req, res);
};


const getDashboardRecentOfferings = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id || req.user?.church;
    const cid = churchId ? String(churchId) : "global";
    const cacheKey = `dashboard:recent-offerings:${cid}`;

    const payload = await withCacheJson({
      key: cacheKey,
      ttlSeconds: 60,
      getValue: async () => {
        const match = {};
        if (churchId) match.church = churchId;

        const rows = await Offering.find(match)
          .sort({ createdAt: -1 })
          .limit(20)
          .select("serviceType offeringType serviceDate amount createdAt")
          .lean();

        return {
          message: "Recent offerings fetched successfully",
          recentOfferings: rows
        };
      }
    });

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(400).json({
      message: "Recent offerings could not be fetched",
      error: error.message
    });
  }
};


export {getDashboardKPI, getDashboardAnalytics, getDashboardWidget, getDashboardSummary, getDashboardChart, getDashboardRecentOfferings };
