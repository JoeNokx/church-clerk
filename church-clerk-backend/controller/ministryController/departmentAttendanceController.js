import Attendance from "../../models/ministryModel/departmentAttendanceModel.js";
import Department from "../../models/ministryModel/departmentModel.js";

const createDepartmentAttendance = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { date, numberOfAttendees, mainSpeaker, activity } = req.body;

    if (!date || !numberOfAttendees) {
      return res.status(400).json({ message: "date and number of attendees are required" });
    }

    const churchId = req.activeChurch?._id || req.user?.church;

    const department = await Department.findOne({ _id: departmentId, church: churchId });
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const attendance = await Attendance.create({
      department: departmentId,
      church: churchId,
      createdBy: req.user._id,
      date,
      numberOfAttendees,
      mainSpeaker,
      activity
    });

    return res.status(201).json({ message: "attendance recorded successfully", attendance });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getAllDepartmentAttendances = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const { departmentId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const query = { department: departmentId, church: churchId };

    const attendances = await Attendance.find(query)
      .select("date numberOfAttendees mainSpeaker activity")
      .populate("department", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalDepartmentAttendances = await Attendance.countDocuments(query);

    if (!attendances || attendances.length === 0) {
      return res.status(200).json({
        message: "No attendance found.",
        stats: {
          totalDepartmentAttendances: 0
        },
        pagination: {
          totalResult: 0,
          totalPages: 0,
          currentPage: pageNum,
          hasPrev: false,
          hasNext: false,
          prevPage: null,
          nextPage: null
        },
        count: 0,
        attendances: []
      });
    }

    const totalPages = Math.ceil(totalDepartmentAttendances / limitNum);

    const pagination = {
      totalResult: totalDepartmentAttendances,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null
    };

    return res.status(200).json({
      message: "All department attendances",
      stats: {
        totalDepartmentAttendances
      },
      pagination,
      count: attendances.length,
      attendances
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updateDepartmentAttendance = async (req, res) => {
  try {
    const { departmentId, attendanceId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const department = await Department.findOne({ _id: departmentId, church: churchId });
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const attendance = await Attendance.findOneAndUpdate(
      { _id: attendanceId, department: departmentId, church: churchId },
      req.body,
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

const deleteDepartmentAttendance = async (req, res) => {
  try {
    const { departmentId, attendanceId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const department = await Department.findOne({ _id: departmentId, church: churchId });
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const attendance = await Attendance.findOneAndDelete({ _id: attendanceId, department: departmentId, church: churchId });

    if (!attendance) {
      return res.status(404).json({ message: "attendance not found" });
    }

    return res.status(200).json({ message: "attendance deleted successfully", attendance });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export { createDepartmentAttendance, updateDepartmentAttendance, deleteDepartmentAttendance, getAllDepartmentAttendances };
