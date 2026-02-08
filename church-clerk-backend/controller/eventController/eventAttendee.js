import Event from "../../models/eventModel.js";
import EventAttendees from "../../models/eventModel/eventAttendeesModel.js";

// POST: register attendee to event
const createEventAttendee = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, location } = req.body;
    const { eventId } = req.params;

    if (!fullName) {
      return res.status(400).json({ message: "Full name is required." });
    }

    const query = { _id: eventId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }


    const event = await Event.findOne(query);
    if (!event) return res.status(404).json({ message: "Event not found." });


    const attendees = await EventAttendees.create({ 
      fullName,
       email,
        phoneNumber, 
       location,
       event: eventId,
      church: event.church,
      createdBy: req.user._id
     });

    return res.status(201).json({
      message: "Attendee registered successfully.",
      attendees 
    });

  } catch (error) {
    return res.status(500).json({ message: "Error registering attendee", error: error.message });
  }
};




const getEventAttendees = async(req, res) => {
  try {
       const { page = 1, limit = 10 } = req.query;
       const { eventId } = req.params;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const eventQuery = { _id: eventId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      eventQuery.church = req.activeChurch._id;
    }

    const event = await Event.findOne(eventQuery);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const query = { church: event.church, event: eventId };

    const attendees = await EventAttendees.find(query)
      .select("fullName email phoneNumber location")
          .populate("event", "name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean();
    
        // COUNT TOTAL VISITORS
        const totalEventAttendees = await EventAttendees.countDocuments(query);

       // IF NO RESULTS
    if (!attendees || attendees.length === 0) {
      return res.status(200).json({
        message: "No attendee found.",
        stats: {
          totalEventAttendees: 0
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
        attendees: [],
      });
    }

    // PAGINATION DETAILS
    const totalPages = Math.ceil(totalEventAttendees / limitNum);

    const pagination = {
      totalResult: totalEventAttendees,
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
        totalEventAttendees,
      },
      pagination,
      count: attendees.length,
      attendees
    })


  } catch (error) {
    console.log("could not record attendance", error)
    return res.status(500).json({ error: error.message });
  }
}




//PUT: update attendee
const updateEventAttendee = async (req, res) => {
  try {
    const { eventId, attendeeId } = req.params;

    const eventQuery = { _id: eventId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      eventQuery.church = req.activeChurch._id;
    }

    const event = await Event.findOne(eventQuery);
    if (!event) return res.status(404).json({ message: "Event not found." });

    const query = { _id: attendeeId, event: eventId, church: event.church };
    const attendee = await EventAttendees.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true
    });

    if (!attendee) {
      return res.status(404).json({ message: "Attendee not found." });
    }

    return res.status(200).json({
      message: "Attendee updated successfully.",
      attendee
    });
  } catch (error) {
    return res.status(500).json({ message: "Error updating attendee", error: error.message });
  }
};




const deleteEventAttendee = async (req, res) => {
  try {
    const { eventId, attendeeId } = req.params;

    const eventQuery = { _id: eventId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      eventQuery.church = req.activeChurch._id;
    }

    const event = await Event.findOne(eventQuery);
    if (!event) return res.status(404).json({ message: "Event not found." });

    const query = { _id: attendeeId, event: eventId, church: event.church };

    const attendee = await EventAttendees.findOneAndDelete(query);
    if (!attendee) return res.status(404).json({ message: "Attendee not found." });

    return res.status(200).json({ message: "Attendee removed successfully.", attendee });

  } catch (error) {
    return res.status(500).json({ message: "Error removing attendee", error: error.message });
  }
};



export {createEventAttendee, getEventAttendees, updateEventAttendee, deleteEventAttendee};
