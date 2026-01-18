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
      time,
      venue, 
      status
    } = req.body;

    if (!title || !dateFrom || !venue) {
      return res.status(400).json({ message: "Title, Date and Venue are required." });
    }

    const event = await Event.create({
      title,
      category,
      description,
      cell,
      group,
      department,
      organizers,
      dateFrom,
      dateTo,
      time,
      venue,
      status,
      church: req.user.church,
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
