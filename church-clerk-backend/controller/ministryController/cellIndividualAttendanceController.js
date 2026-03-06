import IndividualAttendance from "../../models/ministryModel/cellIndividualAttendanceModel.js";
import Cell from "../../models/ministryModel/cellModel.js";
import CellMember from "../../models/ministryModel/cellMembersModel.js";

const createCellIndividualAttendance = async (req, res) => {
  try {
    const { cellId } = req.params;
    const { date, presentMembers } = req.body;

    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }

    const churchId = req.activeChurch?._id || req.user?.church;

    const cell = await Cell.findOne({ _id: cellId, church: churchId });
    if (!cell) {
      return res.status(404).json({ message: "Cell not found" });
    }

    const totalMembersSnapshot = await CellMember.countDocuments({ cell: cellId, church: churchId });

    const ids = Array.isArray(presentMembers) ? presentMembers.filter(Boolean) : [];

    const attendance = await IndividualAttendance.create({
      cell: cellId,
      church: churchId,
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

const getAllCellIndividualAttendances = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const { cellId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const query = { cell: cellId, church: churchId };

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
      message: "All cell individual attendances",
      stats: { totalCellAttendances: total },
      pagination,
      count: rows.length,
      attendances: rows
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getSingleCellIndividualAttendance = async (req, res) => {
  try {
    const { cellId, attendanceId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const cell = await Cell.findOne({ _id: cellId, church: churchId });
    if (!cell) {
      return res.status(404).json({ message: "Cell not found" });
    }

    const attendance = await IndividualAttendance.findOne({ _id: attendanceId, cell: cellId, church: churchId })
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

const updateCellIndividualAttendance = async (req, res) => {
  try {
    const { cellId, attendanceId } = req.params;
    const { date, presentMembers } = req.body;

    const churchId = req.activeChurch?._id || req.user?.church;

    const cell = await Cell.findOne({ _id: cellId, church: churchId });
    if (!cell) {
      return res.status(404).json({ message: "Cell not found" });
    }

    const totalMembersSnapshot = await CellMember.countDocuments({ cell: cellId, church: churchId });

    const ids = Array.isArray(presentMembers) ? presentMembers.filter(Boolean) : [];

    const attendance = await IndividualAttendance.findOneAndUpdate(
      { _id: attendanceId, cell: cellId, church: churchId },
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

const deleteCellIndividualAttendance = async (req, res) => {
  try {
    const { cellId, attendanceId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const cell = await Cell.findOne({ _id: cellId, church: churchId });
    if (!cell) {
      return res.status(404).json({ message: "Cell not found" });
    }

    const attendance = await IndividualAttendance.findOneAndDelete({ _id: attendanceId, cell: cellId, church: churchId });
    if (!attendance) {
      return res.status(404).json({ message: "attendance not found" });
    }

    return res.status(200).json({ message: "attendance deleted successfully", attendance });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export {
  createCellIndividualAttendance,
  getAllCellIndividualAttendances,
  getSingleCellIndividualAttendance,
  updateCellIndividualAttendance,
  deleteCellIndividualAttendance
};
