import Event from "../../models/eventModel.js";
import totalEventAttendance from "../../models/eventModel/totalEventAttendance.js";

const createTotalEventAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { date, numberOfAttendees, mainSpeaker } = req.body;

    // 1. Validate group exists and belongs to this church
    const eventQuery = { _id: eventId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      eventQuery.church = req.activeChurch?._id || req.user.church;
    }

    const event = await Event.findOne(eventQuery);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const attendance = await totalEventAttendance.create({
      event: eventId,
      church: req.activeChurch?._id || req.user.church,
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
const getAllTotalEventAttendances = async(req, res) => {
  try {
       const { page = 1, limit = 10 } = req.query;
       const { eventId } = req.params;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const eventQuery = { _id: eventId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      eventQuery.church = req.activeChurch?._id || req.user.church;
    }

    const event = await Event.findOne(eventQuery);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const query = { church: req.activeChurch?._id || req.user.church, event: eventId };

    const attendances = await totalEventAttendance.find(query)
      .select("date numberOfAttendees mainSpeaker")
          .populate("event", "name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean();
    
        // COUNT TOTAL VISITORS
        const totalEventAttendances = await totalEventAttendance.countDocuments(query);

       // IF NO RESULTS
    if (!attendances || attendances.length === 0) {
      return res.status(200).json({
        message: "No attendance found.",
        stats: {
          totalEventAttendances: 0
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
    const totalPages = Math.ceil(totalEventAttendances / limitNum);

    const pagination = {
      totalResult: totalEventAttendances,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    };

    res.status(200).json({
      message: "All event attendances",
      stats: {
        totalEventAttendances,
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

const updateTotalEventAttendance = async(req, res) => {
  try {
   const {eventId, attendanceId} = req.params;

    const query = {_id: attendanceId, event: eventId}

    if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
        query.church = req.activeChurch?._id || req.user.church
    }

    const eventQuery = { _id: eventId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      eventQuery.church = req.activeChurch?._id || req.user.church;
    }

    const event = await Event.findOne(eventQuery);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const attendance = await totalEventAttendance.findOneAndUpdate(query, req.body, {
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

const deleteTotalEventAttendance = async(req, res) => {
    try {
       const {eventId, attendanceId} = req.params;

    const query = {_id: attendanceId, event: eventId}

      if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
          query.church = req.activeChurch?._id || req.user.church  
      }

      const eventQuery = { _id: eventId };
      if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
        eventQuery.church = req.activeChurch?._id || req.user.church;
      }

      const event = await Event.findOne(eventQuery);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const attendance = await totalEventAttendance.findOneAndDelete(query)

      if(!attendance) {
          return res.status(404).json({message: "attendance not found"})
      }
      return res.status(200).json({message: "attendance deleted successfully", attendance})

    } catch (error) {
      console.log("could not delete attendance", error)
    return res.status(500).json({ error: error.message });
    }
}


export {
    createTotalEventAttendance,
    getAllTotalEventAttendances,
    updateTotalEventAttendance,
    deleteTotalEventAttendance
}