import Attendance from "../../models/ministryModel/groupAttendanceModel.js";
import Group from "../../models/ministryModel/groupModel.js";    

const createGroupAttendance = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { date, numberOfAttendees, mainSpeaker, activity } = req.body;

    if(!date || !numberOfAttendees) {
        return res.status(400).json({message: "date and number of attendees are required"})
    }

      // 1. Validate group exists and belongs to this church
    const query = { _id: groupId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.user.church;
    }

    const group = await Group.findOne(query);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const attendance = await Attendance.create({
      group: groupId,
      church: group.church,
      createdBy: req.user._id, 
      date,
      numberOfAttendees,
      mainSpeaker,
      activity
    });

    res.status(201).json({
      message: "attendance recorded successfully", 
      attendance
    });
  } catch (error) {
    console.log("could not record attendance", error)
    return res.status(500).json({ error: error.message });
  }
};


//get all group attendance
const getAllGroupAttendances = async(req, res) => {
  try {
       const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const { groupId } = req.params;
  const query = { group: groupId };
  
    if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
        query.church = req.user.church
    }

    const attendances = await Attendance.find(query)
      .select("date numberOfAttendees mainSpeaker activity")
          .populate("group", "name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean();
    
        // COUNT TOTAL VISITORS
        const totalGroupAttendances = await Attendance.countDocuments(query);

       // IF NO RESULTS
    if (!attendances || attendances.length === 0) {
      return res.status(200).json({
        message: "No attendance found.",
        stats: {
          totalGroupAttendances: 0
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
    const totalPages = Math.ceil(totalGroupAttendances / limitNum);

    const pagination = {
      totalResult: totalGroupAttendances,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    };

    res.status(200).json({
      message: "All group attendances",
      stats: {
        totalGroupAttendances,
      },
      pagination,
      count: attendances.length,
      attendances
    })


  } catch (error) {
    console.log("could not record attendance", error)
    return res.status(500).json({ error: error.message });
  }
}



//update group attendance

const updateGroupAttendance = async(req, res) => {
  try {
    const { groupId, attendanceId } = req.params;


    const query = {_id: attendanceId, group: groupId}

    if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
        query.church = req.user.church
    }

const group = await Group.findOne({ _id: groupId });
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const attendance = await Attendance.findOneAndUpdate( query, req.body, {
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
}


//delete group attendance

const deleteGroupAttendance = async(req, res) => {
    try {
      const {groupId, attendanceId} = req.params;

const query = { _id: attendanceId, group: groupId };

      if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
          query.church = req.user.church  
      }

      const group = await Group.findOne({_id: groupId});
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // 2. Delete attendance belonging to that group
    const groupAttendance = await Attendance.findOneAndDelete(query);

      if(!groupAttendance) {
          return res.status(404).json({message: "attendance not found"})
      }
      return res.status(200).json({message: "attendance deleted successfully", groupAttendance})

    } catch (error) {
      console.log("could not delete attendance", error)
    return res.status(500).json({ error: error.message });
    }
}


export {createGroupAttendance, updateGroupAttendance, deleteGroupAttendance, getAllGroupAttendances}