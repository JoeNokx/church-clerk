import crypto from "crypto";
import Program from "../../models/programModel.js";
import ProgramAttendees from "../../models/programModel/programAttendeesModel.js";
import Member from "../../models/memberModel.js";
import Visitor from "../../models/visitorsModel.js";

import { validatePhoneNumber } from "../../utils/validatePhoneNumber.js";
import { isSystemViewer } from "../../utils/resolvePermissions.js";

// A program guest is also a church visitor — find-or-create by phone so the
// same person isn't tracked twice (follow-ups, future visits, member search).
const resolveGuestVisitor = async ({ church, createdBy, fullName, phoneNumber, email, location }) => {
  const digits = String(phoneNumber || "").replace(/\D/g, "");
  const suffix = digits.slice(-9);
  let visitor = suffix.length >= 7
    ? await Visitor.findOne({ church, phoneNumber: { $regex: `${suffix}$` } })
    : await Visitor.findOne({ church, phoneNumber });
  if (visitor) return visitor;
  return await Visitor.create({
    church,
    createdBy,
    fullName: String(fullName || "").trim(),
    phoneNumber,
    email: email || "",
    location: location || "Not specified",
    source: "program"
  });
};

// POST: register attendee to program
const createProgramAttendee = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, location, registrationDate, attendeeType, heardAbout, member } = req.body;
    const { programId } = req.params;

    if (!fullName) {
      return res.status(400).json({ message: "Full name is required." });
    }

    const query = { _id: programId };
    if (!isSystemViewer(req)) {
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
       registrationDate: registrationDate || undefined,
       attendeeType: attendeeType === "guest" ? "guest" : "member",
       heardAbout: heardAbout ? String(heardAbout).trim() : undefined,
       member: member || undefined,
       visitor: attendeeType === "guest" ? (await resolveGuestVisitor({ church: program.church, createdBy: req.user._id, fullName, phoneNumber: validatedPhoneNumber, email, location }))._id : undefined,
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
    if (!isSystemViewer(req)) {
      programQuery.church = req.activeChurch._id;
    }

    const program = await Program.findOne(programQuery);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const query = { church: program.church, event: programId };

    const attendees = await ProgramAttendees.find(query)
      .select("fullName email phoneNumber location registrationDate registeredInAdvance present attendeeType heardAbout member visitor createdAt")
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
    if (!isSystemViewer(req)) {
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
    if (!isSystemViewer(req)) {
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



// ── Advance registration (link + QR) — per program, independent tokens ──
const makeAdvanceRegHandlers = (field, activeField) => ({
  status: async (req, res) => {
    try {
      const program = await Program.findOne({ _id: req.params.programId, church: req.activeChurch._id }).select(`${field} ${activeField}`).lean();
      if (!program) return res.status(404).json({ message: "Program not found." });
      return res.status(200).json({ token: program[activeField] ? program[field] : null, active: program[activeField] || false });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
  generate: async (req, res) => {
    try {
      const token = crypto.randomBytes(24).toString("hex");
      const program = await Program.findOneAndUpdate(
        { _id: req.params.programId, church: req.activeChurch._id },
        { [field]: token, [activeField]: true },
        { new: true }
      );
      if (!program) return res.status(404).json({ message: "Program not found." });
      return res.status(200).json({ message: "Advance registration generated", token, active: true });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
  revoke: async (req, res) => {
    try {
      const program = await Program.findOneAndUpdate(
        { _id: req.params.programId, church: req.activeChurch._id },
        { $unset: { [field]: 1 }, $set: { [activeField]: false } },
        { new: true }
      );
      if (!program) return res.status(404).json({ message: "Program not found." });
      return res.status(200).json({ message: "Advance registration revoked" });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
});

const advanceRegLink = makeAdvanceRegHandlers("advanceRegLinkToken", "advanceRegLinkActive");
const advanceRegQr = makeAdvanceRegHandlers("advanceRegQrToken", "advanceRegQrActive");
const checkInLink = makeAdvanceRegHandlers("checkInLinkToken", "checkInLinkActive");
const checkInQr = makeAdvanceRegHandlers("checkInQrToken", "checkInQrActive");

const findProgramByCheckInToken = (token, select = "_id") =>
  Program.findOne({
    $or: [
      { checkInLinkToken: token, checkInLinkActive: true },
      { checkInQrToken: token, checkInQrActive: true }
    ]
  }).select(select).populate("church", "name").lean();

const findProgramByAdvanceToken = (token, select = "_id") =>
  Program.findOne({
    $or: [
      { advanceRegLinkToken: token, advanceRegLinkActive: true },
      { advanceRegQrToken: token, advanceRegQrActive: true }
    ]
  }).select(select).populate("church", "name").lean();

const getAdvanceRegInfo = async (req, res) => {
  try {
    const program = await findProgramByAdvanceToken(req.params.token, "title description dateFrom dateTo time venue church");
    if (!program) return res.status(404).json({ message: "Registration link is invalid or has been revoked." });
    return res.status(200).json({
      program: {
        title: program.title,
        description: program.description,
        dateFrom: program.dateFrom,
        dateTo: program.dateTo,
        time: program.time,
        venue: program.venue,
        church: program.church
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong. Please try again.", error: error.message });
  }
};

const advanceRegisterAttendee = async (req, res) => {
  try {
    const program = await findProgramByAdvanceToken(req.params.token, "church createdBy");
    if (!program) return res.status(404).json({ message: "Registration link is invalid or has been revoked." });

    const { fullName, email, phoneNumber, location, attendeeType, memberId, heardAbout } = req.body;
    const isGuest = attendeeType === "guest";

    let resolvedName = String(fullName || "").trim();
    let resolvedPhone = String(phoneNumber || "").trim();
    let resolvedMemberId;

    if (!isGuest) {
      if (!memberId) return res.status(400).json({ message: "Please select your name from the search results." });
      const member = await Member.findOne({ _id: memberId, church: program.church }).select("firstName lastName phoneNumber").lean();
      if (!member) return res.status(404).json({ message: "Member not found." });
      resolvedName = [member.firstName, member.lastName].filter(Boolean).join(" ");
      resolvedPhone = member.phoneNumber || resolvedPhone;
      resolvedMemberId = member._id;
    }

    if (!resolvedName) return res.status(400).json({ message: "Full name is required." });
    if (!resolvedPhone) return res.status(400).json({ message: "Phone number is required." });

    let validatedPhone;
    try {
      validatedPhone = validatePhoneNumber(resolvedPhone, "GH");
    } catch (e) {
      return res.status(400).json({ message: e?.message || "Invalid phone number." });
    }

    const dupe = await ProgramAttendees.findOne({ event: program._id, phoneNumber: validatedPhone }).lean();
    if (dupe) return res.status(409).json({ message: "You are already registered for this program." });

    await ProgramAttendees.create({
      church: program.church,
      createdBy: program.createdBy,
      event: program._id,
      fullName: resolvedName,
      email: email ? String(email).trim().toLowerCase() : undefined,
      phoneNumber: validatedPhone,
      location: location ? String(location).trim() : undefined,
      attendeeType: isGuest ? "guest" : "member",
      heardAbout: isGuest && heardAbout ? String(heardAbout).trim() : undefined,
      member: resolvedMemberId,
      visitor: isGuest ? (await resolveGuestVisitor({ church: program.church, createdBy: program.createdBy, fullName: resolvedName, phoneNumber: validatedPhone, email, location }))._id : undefined,
      registeredInAdvance: true,
      present: false
    });

    return res.status(201).json({ message: "Registration successful! See you at the program." });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed. Please try again.", error: error.message });
  }
};

const getCheckInInfo = async (req, res) => {
  try {
    const program = await findProgramByCheckInToken(req.params.token, "title description dateFrom dateTo time venue church");
    if (!program) return res.status(404).json({ message: "Check-in link is invalid or has been revoked." });
    return res.status(200).json({
      program: {
        title: program.title,
        description: program.description,
        dateFrom: program.dateFrom,
        dateTo: program.dateTo,
        time: program.time,
        venue: program.venue,
        church: program.church
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong. Please try again.", error: error.message });
  }
};

const selfCheckInAttendee = async (req, res) => {
  try {
    const program = await findProgramByCheckInToken(req.params.token, "church createdBy");
    if (!program) return res.status(404).json({ message: "Check-in link is invalid or has been revoked." });

    const { fullName, email, phoneNumber, location, attendeeType, memberId, heardAbout } = req.body;
    const isGuest = attendeeType === "guest";

    let resolvedName = String(fullName || "").trim();
    let resolvedPhone = String(phoneNumber || "").trim();
    let resolvedMemberId;

    if (!isGuest) {
      if (!memberId) return res.status(400).json({ message: "Please select your name from the search results." });
      const member = await Member.findOne({ _id: memberId, church: program.church }).select("firstName lastName phoneNumber").lean();
      if (!member) return res.status(404).json({ message: "Member not found." });
      resolvedName = [member.firstName, member.lastName].filter(Boolean).join(" ");
      resolvedPhone = member.phoneNumber || resolvedPhone;
      resolvedMemberId = member._id;
    }

    if (!resolvedName) return res.status(400).json({ message: "Full name is required." });
    if (!resolvedPhone) return res.status(400).json({ message: "Phone number is required." });

    let validatedPhone;
    try {
      validatedPhone = validatePhoneNumber(resolvedPhone, "GH");
    } catch (e) {
      return res.status(400).json({ message: e?.message || "Invalid phone number." });
    }

    const existing = await ProgramAttendees.findOne({ event: program._id, phoneNumber: validatedPhone });
    if (existing) {
      if (existing.present) return res.status(409).json({ message: "You are already marked present for this program." });
      existing.present = true;
      await existing.save();
      return res.status(200).json({ message: "Checked in! Your advance registration is confirmed — you're marked present." });
    }

    await ProgramAttendees.create({
      church: program.church,
      createdBy: program.createdBy,
      event: program._id,
      fullName: resolvedName,
      email: email ? String(email).trim().toLowerCase() : undefined,
      phoneNumber: validatedPhone,
      location: location ? String(location).trim() : undefined,
      attendeeType: isGuest ? "guest" : "member",
      heardAbout: isGuest && heardAbout ? String(heardAbout).trim() : undefined,
      member: resolvedMemberId,
      visitor: isGuest ? (await resolveGuestVisitor({ church: program.church, createdBy: program.createdBy, fullName: resolvedName, phoneNumber: validatedPhone, email, location }))._id : undefined,
      registeredInAdvance: false,
      present: true
    });

    return res.status(201).json({ message: "Checked in! You're marked present for this program." });
  } catch (error) {
    return res.status(500).json({ message: "Check-in failed. Please try again.", error: error.message });
  }
};

const ensureGuestVisitor = async (req, res) => {
  try {
    const { programId, attendeeId } = req.params;
    const programQuery = { _id: programId };
    if (!isSystemViewer(req)) programQuery.church = req.activeChurch._id;
    const program = await Program.findOne(programQuery);
    if (!program) return res.status(404).json({ message: "Program not found." });

    const attendee = await ProgramAttendees.findOne({ _id: attendeeId, event: programId, church: program.church });
    if (!attendee) return res.status(404).json({ message: "Attendee not found." });
    if (attendee.attendeeType !== "guest") return res.status(400).json({ message: "Follow-ups are only available for guests." });

    if (attendee.visitor) {
      const v = await Visitor.findById(attendee.visitor).select("fullName phoneNumber email location").lean();
      if (v) return res.status(200).json({ visitor: v });
      attendee.visitor = undefined;
    }

    const visitor = await resolveGuestVisitor({
      church: program.church,
      createdBy: req.user._id,
      fullName: attendee.fullName,
      phoneNumber: attendee.phoneNumber,
      email: attendee.email,
      location: attendee.location
    });
    attendee.visitor = visitor._id;
    await attendee.save();
    return res.status(200).json({
      visitor: { _id: visitor._id, fullName: visitor.fullName, phoneNumber: visitor.phoneNumber, email: visitor.email, location: visitor.location }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const searchProgramGuests = async (req, res) => {
  try {
    const q = String(req.query.search || "").trim();
    if (q.length < 2) return res.status(200).json({ guests: [] });

    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const rows = await ProgramAttendees.find({
      church: req.activeChurch._id,
      attendeeType: "guest",
      $or: [{ fullName: rx }, { phoneNumber: rx }]
    }).select("fullName phoneNumber email location event").limit(15).lean();

    const seen = new Map();
    for (const g of rows) {
      const key = String(g.phoneNumber || "").replace(/\D/g, "").slice(-9) || String(g._id);
      if (!seen.has(key)) seen.set(key, g);
    }

    return res.status(200).json({ guests: [...seen.values()].slice(0, 8) });
  } catch (error) {
    return res.status(500).json({ message: "Search failed.", error: error.message });
  }
};

const searchAdvanceRegMembers = async (req, res) => {
  try {
    const program = (await findProgramByAdvanceToken(req.params.token, "church")) || (await findProgramByCheckInToken(req.params.token, "church"));
    if (!program) return res.status(404).json({ message: "Link is invalid or has been revoked." });

    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.status(200).json({ members: [] });

    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const members = await Member.find({
      church: program.church,
      $or: [{ firstName: rx }, { lastName: rx }, { phoneNumber: rx }]
    }).select("firstName lastName phoneNumber email streetAddress city").limit(8).lean();

    return res.status(200).json({
      members: members.map((m) => ({
        _id: m._id,
        fullName: [m.firstName, m.lastName].filter(Boolean).join(" "),
        phoneNumber: m.phoneNumber || "",
        email: m.email || "",
        location: [m.streetAddress, m.city].filter(Boolean).join(", ")
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: "Search failed.", error: error.message });
  }
};

export {createProgramAttendee, getProgramAttendees, updateProgramAttendee, deleteProgramAttendee, advanceRegLink, advanceRegQr, getAdvanceRegInfo, advanceRegisterAttendee, searchAdvanceRegMembers, checkInLink, checkInQr, getCheckInInfo, selfCheckInAttendee, ensureGuestVisitor, searchProgramGuests};
