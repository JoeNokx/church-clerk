import Event from "../../models/eventModel.js";


// DELETE
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: id };

    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch?._id || req.user.church;
    }

    const event = await Event.findOneAndDelete(query);

    if (!event) {
      return res.status(404).json({ message: "Event not found or access denied" });
    }

    return res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Delete event error:", error);
    return res.status(500).json({ message: "Failed to delete event", error: error.message });
  }
};

export default deleteEvent ;