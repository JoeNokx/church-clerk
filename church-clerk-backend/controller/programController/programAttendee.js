import Program from "../../models/programModel.js";
import ProgramAttendees from "../../models/programModel/programAttendeesModel.js";

import { validatePhoneNumber } from "../../utils/validatePhoneNumber.js";

// POST: register attendee to program
const createProgramAttendee = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, location } = req.body;
    const { programId } = req.params;

    if (!fullName) {
      return res.status(400).json({ message: "Full name is required." });
    }

    const query = { _id: programId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }


    const program = await Program.findOne(query);
    if (!program) return res.status(404).json({ message: "Program not found." });


    let validatedPhoneNumber;
    if (phoneNumber !== undefined) {
      const rawPhone = String(phoneNumber || "").trim();
      if (rawPhone) {
        try {
          validatedPhoneNumber = validatePhoneNumber(rawPhone, "GH");
        } catch (e) {
          return res.status(400).json({ message: e?.message || "Invalid phone number" });
        }
      } else {
        validatedPhoneNumber = "";
      }
    }

    const attendees = await ProgramAttendees.create({ 
      fullName,
       email,
        phoneNumber: validatedPhoneNumber, 
       location,
       event: programId,
      church: program.church,
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




const getProgramAttendees = async(req, res) => {
  try {
       const { page = 1, limit = 10 } = req.query;
       const { programId } = req.params;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const programQuery = { _id: programId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      programQuery.church = req.activeChurch._id;
    }

    const program = await Program.findOne(programQuery);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const query = { church: program.church, event: programId };

    const attendees = await ProgramAttendees.find(query)
      .select("fullName email phoneNumber location")
          .populate("event", "name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean();
    
        // COUNT TOTAL VISITORS
        const totalProgramAttendees = await ProgramAttendees.countDocuments(query);

       // IF NO RESULTS
    if (!attendees || attendees.length === 0) {
      return res.status(200).json({
        message: "No attendee found.",
        stats: {
          totalProgramAttendees: 0
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
    const totalPages = Math.ceil(totalProgramAttendees / limitNum);

    const pagination = {
      totalResult: totalProgramAttendees,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    };

    res.status(200).json({
      message: "All program attendances",
      stats: {
        totalProgramAttendees,
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
const updateProgramAttendee = async (req, res) => {
  try {
    const { programId, attendeeId } = req.params;

    const programQuery = { _id: programId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      programQuery.church = req.activeChurch._id;
    }

    const program = await Program.findOne(programQuery);
    if (!program) return res.status(404).json({ message: "Program not found." });

    if (req.body?.phoneNumber !== undefined) {
      const rawPhone = String(req.body.phoneNumber || "").trim();
      if (rawPhone) {
        try {
          req.body.phoneNumber = validatePhoneNumber(rawPhone, "GH");
        } catch (e) {
          return res.status(400).json({ message: e?.message || "Invalid phone number" });
        }
      } else {
        req.body.phoneNumber = "";
      }
    }

    const query = { _id: attendeeId, event: programId, church: program.church };
    const attendee = await ProgramAttendees.findOneAndUpdate(query, req.body, {
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




const deleteProgramAttendee = async (req, res) => {
  try {
    const { programId, attendeeId } = req.params;

    const programQuery = { _id: programId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      programQuery.church = req.activeChurch._id;
    }

    const program = await Program.findOne(programQuery);
    if (!program) return res.status(404).json({ message: "Program not found." });

    const query = { _id: attendeeId, event: programId, church: program.church };

    const attendee = await ProgramAttendees.findOneAndDelete(query);
    if (!attendee) return res.status(404).json({ message: "Attendee not found." });

    return res.status(200).json({ message: "Attendee removed successfully.", attendee });

  } catch (error) {
    return res.status(500).json({ message: "Error removing attendee", error: error.message });
  }
};



export {createProgramAttendee, getProgramAttendees, updateProgramAttendee, deleteProgramAttendee};
