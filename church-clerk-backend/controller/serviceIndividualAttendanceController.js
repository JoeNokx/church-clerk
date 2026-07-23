import crypto from "crypto";
import ServiceIndividualAttendance from "../models/serviceIndividualAttendanceModel.js";
import Member from "../models/memberModel.js";

const createServiceIndividualAttendance = async (req, res) => {
  try {
    const { date, serviceType, presentMembers } = req.body;

    if (!date) return res.status(400).json({ message: "date is required" });
    if (!serviceType) return res.status(400).json({ message: "serviceType is required" });

    const churchId = req.activeChurch._id;

    const totalMembersSnapshot = await Member.countDocuments({ church: churchId, status: "active" });

    const ids = Array.isArray(presentMembers) ? presentMembers.filter(Boolean) : [];

    const attendance = await ServiceIndividualAttendance.create({
      church: churchId,
      createdBy: req.user._id,
      date,
      serviceType,
      presentMembers: ids,
      totalMembersSnapshot
    });

    return res.status(201).json({ message: "Attendance recorded successfully", attendance });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllServiceIndividualAttendances = async (req, res) => {
  try {
    const { page = 1, limit = 10, dateFrom, dateTo, serviceType } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query = { church: req.activeChurch._id };

    if (serviceType) query.serviceType = serviceType;

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const attendances = await ServiceIndividualAttendance.find(query)
      .select("date serviceType presentMembers totalMembersSnapshot")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await ServiceIndividualAttendance.countDocuments(query);

    const rows = attendances.map((a) => {
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

    return res.status(200).json({ message: "Attendances fetched", pagination, count: rows.length, attendances: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getSingleServiceIndividualAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await ServiceIndividualAttendance.findOne({ _id: id, church: req.activeChurch._id })
      .select("date serviceType presentMembers totalMembersSnapshot")
      .populate("presentMembers", "firstName lastName phoneNumber email streetAddress")
      .lean();

    if (!attendance) return res.status(404).json({ message: "Attendance not found" });

    const presentCount = Array.isArray(attendance?.presentMembers) ? attendance.presentMembers.length : 0;
    const totalSnap = Number(attendance?.totalMembersSnapshot || 0);
    const absentCount = Math.max(0, totalSnap - presentCount);

    return res.status(200).json({ message: "Attendance fetched", attendance: { ...attendance, presentCount, absentCount } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateServiceIndividualAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, serviceType, presentMembers } = req.body;

    const churchId = req.activeChurch._id;

    const totalMembersSnapshot = await Member.countDocuments({ church: churchId, status: "active" });

    const ids = Array.isArray(presentMembers) ? presentMembers.filter(Boolean) : [];

    const attendance = await ServiceIndividualAttendance.findOneAndUpdate(
      { _id: id, church: churchId },
      { date, serviceType, presentMembers: ids, totalMembersSnapshot },
      { new: true, runValidators: true }
    );

    if (!attendance) return res.status(404).json({ message: "Attendance not found" });

    return res.status(200).json({ message: "Attendance updated successfully", attendance });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteServiceIndividualAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await ServiceIndividualAttendance.findOneAndDelete({ _id: id, church: req.activeChurch._id });

    if (!attendance) return res.status(404).json({ message: "Attendance not found" });

    return res.status(200).json({ message: "Attendance deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCheckInLinkStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const attendance = await ServiceIndividualAttendance.findOne({ _id: id, church: req.activeChurch._id })
      .select("selfCheckInToken selfCheckInActive date serviceType")
      .lean();
    if (!attendance) return res.status(404).json({ message: "Attendance not found" });
    return res.status(200).json({
      token: attendance.selfCheckInActive ? attendance.selfCheckInToken : null,
      active: attendance.selfCheckInActive || false
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const generateCheckInLink = async (req, res) => {
  try {
    const { id } = req.params;
    const token = crypto.randomBytes(24).toString("hex");
    const attendance = await ServiceIndividualAttendance.findOneAndUpdate(
      { _id: id, church: req.activeChurch._id },
      { selfCheckInToken: token, selfCheckInActive: true },
      { new: true }
    );
    if (!attendance) return res.status(404).json({ message: "Attendance not found" });
    return res.status(200).json({ message: "Check-in link generated", token: attendance.selfCheckInToken, active: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const revokeCheckInLink = async (req, res) => {
  try {
    const { id } = req.params;
    const attendance = await ServiceIndividualAttendance.findOneAndUpdate(
      { _id: id, church: req.activeChurch._id },
      { $unset: { selfCheckInToken: 1 }, $set: { selfCheckInActive: false } },
      { new: true }
    );
    if (!attendance) return res.status(404).json({ message: "Attendance not found" });
    return res.status(200).json({ message: "Check-in link revoked" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAttendanceByCheckInToken = async (req, res) => {
  try {
    const { token } = req.params;
    const attendance = await ServiceIndividualAttendance.findOne({ selfCheckInToken: token, selfCheckInActive: true })
      .populate("church", "name pastor city country")
      .lean();
    if (!attendance) return res.status(404).json({ message: "Check-in link is invalid or has been revoked." });
    return res.status(200).json({
      attendance: { date: attendance.date, serviceType: attendance.serviceType, church: attendance.church }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const memberCheckIn = async (req, res) => {
  try {
    const { token } = req.params;
    const { phoneNumber } = req.body;
    if (!phoneNumber || !String(phoneNumber).trim()) return res.status(400).json({ message: "Phone number is required." });
    const attendance = await ServiceIndividualAttendance.findOne({ selfCheckInToken: token, selfCheckInActive: true });
    if (!attendance) return res.status(404).json({ message: "Check-in link is invalid or has been revoked." });
    const member = await Member.findOne({ church: attendance.church, phoneNumber: String(phoneNumber).trim(), status: "active" }).lean();
    if (!member) return res.status(404).json({ message: "No active member found with this phone number." });
    const alreadyPresent = attendance.presentMembers.some((pid) => String(pid) === String(member._id));
    if (alreadyPresent) {
      return res.status(200).json({ message: `You are already marked as present, ${member.firstName}!`, alreadyCheckedIn: true, memberName: `${member.firstName} ${member.lastName}` });
    }
    await ServiceIndividualAttendance.findByIdAndUpdate(attendance._id, { $addToSet: { presentMembers: member._id } });
    return res.status(200).json({ message: `Welcome, ${member.firstName}! You have been marked as present.`, memberName: `${member.firstName} ${member.lastName}` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export {
  createServiceIndividualAttendance,
  getAllServiceIndividualAttendances,
  getSingleServiceIndividualAttendance,
  updateServiceIndividualAttendance,
  deleteServiceIndividualAttendance,
  getCheckInLinkStatus,
  generateCheckInLink,
  revokeCheckInLink,
  getAttendanceByCheckInToken,
  memberCheckIn
};
