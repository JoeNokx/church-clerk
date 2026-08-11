import OutreachEvent from "../../models/outreachModel/outreachEventModel.js";
import OutreachProspect from "../../models/outreachModel/outreachProspectModel.js";
import OutreachFollowUp from "../../models/outreachModel/outreachFollowUpModel.js";

export const getOutreachAnalytics = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    // Monthly people reached
    const monthlyProspects = await OutreachProspect.aggregate([
      { $match: { church: churchId, createdAt: { $gte: yearStart, $lte: yearEnd } } },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 }, decisions: { $sum: { $cond: ["$acceptedChrist", 1, 0] } } } },
      { $sort: { "_id": 1 } },
    ]);

    // Monthly events
    const monthlyEvents = await OutreachEvent.aggregate([
      { $match: { church: churchId, date: { $gte: yearStart, $lte: yearEnd } } },
      { $group: { _id: { $month: "$date" }, count: { $sum: 1 } } },
      { $sort: { "_id": 1 } },
    ]);

    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyChart = MONTHS.map((month, i) => {
      const mNum = i + 1;
      const p = monthlyProspects.find((m) => m._id === mNum);
      const e = monthlyEvents.find((m) => m._id === mNum);
      return { month, peopleReached: p?.count || 0, decisions: p?.decisions || 0, events: e?.count || 0 };
    });

    // Stage distribution (pipeline funnel)
    const stageAgg = await OutreachProspect.aggregate([
      { $match: { church: churchId } },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]);
    const stageMap = Object.fromEntries(stageAgg.map((s) => [s._id, s.count]));
    const stages = ["reached", "contacted", "interested", "visited-church", "connected", "new-believer", "member"];
    const pipelineChart = stages.map((s) => ({ stage: s, count: stageMap[s] || 0 }));

    // Outreach type distribution
    const typeAgg = await OutreachEvent.aggregate([
      { $match: { church: churchId } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Follow-up completion rate (this year)
    const fuTotal = await OutreachFollowUp.countDocuments({ church: churchId, createdAt: { $gte: yearStart } });
    const fuCompleted = await OutreachFollowUp.countDocuments({ church: churchId, status: "completed", createdAt: { $gte: yearStart } });
    const followUpRate = fuTotal > 0 ? Math.round((fuCompleted / fuTotal) * 100) : 0;

    // Top outreach locations
    const locationAgg = await OutreachEvent.aggregate([
      { $match: { church: churchId, area: { $ne: null, $ne: "" } } },
      { $group: { _id: "$area", count: { $sum: 1 }, reached: { $sum: "$prospectCount" } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Conversion summary
    const totalConverted = await OutreachProspect.countDocuments({ church: churchId, convertedToMember: true });
    const totalVisitors = await OutreachProspect.countDocuments({ church: churchId, markedAsVisitor: true });

    return res.status(200).json({
      message: "Analytics fetched",
      data: {
        year,
        monthlyChart,
        pipelineChart,
        typeDistribution: typeAgg,
        followUpRate,
        fuTotal,
        fuCompleted,
        totalConverted,
        totalVisitors,
        locationAgg,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTeamStats = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;

    const events = await OutreachEvent.find({ church: churchId })
      .select("title date teamMembers teamLeader coordinator teamRoles")
      .lean();

    const memberParticipation = {};
    for (const ev of events) {
      const allMembers = [
        ...(ev.teamMembers || []).map((m) => String(m)),
        ...(ev.teamLeader ? [String(ev.teamLeader)] : []),
        ...(ev.coordinator ? [String(ev.coordinator)] : []),
      ];
      const unique = [...new Set(allMembers)];
      for (const mid of unique) {
        if (!memberParticipation[mid]) memberParticipation[mid] = { count: 0, events: [] };
        memberParticipation[mid].count++;
        memberParticipation[mid].events.push({ id: ev._id, title: ev.title, date: ev.date });
      }
    }

    const topParticipants = Object.entries(memberParticipation)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([memberId, data]) => ({ memberId, ...data }));

    return res.status(200).json({
      message: "Team stats fetched",
      data: { topParticipants, totalUniqueVolunteers: Object.keys(memberParticipation).length },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
