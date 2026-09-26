import Program from "../../models/programModel.js";
import ProgramOffering from "../../models/programModel/programOfferingModel.js";

async function getScopedProgram(req) {
  const { programId } = req.params;
  const query = { _id: programId };

  if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
    query.church = req.activeChurch._id;
  }

  return await Program.findOne(query).lean();
}

const createProgramOffering = async (req, res) => {
  try {
    const program = await getScopedProgram(req);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const churchId = program?.church?._id || program?.church;

    const { offeringType, offeringDate, amount, note } = req.body || {};

    if (!offeringDate || isNaN(Date.parse(offeringDate))) {
      return res.status(400).json({ message: "Valid offeringDate is required" });
    }

    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    if (!offeringType) {
      return res.status(400).json({ message: "offeringType is required" });
    }

    const doc = await ProgramOffering.create({
      church: churchId,
      createdBy: req.user._id,
      event: program._id,
      offeringType,
      offeringDate,
      amount: Number(amount),
      note: typeof note === "string" ? note.trim() : undefined
    });

    return res.status(201).json({ message: "Program offering recorded successfully", offering: doc });
  } catch (error) {
    console.error("Create program offering error:", error);
    return res.status(500).json({ message: "Program offering could not be recorded", error: error.message });
  }
};

const getProgramOfferings = async (req, res) => {
  try {
    const program = await getScopedProgram(req);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const churchId = program?.church?._id || program?.church;

    const { page = 1, limit = 10, offeringType, search, dateFrom, dateTo } = req.query;

    if (dateFrom && isNaN(Date.parse(dateFrom))) {
      return res.status(400).json({ message: "Invalid dateFrom" });
    }

    if (dateTo && isNaN(Date.parse(dateTo))) {
      return res.status(400).json({ message: "Invalid dateTo" });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query = { church: churchId, event: program._id };

    if (offeringType) query.offeringType = offeringType;

    if (search) {
      const User = (await import("../../models/userModel.js")).default;
      const matchingUsers = await User.find({ fullName: { $regex: search, $options: "i" } }, "_id").lean();
      if (matchingUsers.length) {
        query.createdBy = { $in: matchingUsers.map(u => u._id) };
      } else {
        query.createdBy = { $in: [] };
      }
    }

    if (dateFrom || dateTo) {
      query.offeringDate = {};

      if (dateFrom) {
        const start = new Date(dateFrom);
        start.setHours(0, 0, 0, 0);
        query.offeringDate.$gte = start;
      }

      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.offeringDate.$lte = end;
      }
    }

    const offerings = await ProgramOffering.find(query)
      .populate("createdBy", "fullName")
      .sort({ offeringDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await ProgramOffering.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    const pagination = {
      totalResult: total,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null
    };

    return res.status(200).json({
      message: "Program offerings fetched successfully",
      pagination,
      count: offerings.length,
      offerings
    });
  } catch (error) {
    console.error("Get program offerings error:", error);
    return res.status(500).json({ message: "Program offerings could not be fetched", error: error.message });
  }
};

const updateProgramOffering = async (req, res) => {
  try {
    const program = await getScopedProgram(req);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const churchId = program?.church?._id || program?.church;

    const { offeringId } = req.params;

    const query = { _id: offeringId, church: churchId, event: program._id };

    const body = { ...(req.body || {}) };

    if (body.offeringDate !== undefined) {
      if (!body.offeringDate || isNaN(Date.parse(body.offeringDate))) {
        return res.status(400).json({ message: "Valid offeringDate is required" });
      }
    }

    if (body.amount !== undefined) {
      if (body.amount === null || body.amount === "" || Number(body.amount) <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }
      body.amount = Number(body.amount);
    }

    if (body.note !== undefined) {
      body.note = typeof body.note === "string" ? body.note.trim() : "";
    }

    const doc = await ProgramOffering.findOneAndUpdate(query, body, { new: true, runValidators: true });

    if (!doc) {
      return res.status(404).json({ message: "Offering not found" });
    }

    return res.status(200).json({ message: "Program offering updated successfully", offering: doc });
  } catch (error) {
    console.error("Update program offering error:", error);
    return res.status(500).json({ message: "Program offering could not be updated", error: error.message });
  }
};

const deleteProgramOffering = async (req, res) => {
  try {
    const program = await getScopedProgram(req);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const churchId = program?.church?._id || program?.church;

    const { offeringId } = req.params;

    const query = { _id: offeringId, church: churchId, event: program._id };
    const doc = await ProgramOffering.findOneAndDelete(query);

    if (!doc) {
      return res.status(404).json({ message: "Offering not found" });
    }

    return res.status(200).json({ message: "Program offering deleted successfully", offering: doc });
  } catch (error) {
    console.error("Delete program offering error:", error);
    return res.status(500).json({ message: "Program offering could not be deleted", error: error.message });
  }
};

export { createProgramOffering, getProgramOfferings, updateProgramOffering, deleteProgramOffering };
