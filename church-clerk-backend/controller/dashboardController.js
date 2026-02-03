import Member from "../models/memberModel.js"
import Attendance from "../models/attendanceModel.js"
import Event from "../models/eventModel.js"; 



const getDashboardKPI = async (req, res) => {
 try {
    // --- MAIN QUERY (church scoped) ---
    const query = {};
    const churchId = req.activeChurch?._id || req.user?.church;
    if (churchId) {
      query.church = churchId;
    }

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

    const thisSundayServices = await Attendance.find({
      church: query.church,
      serviceDate: { $gte: thisSunday, $lt: thisSundayNextDay },
      serviceType: { $regex: /^Sunday/i }
    });

    const lastSunday = new Date(thisSunday);
    lastSunday.setDate(thisSunday.getDate() - 7);
    lastSunday.setHours(0, 0, 0, 0);

    const lastSundayNextDay = new Date(lastSunday);
    lastSundayNextDay.setDate(lastSunday.getDate() + 1);

    const lastSundayServices = await Attendance.find({
      church: query.church,
      serviceDate: { $gte: lastSunday, $lt: lastSundayNextDay },
      serviceType: { $regex: /^Sunday/i }
    });

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

    // --- RESPONSE ---
    return res.status(200).json({
      message: "Dashboard KPI fetched successfully",
      kpis: {
        totalMembers,
        currentMembers,
        newMembersThisMonth,
        lastSundayAttendance: thisSundayAttendance,
        change,
        lastSundayInfo: `${serviceCount} service${serviceCount !== 1 ? 's' : ''} · ${thisSundayDate}`
      }
    });

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

    // --- Gender Distribution ---
    const genderAgg = await Member.aggregate([
      { $match: { ...query, status: "active" } },
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

    // --- Attendance Graph per month (sum of all Sunday services) ---
   const attendanceAgg = await Attendance.aggregate([
  {
    $match: {
      church: query.church,
      serviceType: { $regex: /^Sunday/i },
      serviceDate: { $gte: startOfYear, $lte: endOfYear }
    }
  },
  {
    $addFields: {
      year: { $year: "$serviceDate" },
      month: { $month: "$serviceDate" }
    }
  },
  {
    $match: { year: year } // ensures only the correct year
  },
  {
    $group: {
      _id: "$month",
      totalAttendance: { $sum: "$totalNumber" }
    }
  },
  { $sort: { "_id": 1 } }
]);


    // Map into all 12 months for chart (default 0 if no data)
    const attendanceGraph = [];
for (let m = 1; m <= 12; m++) {
  const record = attendanceAgg.find(a => a._id === m);
  attendanceGraph.push({
    month: new Date(year, m - 1).toLocaleString("default", { month: "long" }),
    totalAttendance: record ? record.totalAttendance : 0
  });
}


    // --- RESPONSE ---
    return res.status(200).json({
      message: `Analytics Dashboard  data for ${year} fetched successfully`,
      analyticsDashboard : {
        genderDistribution: genderData,
        attendanceGraph
      }
    });

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

    // --- 1. Upcoming Birthdays (next 30 days) ---
    // MongoDB cannot match by month/day directly, so we handle in JS after fetching
    const allMembers = await Member.find({ ...query, status: "active" }, 
      "firstName lastName dateOfBirth").lean();

    const upcomingBirthdays = allMembers
      .map(m => {
        if (!m.dateOfBirth) return null;
        const dob = new Date(m.dateOfBirth);
        const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1);
        }
        const diffDays = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          return { ...m, nextBirthday: nextBirthday.toISOString().split("T")[0], daysAway: diffDays };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.daysAway - b.daysAway)
      .slice(0, birthdaysLimit);

    // --- 2. Recent Members (last 10 created) ---
    const recentMembers = await Member.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .select("firstName lastName createdAt status")
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

  
    // --- RESPONSE ---
    return res.status(200).json({
      message: "Dashboard widgets fetched successfully",
      dashboardWidget: {
        upcomingBirthdays,
        recentMembers,
        upcomingEvents
      }
    });

  } catch (error) {
    return res.status(400).json({
      message: "Dashboard widgets could not be fetched",
      error: error.message
    });
  }
};


export {getDashboardKPI, getDashboardAnalytics, getDashboardWidget };



