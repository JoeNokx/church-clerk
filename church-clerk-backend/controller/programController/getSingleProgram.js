import Program from "../../models/programModel.js";
import ProgramAttendees from "../../models/programModel/programAttendeesModel.js";
import TotalProgramAttendance from "../../models/programModel/totalProgramAttendance.js";

// GET SINGLE
const getSingleProgram = async (req, res) => {
  try {
    const programId = req.params.id;
    const query = { _id: programId };

    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    const program = await Program.findOne(query)
      .populate("church", "name")
      .populate("cell", "name")
      .populate("group", "name")
      .populate("department", "name");
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    let status = "unknown";
    if (program.dateFrom && program.dateTo) {
      if (program.dateFrom > now) status = "upcoming";
      else if (program.dateTo < now) status = "past";
      else status = "ongoing";
    } else if (program.dateFrom) {
      if (program.dateFrom >= tomorrowStart) status = "upcoming";
      else if (program.dateFrom < todayStart) status = "past";
      else status = "ongoing";
    }

    const attendeeCount = await ProgramAttendees.countDocuments({ church: program.church, event: programId });
    const totalAttendanceRecords = await TotalProgramAttendance.countDocuments({ church: program.church, event: programId });

    return res.status(200).json({
      message: "Program retrieved successfully",
      program: { ...program.toObject(), status, attendeeCount, totalAttendanceRecords }
    });
  } catch (error) {
    console.error("Get single program error:", error);
    return res.status(500).json({ message: "Failed to retrieve program", error: error.message });
  }
};

export default getSingleProgram;