import SupportRequest from "../models/supportRequestModel.js";
import Counter from "../models/counterModel.js";
import Notification from "../models/notificationModel.js";

async function generateTicketNumber() {
  const counter = await Counter.findOneAndUpdate(
    { _id: "supportTicket" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `SUP-${String(counter.seq).padStart(6, "0")}`;
}

async function sendNotification({ userId, title, message, ticketId, ticketNumber, dedupeKey }) {
  if (!userId) return;
  try {
    const doc = {
      userId,
      type: "support_ticket",
      title,
      message,
      actionUrl: `/dashboard?page=support-help&ticketId=${ticketId}`,
      meta: { ticketId: String(ticketId), ticketNumber }
    };
    if (dedupeKey) {
      await Notification.findOneAndUpdate(
        { dedupeKey },
        { $set: { ...doc, readStatus: false } },
        { upsert: true, new: true }
      );
    } else {
      await Notification.create(doc);
    }
  } catch (e) {
    console.error("Notification error:", e.message);
  }
}

export const createSupportRequest = async (req, res) => {
  try {
    const { subject, category, churchName, name, description } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ message: "Subject and description are required." });
    }

    const ticketNumber = await generateTicketNumber();
    const actorName = req.user?.fullName || String(name || "").trim() || "User";

    const doc = await SupportRequest.create({
      ticketNumber,
      subject: String(subject).trim(),
      category: String(category || "Other").trim(),
      churchName: String(churchName || "").trim() || undefined,
      name: String(name || "").trim() || undefined,
      description: String(description).trim(),
      submittedBy: req.user?._id || undefined,
      church: req.activeChurch?._id || undefined,
      history: [{
        actor: "user",
        actorId: req.user?._id || undefined,
        actorName,
        type: "created",
        content: String(description).trim(),
        toStatus: "open"
      }]
    });

    return res.status(201).json({
      message: "Support request submitted successfully.",
      supportRequest: doc,
      ticketNumber
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to submit support request.", error: error.message });
  }
};

export const getMyTickets = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized." });

    const { page = 1, limit = 20, status = "" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = { submittedBy: userId };
    if (status) query.status = status;

    const [rows, total] = await Promise.all([
      SupportRequest.find(query)
        .select("-history")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SupportRequest.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;
    return res.status(200).json({
      message: "Your tickets fetched.",
      supportRequests: rows,
      pagination: {
        totalResult: total,
        totalPages,
        currentPage: pageNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
        nextPage: pageNum < totalPages ? pageNum + 1 : null,
        prevPage: pageNum > 1 ? pageNum - 1 : null
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch your tickets.", error: error.message });
  }
};

export const getMyTicketById = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized." });

    const doc = await SupportRequest.findOne({ _id: req.params.id, submittedBy: userId }).lean();
    if (!doc) return res.status(404).json({ message: "Ticket not found." });

    return res.status(200).json({ message: "Ticket fetched.", supportRequest: doc });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch ticket.", error: error.message });
  }
};

export const confirmResolution = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized." });

    const { answer, rating, ratingFeedback, reopenNote } = req.body;

    const ticket = await SupportRequest.findOne({ _id: req.params.id, submittedBy: userId });
    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    if (ticket.status !== "resolved") {
      return res.status(400).json({ message: "Ticket is not in resolved state." });
    }

    const actorName = req.user?.fullName || ticket.name || "User";

    if (answer === "yes") {
      const historyEntry = { actor: "user", actorId: userId, actorName, type: "closed", fromStatus: "resolved", toStatus: "closed" };
      if (rating) {
        const r = Math.min(5, Math.max(1, parseInt(rating, 10)));
        ticket.rating = r;
        ticket.ratingFeedback = String(ratingFeedback || "").trim() || undefined;
        historyEntry.type = "rated";
        historyEntry.content = `Rating: ${r}/5${ratingFeedback ? ` — ${String(ratingFeedback).trim()}` : ""}`;
        ticket.history.push({ actor: "user", actorId: userId, actorName, type: "closed", fromStatus: "resolved", toStatus: "closed" });
      }
      ticket.status = "closed";
      ticket.history.push(historyEntry);
      await ticket.save();

      return res.status(200).json({ message: "Ticket closed. Thank you for your feedback!", supportRequest: ticket.toObject() });
    }

    if (answer === "no") {
      const note = String(reopenNote || "").trim();
      if (!note) return res.status(400).json({ message: "Please describe what still needs help." });

      const prevStatus = ticket.status;
      ticket.status = "in_progress";
      ticket.history.push({
        actor: "user",
        actorId: userId,
        actorName,
        type: "reopened",
        content: note,
        fromStatus: prevStatus,
        toStatus: "in_progress"
      });
      await ticket.save();

      await sendNotification({
        userId: null,
        title: null,
        message: null,
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber
      });

      return res.status(200).json({ message: "Ticket reopened. An agent will follow up shortly.", supportRequest: ticket.toObject() });
    }

    return res.status(400).json({ message: "Invalid answer. Must be 'yes' or 'no'." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to process confirmation.", error: error.message });
  }
};

export const getAllSupportRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "", search = "" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status) query.status = status;
    if (search) {
      const re = new RegExp(search, "i");
      query.$or = [{ subject: re }, { name: re }, { churchName: re }, { category: re }, { description: re }, { ticketNumber: re }];
    }

    const [rows, total] = await Promise.all([
      SupportRequest.find(query)
        .select("-history")
        .populate("submittedBy", "fullName email")
        .populate("church", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SupportRequest.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;
    return res.status(200).json({
      message: "Support requests fetched successfully.",
      supportRequests: rows,
      pagination: {
        totalResult: total,
        totalPages,
        currentPage: pageNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
        nextPage: pageNum < totalPages ? pageNum + 1 : null,
        prevPage: pageNum > 1 ? pageNum - 1 : null
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch support requests.", error: error.message });
  }
};

export const getOpenTicketCount = async (req, res) => {
  try {
    const count = await SupportRequest.countDocuments({ status: { $in: ["open", "in_progress"] } });
    return res.status(200).json({ count });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch count.", error: error.message });
  }
};

export const getSupportRequestById = async (req, res) => {
  try {
    const doc = await SupportRequest.findById(req.params.id)
      .populate("submittedBy", "fullName email")
      .populate("church", "name")
      .lean();
    if (!doc) return res.status(404).json({ message: "Support request not found." });
    return res.status(200).json({ message: "Support request fetched.", supportRequest: doc });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch support request.", error: error.message });
  }
};

export const updateSupportRequestStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    const ticket = await SupportRequest.findById(req.params.id)
      .populate("submittedBy", "fullName email")
      .populate("church", "name");
    if (!ticket) return res.status(404).json({ message: "Support request not found." });

    const prevStatus = ticket.status;
    const adminName = req.user?.fullName || req.adminUser?.fullName || "Support Team";
    const historyEntry = {
      actor: "admin",
      actorId: req.user?._id || req.adminUser?._id || undefined,
      actorName: adminName,
      fromStatus: prevStatus
    };

    if (status && status !== prevStatus) {
      ticket.status = status;
      historyEntry.toStatus = status;
      historyEntry.type = status === "resolved" ? "resolved" : status === "closed" ? "closed" : "status_change";
      if (adminNote) historyEntry.content = String(adminNote).trim();
      ticket.history.push(historyEntry);
    }

    if (adminNote !== undefined) {
      ticket.adminNote = String(adminNote || "").trim();
      if (!status || status === prevStatus) {
        ticket.history.push({
          actor: "admin",
          actorId: req.user?._id || req.adminUser?._id || undefined,
          actorName: adminName,
          type: "admin_response",
          content: String(adminNote || "").trim()
        });
      }
    }

    await ticket.save();

    if (status === "resolved" && prevStatus !== "resolved") {
      const submittedById = ticket.submittedBy?._id || ticket.submittedBy;
      if (submittedById) {
        await sendNotification({
          userId: submittedById,
          title: `Ticket ${ticket.ticketNumber} Resolved`,
          message: `Your support request "${ticket.subject}" has been resolved. Please confirm if this resolved your issue.`,
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          dedupeKey: `sr-resolved-${ticket._id}`
        });
      }
    }

    if ((status === "in_progress" || status === "open") && prevStatus === "resolved") {
      const submittedById = ticket.submittedBy?._id || ticket.submittedBy;
      if (submittedById) {
        await sendNotification({
          userId: submittedById,
          title: `Ticket ${ticket.ticketNumber} Reopened`,
          message: `Your support ticket "${ticket.subject}" has been reopened and is being reviewed.`,
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber
        });
      }
    }

    const updated = await SupportRequest.findById(ticket._id)
      .populate("submittedBy", "fullName email")
      .populate("church", "name")
      .lean();

    return res.status(200).json({ message: "Support request updated.", supportRequest: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update support request.", error: error.message });
  }
};
