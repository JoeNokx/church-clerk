import Event from "../../models/eventModel.js";
import EventOffering from "../../models/eventModel/eventOfferingModel.js";

async function getScopedEvent(req) {
  const { eventId } = req.params;
  const query = { _id: eventId };

  if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
    query.church = req.activeChurch._id;
  }

  return await Event.findOne(query).lean();
}

const createEventOffering = async (req, res) => {
  try {
    const event = await getScopedEvent(req);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const churchId = event?.church?._id || event?.church;

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

    const doc = await EventOffering.create({
      church: churchId,
      createdBy: req.user._id,
      event: event._id,
      offeringType,
      offeringDate,
      amount: Number(amount),
      note: typeof note === "string" ? note.trim() : undefined
    });

    return res.status(201).json({ message: "Event offering recorded successfully", offering: doc });
  } catch (error) {
    console.error("Create event offering error:", error);
    return res.status(500).json({ message: "Event offering could not be recorded", error: error.message });
  }
};

const getEventOfferings = async (req, res) => {
  try {
    const event = await getScopedEvent(req);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const churchId = event?.church?._id || event?.church;

    const { page = 1, limit = 10, offeringType, dateFrom, dateTo } = req.query;

    if (dateFrom && isNaN(Date.parse(dateFrom))) {
      return res.status(400).json({ message: "Invalid dateFrom" });
    }

    if (dateTo && isNaN(Date.parse(dateTo))) {
      return res.status(400).json({ message: "Invalid dateTo" });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query = { church: churchId, event: event._id };

    if (offeringType) query.offeringType = offeringType;

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

    const offerings = await EventOffering.find(query)
      .sort({ offeringDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await EventOffering.countDocuments(query);
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
      message: "Event offerings fetched successfully",
      pagination,
      count: offerings.length,
      offerings
    });
  } catch (error) {
    console.error("Get event offerings error:", error);
    return res.status(500).json({ message: "Event offerings could not be fetched", error: error.message });
  }
};

const updateEventOffering = async (req, res) => {
  try {
    const event = await getScopedEvent(req);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const churchId = event?.church?._id || event?.church;

    const { offeringId } = req.params;

    const query = { _id: offeringId, church: churchId, event: event._id };

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

    const doc = await EventOffering.findOneAndUpdate(query, body, { new: true, runValidators: true });

    if (!doc) {
      return res.status(404).json({ message: "Offering not found" });
    }

    return res.status(200).json({ message: "Event offering updated successfully", offering: doc });
  } catch (error) {
    console.error("Update event offering error:", error);
    return res.status(500).json({ message: "Event offering could not be updated", error: error.message });
  }
};

const deleteEventOffering = async (req, res) => {
  try {
    const event = await getScopedEvent(req);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const churchId = event?.church?._id || event?.church;

    const { offeringId } = req.params;

    const query = { _id: offeringId, church: churchId, event: event._id };
    const doc = await EventOffering.findOneAndDelete(query);

    if (!doc) {
      return res.status(404).json({ message: "Offering not found" });
    }

    return res.status(200).json({ message: "Event offering deleted successfully", offering: doc });
  } catch (error) {
    console.error("Delete event offering error:", error);
    return res.status(500).json({ message: "Event offering could not be deleted", error: error.message });
  }
};

export { createEventOffering, getEventOfferings, updateEventOffering, deleteEventOffering };
