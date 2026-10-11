import crypto from "crypto";
import IndividualAttendance from "../../models/organisationModel/departmentIndividualAttendanceModel.js";
import Department from "../../models/organisationModel/departmentModel.js";
import DepartmentMember from "../../models/organisationModel/departmentMembersModel.js";
import { annotateDeletable } from "../../services/recordDependencyService.js";

const MEMBER_FIELDS = "firstName lastName phoneNumber email streetAddress city";

const createDepartmentIndividualAttendance = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { date, serviceType, presentMembers, absentMembers, mainSpeaker, expectedCount } = req.body;

    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }
    if (!serviceType || !String(serviceType).trim()) {
      return res.status(400).json({ message: "serviceType is required" });
    }

    const churchId = req.activeChurch?._id || req.user?.church;

    const department = await Department.findOne({ _id: departmentId, church: churchId });
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const totalMembersSnapshot = await DepartmentMember.countDocuments({ department: departmentId, church: churchId });

    const presentIds = Array.isArray(presentMembers) ? presentMembers.filter(Boolean) : [];
    const absentIds = Array.isArray(absentMembers) ? absentMembers.filter(Boolean) : [];
    // Ensure mutual exclusivity: a member cannot be both present and absent
    const absentSet = new Set(absentIds.map((id) => String(id)));
    const cleanPresentIds = presentIds.filter((id) => !absentSet.has(String(id)));

    const attendance = await IndividualAttendance.create({
      department: departmentId,
      church: churchId,
      createdBy: req.user._id,
      date,
      serviceType: String(serviceType).trim(),
      mainSpeaker: typeof mainSpeaker === "string" ? mainSpeaker.trim() : "",
      presentMembers: cleanPresentIds,
      absentMembers: absentIds,
      totalMembersSnapshot,
      expectedCount: Math.max(0, Number(expectedCount) || 0)
    });

    return res.status(201).json({ message: "attendance recorded successfully", attendance });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getAllDepartmentIndividualAttendances = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, serviceType, dateFrom, dateTo } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const { departmentId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const query = { department: departmentId, church: churchId };

    if (search) {
      query.mainSpeaker = { $regex: search, $options: "i" };
    }
    if (serviceType) {
      query.serviceType = serviceType;
    }

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    const attendances = await IndividualAttendance.find(query)
      .select("date serviceType mainSpeaker presentMembers absentMembers totalMembersSnapshot expectedCount")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await IndividualAttendance.countDocuments(query);

    let rows = (Array.isArray(attendances) ? attendances : []).map((a) => {
      const presentCount = Array.isArray(a?.presentMembers) ? a.presentMembers.length : 0;
      const absentCount = Array.isArray(a?.absentMembers) ? a.absentMembers.length : 0;
      const totalSnap = Number(a?.totalMembersSnapshot || 0);
      const unmarkedCount = Math.max(0, totalSnap - presentCount - absentCount);
      return { ...a, presentCount, absentCount, unmarkedCount, actualCount: presentCount };
    });
    rows = await annotateDeletable("departmentIndividualAttendance", rows, churchId);

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
      message: "All department individual attendances",
      stats: { totalDepartmentAttendances: total },
      pagination,
      count: rows.length,
      attendances: rows
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getSingleDepartmentIndividualAttendance = async (req, res) => {
  try {
    const { departmentId, attendanceId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const department = await Department.findOne({ _id: departmentId, church: churchId });
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const attendance = await IndividualAttendance.findOne({ _id: attendanceId, department: departmentId, church: churchId })
      .select("date serviceType mainSpeaker presentMembers absentMembers totalMembersSnapshot expectedCount")
      .populate("presentMembers", MEMBER_FIELDS)
      .populate("absentMembers", MEMBER_FIELDS)
      .lean();

    if (!attendance) {
      return res.status(404).json({ message: "attendance not found" });
    }

    const presentCount = Array.isArray(attendance?.presentMembers) ? attendance.presentMembers.length : 0;
    const absentCount = Array.isArray(attendance?.absentMembers) ? attendance.absentMembers.length : 0;
    const totalSnap = Number(attendance?.totalMembersSnapshot || 0);
    const unmarkedCount = Math.max(0, totalSnap - presentCount - absentCount);

    return res.status(200).json({
      message: "Attendance fetched successfully",
      attendance: { ...attendance, presentCount, absentCount, unmarkedCount, actualCount: presentCount }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updateDepartmentIndividualAttendance = async (req, res) => {
  try {
    const { departmentId, attendanceId } = req.params;
    const { date, serviceType, presentMembers, absentMembers, mainSpeaker, expectedCount } = req.body;

    const churchId = req.activeChurch?._id || req.user?.church;

    const department = await Department.findOne({ _id: departmentId, church: churchId });
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const totalMembersSnapshot = await DepartmentMember.countDocuments({ department: departmentId, church: churchId });

    const presentIds = Array.isArray(presentMembers) ? presentMembers.filter(Boolean) : [];
    const absentIds = Array.isArray(absentMembers) ? absentMembers.filter(Boolean) : [];
    // Ensure mutual exclusivity: a member cannot be both present and absent
    const absentSet = new Set(absentIds.map((id) => String(id)));
    const cleanPresentIds = presentIds.filter((id) => !absentSet.has(String(id)));

    const update = {
      date,
      mainSpeaker: typeof mainSpeaker === "string" ? mainSpeaker.trim() : "",
      presentMembers: cleanPresentIds,
      absentMembers: absentIds,
      totalMembersSnapshot,
      ...(expectedCount !== undefined ? { expectedCount: Math.max(0, Number(expectedCount) || 0) } : {})
    };
    if (serviceType !== undefined) update.serviceType = String(serviceType || "").trim();

    const attendance = await IndividualAttendance.findOneAndUpdate(
      { _id: attendanceId, department: departmentId, church: churchId },
      update,
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

const deleteDepartmentIndividualAttendance = async (req, res) => {
  try {
    const { departmentId, attendanceId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const department = await Department.findOne({ _id: departmentId, church: churchId });
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const attendance = await IndividualAttendance.findOneAndDelete({ _id: attendanceId, department: departmentId, church: churchId });
    if (!attendance) {
      return res.status(404).json({ message: "attendance not found" });
    }

    return res.status(200).json({ message: "attendance deleted successfully", attendance });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getDepartmentCheckInLinkStatus = async (req, res) => {
  try {
    const { departmentId, attendanceId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;
    const attendance = await IndividualAttendance.findOne({ _id: attendanceId, department: departmentId, church: churchId })
      .select("selfCheckInToken selfCheckInActive date serviceType")
      .lean();
    if (!attendance) {
      return res.status(404).json({ message: "Attendance not found" });
    }
    return res.status(200).json({
      token: attendance.selfCheckInActive ? attendance.selfCheckInToken : null,
      active: attendance.selfCheckInActive || false
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const generateDepartmentCheckInLink = async (req, res) => {
  try {
    const { departmentId, attendanceId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;
    const token = crypto.randomBytes(24).toString("hex");
    const attendance = await IndividualAttendance.findOneAndUpdate(
      { _id: attendanceId, department: departmentId, church: churchId },
      { selfCheckInToken: token, selfCheckInActive: true },
      { new: true }
    );
    if (!attendance) {
      return res.status(404).json({ message: "Attendance not found" });
    }
    return res.status(200).json({ message: "Check-in link generated", token: attendance.selfCheckInToken, active: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const revokeDepartmentCheckInLink = async (req, res) => {
  try {
    const { departmentId, attendanceId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;
    const attendance = await IndividualAttendance.findOneAndUpdate(
      { _id: attendanceId, department: departmentId, church: churchId },
      { $unset: { selfCheckInToken: 1 }, $set: { selfCheckInActive: false } },
      { new: true }
    );
    if (!attendance) {
      return res.status(404).json({ message: "Attendance not found" });
    }
    return res.status(200).json({ message: "Check-in link revoked" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export {
  createDepartmentIndividualAttendance,
  getAllDepartmentIndividualAttendances,
  getSingleDepartmentIndividualAttendance,
  updateDepartmentIndividualAttendance,
  deleteDepartmentIndividualAttendance,
  getDepartmentCheckInLinkStatus,
  generateDepartmentCheckInLink,
  revokeDepartmentCheckInLink
};
