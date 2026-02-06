import Event from "../../models/eventModel.js";

// UPDATE
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: id };

    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch?._id || req.user.church;
    }

    const body = { ...(req.body || {}) };

    if (body.organizers !== undefined) {
      const safeOrganizer =
        typeof body.organizers === "string"
          ? body.organizers.trim()
          : Array.isArray(body.organizers)
            ? String(body.organizers[0] || "").trim()
            : "";
      body.organizers = safeOrganizer ? [safeOrganizer] : [];
    }

    const safeTimeFrom = typeof body.timeFrom === "string" ? body.timeFrom.trim() : "";
    const safeTimeTo = typeof body.timeTo === "string" ? body.timeTo.trim() : "";

    if ((safeTimeFrom || safeTimeTo) && !body.time) {
      body.time =
        safeTimeFrom && safeTimeTo
          ? `${safeTimeFrom} - ${safeTimeTo}`
          : safeTimeFrom || safeTimeTo;
    }

    if (body.timeFrom !== undefined) body.timeFrom = safeTimeFrom || undefined;
    if (body.timeTo !== undefined) body.timeTo = safeTimeTo || undefined;

    const event = await Event.findOneAndUpdate(query, body, {
      new: true,
      runValidators: true
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found or access denied" });
    }

    return res.status(200).json({ message: "Event updated successfully", event });
  } catch (error) {
    console.error("Update event error:", error);
    return res.status(500).json({ message: "Failed to update event", error: error.message });
  }
};

export default updateEvent;