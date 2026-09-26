import Program from "../../models/programModel.js";
import totalProgramAttendance from "../../models/programModel/totalProgramAttendance.js";

const createTotalProgramAttendance = async (req, res) => {
  try {
    const { programId } = req.params;
    const { date, numberOfAttendees, mainSpeaker } = req.body;

    // 1. Validate group exists and belongs to this church
    const programQuery = { _id: programId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      programQuery.church = req.activeChurch._id;
    }

    const program = await Program.findOne(programQuery);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const attendance = await totalProgramAttendance.create({
      event: programId,
      church: program.church,
      createdBy: req.user._id, 
      date,
      numberOfAttendees,
      mainSpeaker
    });

    res.status(201).json(attendance);
  } catch (error) {
    console.log("could not record attendance", error)
    return res.status(500).json({ error: error.message });
  }
};


//get all group attendance
const getAllTotalProgramAttendances = async(req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { programId } = req.params;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const programQuery = { _id: programId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      programQuery.church = req.activeChurch._id;
    }

    const program = await Program.findOne(programQuery);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const query = { church: program.church, event: programId };

    const attendances = await totalProgramAttendance.find(query)
      .select("date numberOfAttendees mainSpeaker")
      .populate("event", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // COUNT TOTAL VISITORS
    const totalProgramAttendances = await totalProgramAttendance.countDocuments(query);

    // IF NO RESULTS
    if (!attendances || attendances.length === 0) {
      return res.status(200).json({
        message: "No attendance found.",
        stats: {
          totalProgramAttendances: 0
        },
        pagination: {
          totalResult: 0,
          totalPages: 0,
          currentPage: pageNum,
          hasPrev: false,
          hasNext: false,
          prevPage: null,
          nextPage: null,
        },
        count: 0,
        attendances: [],
      });
    }

    // PAGINATION DETAILS
    const totalPages = Math.ceil(totalProgramAttendances / limitNum);

    const pagination = {
      totalResult: totalProgramAttendances,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    };

    res.status(200).json({
      message: "All program attendances",
      stats: {
        totalProgramAttendances,
      },
      pagination,
      count: attendances.length,
      attendances
    });
  } catch (error) {
    console.log("could not record attendance", error)
    return res.status(500).json({ error: error.message });
  }
};


//update group attendance

const updateTotalProgramAttendance = async(req, res) => {
  try {
    const {programId, attendanceId} = req.params;

    const programQuery = { _id: programId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      programQuery.church = req.activeChurch._id;
    }

    const program = await Program.findOne(programQuery);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const query = { _id: attendanceId, event: programId, church: program.church };

    const attendance = await totalProgramAttendance.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true
    })

    if(!attendance) {
      return res.status(404).json({message: "attendance not found"})
    }

    return res.status(200).json({message: "attendance updated successfully", attendance})
  } catch (error) {
    console.log("could not update attendance", error)
    return res.status(500).json({ error: error.message });
  }
};


//delete group attendance

const deleteTotalProgramAttendance = async(req, res) => {
  try {
    const {programId, attendanceId} = req.params;

    const programQuery = { _id: programId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      programQuery.church = req.activeChurch._id;
    }

    const program = await Program.findOne(programQuery);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const query = { _id: attendanceId, event: programId, church: program.church };
    const attendance = await totalProgramAttendance.findOneAndDelete(query);

    if(!attendance) {
      return res.status(404).json({message: "attendance not found"})
    }

    return res.status(200).json({message: "attendance deleted successfully", attendance})
  } catch (error) {
    console.log("could not delete attendance", error)
    return res.status(500).json({ error: error.message });
  }
};


export {
    createTotalProgramAttendance,
    getAllTotalProgramAttendances,
    updateTotalProgramAttendance,
    deleteTotalProgramAttendance
}