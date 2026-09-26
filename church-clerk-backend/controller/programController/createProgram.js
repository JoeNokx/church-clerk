import Program from "../../models/programModel.js";



// CREATE
const createProgram = async (req, res) => {
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

    const program = await Program.create({
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
    console.log("program created successfully:", program);
    return res.status(201).json({ message: "Program created successfully.", program });
  } catch (error) {
    console.error("Create program error:", error);
    return res.status(400).json({ message: "Program could not be created.", error: error.message });
  }
};

export default createProgram;
