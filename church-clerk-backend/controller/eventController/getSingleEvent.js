import Event from "../../models/eventModel.js";

// GET SINGLE
const getSingleEvent = async (req, res) => {
  try {

    const {dateFrom, dateTo} = req.query
    const eventId = req.params.id;
    const query = { _id: eventId };

    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.user.church;
    }

    const event = await Event.findOne(query)
      .populate("church", "name")
      .populate("cell", "name")
      .populate("group", "name")
      .populate("department", "name");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const today = new Date();
    let status = "unknown";
    if (event.dateFrom && event.dateTo) {
      if (event.dateFrom > today) status = "upcoming";
      else if (event.dateTo < today) status = "past";
      else status = "ongoing";
    }

    return res.status(200).json({
      message: "Event retrieved successfully",
      event: { ...event.toObject(), status,     attendeeCount: event.attendees.length}
    });
  } catch (error) {
    console.error("Get single event error:", error);
    return res.status(500).json({ message: "Failed to retrieve event", error: error.message });
  }
};

export default getSingleEvent;