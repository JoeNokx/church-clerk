import Event from "../../models/eventModel.js";



// UPDATE
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: id };

    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.user.church;
    }

    const event = await Event.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true
    })
    .populate("church", "name")
      .populate("cell", "name")
      .populate("group", "name")
      .populate("department", "name");

    if (!event) {
      return res.status(404).json({ message: "Event not found or access denied" });
    }

    return res.status(200).json({ message: "Event updated successfully", event });
  } catch (error) {
    console.error("Update event error:", error);
    return res.status(500).json({ message: "Failed to update event", error: error.message });
  }
};

export default updateEvent ;