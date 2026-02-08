import Event from "../../models/eventModel.js";



// CREATE
const createEvent = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      cell,
      group,
      department,
      organizers,
      dateFrom,
      dateTo,
      timeFrom,
      timeTo,
      time,
      venue, 
      status
    } = req.body;

    if (!title || !dateFrom || !venue) {
      return res.status(400).json({ message: "Title, Date and Venue are required." });
    }

    const safeTimeFrom = typeof timeFrom === "string" ? timeFrom.trim() : "";
    const safeTimeTo = typeof timeTo === "string" ? timeTo.trim() : "";
    const computedTime =
      safeTimeFrom && safeTimeTo
        ? `${safeTimeFrom} - ${safeTimeTo}`
        : safeTimeFrom || safeTimeTo || (typeof time === "string" ? time.trim() : "");

    const safeOrganizer =
      typeof organizers === "string"
        ? organizers.trim()
        : Array.isArray(organizers)
          ? String(organizers[0] || "").trim()
          : "";

    const event = await Event.create({
      title,
      category,
      description,
      cell,
      group,
      department,
      organizers: safeOrganizer ? [safeOrganizer] : undefined,
      dateFrom,
      dateTo,
      timeFrom: safeTimeFrom || undefined,
      timeTo: safeTimeTo || undefined,
      time: computedTime || undefined,
      venue,
      status,
      church: req.activeChurch._id,
      createdBy: req.user._id
    });

    // Log then return (no unreachable code after return)
    console.log("event created successfully:", event);
    return res.status(201).json({ message: "Event created successfully.", event });
  } catch (error) {
    console.error("Create event error:", error);
    return res.status(400).json({ message: "Event could not be created.", error: error.message });
  }
};

export default createEvent;
