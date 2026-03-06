import IndividualAttendance from "../../models/ministryModel/groupIndividualAttendanceModel.js";
import Group from "../../models/ministryModel/groupModel.js";
import GroupMember from "../../models/ministryModel/groupMembersModel.js";

const createGroupIndividualAttendance = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { date, presentMembers } = req.body;

    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }

    const query = { _id: groupId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    const group = await Group.findOne(query);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const totalMembersSnapshot = await GroupMember.countDocuments({ group: groupId, church: group.church });

    const ids = Array.isArray(presentMembers) ? presentMembers.filter(Boolean) : [];

    const attendance = await IndividualAttendance.create({
      group: groupId,
      church: group.church,
      createdBy: req.user._id,
      date,
      presentMembers: ids,
      totalMembersSnapshot
    });

    return res.status(201).json({ message: "attendance recorded successfully", attendance });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getAllGroupIndividualAttendances = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const { groupId } = req.params;

    const query = { group: groupId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    const attendances = await IndividualAttendance.find(query)
      .select("date presentMembers totalMembersSnapshot")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await IndividualAttendance.countDocuments(query);

    const rows = (Array.isArray(attendances) ? attendances : []).map((a) => {
      const presentCount = Array.isArray(a?.presentMembers) ? a.presentMembers.length : 0;
      const totalSnap = Number(a?.totalMembersSnapshot || 0);
      const absentCount = Math.max(0, totalSnap - presentCount);
      return { ...a, presentCount, absentCount };
    });

    const totalPages = Math.ceil(total / limitNum);
    const pagination = {
      totalResult: total,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null
    };

    return res.status(200).json({
      message: "All group individual attendances",
      stats: { totalGroupAttendances: total },
      pagination,
      count: rows.length,
      attendances: rows
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getSingleGroupIndividualAttendance = async (req, res) => {
  try {
    const { groupId, attendanceId } = req.params;

    const query = { _id: attendanceId, group: groupId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    const attendance = await IndividualAttendance.findOne(query)
      .select("date presentMembers totalMembersSnapshot")
      .populate("presentMembers", "firstName lastName phoneNumber email")
      .lean();

    if (!attendance) {
      return res.status(404).json({ message: "attendance not found" });
    }

    const presentCount = Array.isArray(attendance?.presentMembers) ? attendance.presentMembers.length : 0;
    const totalSnap = Number(attendance?.totalMembersSnapshot || 0);
    const absentCount = Math.max(0, totalSnap - presentCount);

    return res.status(200).json({
      message: "Attendance fetched successfully",
      attendance: { ...attendance, presentCount, absentCount }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updateGroupIndividualAttendance = async (req, res) => {
  try {
    const { groupId, attendanceId } = req.params;
    const { date, presentMembers } = req.body;

    const groupQuery = { _id: groupId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      groupQuery.church = req.activeChurch._id;
    }

    const group = await Group.findOne(groupQuery);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const totalMembersSnapshot = await GroupMember.countDocuments({ group: groupId, church: group.church });

    const ids = Array.isArray(presentMembers) ? presentMembers.filter(Boolean) : [];

    const query = { _id: attendanceId, group: groupId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    const attendance = await IndividualAttendance.findOneAndUpdate(
      query,
      { date, presentMembers: ids, totalMembersSnapshot },
      { new: true, runValidators: true }
    );

    if (!attendance) {
      return res.status(404).json({ message: "attendance not found" });
    }

    return res.status(200).json({ message: "attendance updated successfully", attendance });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const deleteGroupIndividualAttendance = async (req, res) => {
  try {
    const { groupId, attendanceId } = req.params;

    const groupQuery = { _id: groupId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      groupQuery.church = req.activeChurch._id;
    }

    const group = await Group.findOne(groupQuery);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const query = { _id: attendanceId, group: groupId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    const attendance = await IndividualAttendance.findOneAndDelete(query);
    if (!attendance) {
      return res.status(404).json({ message: "attendance not found" });
    }

    return res.status(200).json({ message: "attendance deleted successfully", attendance });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export {
  createGroupIndividualAttendance,
  getAllGroupIndividualAttendances,
  getSingleGroupIndividualAttendance,
  updateGroupIndividualAttendance,
  deleteGroupIndividualAttendance
};
