import Member from "../models/memberModel.js"
import Attendance from "../models/attendanceModel.js"
import Event from "../models/eventModel.js"; 



const getDashboardKPI = async (req, res) => {
 try {
    // --- MAIN QUERY (church scoped) ---
    const query = {};
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.user.church;
    }

    // --- Start of current month for new members ---
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // --- MEMBER KPIs (parallel) ---
    const [totalMembers, currentMembers, newMembersThisMonth] = await Promise.all([
      Member.countDocuments(query),
      Member.countDocuments({ ...query, status: "active" }),
      Member.countDocuments({ ...query, dateJoined: { $gte: startOfMonth } })
    ]);

    // --- LAST SUNDAY ATTENDANCE ---
    const today = new Date();
    const dayOfWeek = today.getDay(); // Sunday = 0
    // Correct last Sunday: previous Sunday if today is Sunday, else most recent Sunday
    const offset = dayOfWeek === 0 ? 7 : dayOfWeek;
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - offset);
    lastSunday.setHours(0, 0, 0, 0);

    const nextDay = new Date(lastSunday);
    nextDay.setDate(lastSunday.getDate() + 1);

    // Find all Sunday services on that last Sunday
    const sundayServices = await Attendance.find({
      church: query.church,
      serviceDate: { $gte: lastSunday, $lt: nextDay },
      serviceType: { $regex: /^Sunday/i } // matches all Sunday services
    });

    // Aggregate total attendance
    const lastSundayAttendance = sundayServices.reduce(
      (total, service) => total + (service.totalNumber || 0),
      0
    );

    const serviceCount = sundayServices.length;
    const lastSundayDate = lastSunday.toISOString().split("T")[0]; // YYYY-MM-DD

    // --- RESPONSE ---
    return res.status(200).json({
      message: "Dashboard KPI fetched successfully",
      kpis: {
        totalMembers,
        currentMembers,
        newMembersThisMonth,
        lastSundayAttendance,
        lastSundayInfo: `${serviceCount} service${serviceCount !== 1 ? 's' : ''} · ${lastSundayDate}`
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
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.user.church;
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
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.user.church;
    }

    const today = new Date();

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
      .slice(0, 10); // top 10 upcoming birthdays

    // --- 2. Recent Members (last 10 joined) ---
    const recentMembers = await Member.find(query)
      .sort({ dateJoined: -1 })
      .limit(10)
      .select("firstName lastName dateJoined status")
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

