import Event from "../../models/eventModel.js";
import EventAttendees from "../../models/eventModel/eventAttendeesModel.js";
import TotalEventAttendance from "../../models/eventModel/totalEventAttendance.js";

// GET SINGLE
const getSingleEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const query = { _id: eventId };

    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    const event = await Event.findOne(query)
      .populate("church", "name")
      .populate("cell", "name")
      .populate("group", "name")
      .populate("department", "name");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    let status = "unknown";
    if (event.dateFrom && event.dateTo) {
      if (event.dateFrom > now) status = "upcoming";
      else if (event.dateTo < now) status = "past";
      else status = "ongoing";
    } else if (event.dateFrom) {
      if (event.dateFrom >= tomorrowStart) status = "upcoming";
      else if (event.dateFrom < todayStart) status = "past";
      else status = "ongoing";
    }

    const attendeeCount = await EventAttendees.countDocuments({ church: event.church, event: eventId });
    const totalAttendanceRecords = await TotalEventAttendance.countDocuments({ church: event.church, event: eventId });

    return res.status(200).json({
      message: "Event retrieved successfully",
      event: { ...event.toObject(), status, attendeeCount, totalAttendanceRecords }
    });
  } catch (error) {
    console.error("Get single event error:", error);
    return res.status(500).json({ message: "Failed to retrieve event", error: error.message });
  }
};

export default getSingleEvent;