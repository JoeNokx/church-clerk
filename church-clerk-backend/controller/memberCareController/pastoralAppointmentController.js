import PastoralAppointment from "../../models/memberCareModel/pastoralAppointmentModel.js";
import Member from "../../models/memberModel.js";
import { canSeeConfidential } from "./memberCareAccess.js";

const APPOINTMENT_ALLOWED = [
  "type",
  "category",
  "appointmentDate",
  "startTime",
  "durationMinutes",
  "location",
  "locationDetails",
  "assignedTo",
  "status",
  "confidential",
  "notes",
  "outcomeNotes",
  "linkedCase",
  "attendeeName"
];

const setAllowed = (src, target) => {
  APPOINTMENT_ALLOWED.forEach((k) => {
    if (src[k] === undefined) return;
    if (k === "assignedTo") {
      if (src[k] === "") return;
      target[k] = Array.isArray(src[k]) ? src[k] : [src[k]];
      return;
    }
    target[k] = src[k];
  });
};

const populateAppointment = (query) =>
  query
    .populate("member", "firstName lastName phoneNumber email photoUrl status")
    .populate("assignedTo", "firstName lastName photoUrl")
    .populate("linkedCase", "title status referenceId")
    .populate("createdBy", "fullName");

const ACTIVE_STATUSES = ["scheduled", "confirmed", "rescheduled"];

const toMinutes = (t) => {
  if (!t) return null;
  const [h, m] = String(t).split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

// Double-booking guard: same pastor/counselor, same day, overlapping time.
// When either appointment has no start time, a shared day + assignee counts
// as a conflict.
const findScheduleConflicts = async ({ churchId, appointmentDate, startTime, durationMinutes, assignedTo, excludeId }) => {
  const assignees = (Array.isArray(assignedTo) ? assignedTo : [assignedTo]).filter(Boolean);
  if (!assignees.length || !appointmentDate) return [];
  const day = new Date(appointmentDate);
  if (Number.isNaN(day.getTime())) return [];

  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const query = {
    church: churchId,
    assignedTo: { $in: assignees },
    status: { $in: ACTIVE_STATUSES },
    appointmentDate: { $gte: dayStart, $lt: dayEnd }
  };
  if (excludeId) query._id = { $ne: excludeId };

  const others = await PastoralAppointment.find(query).populate("assignedTo", "firstName lastName").lean();
  const myStart = toMinutes(startTime);
  const myDur = Number(durationMinutes) || 60;

  return others.filter((o) => {
    const oStart = toMinutes(o.startTime);
    if (myStart === null || oStart === null) return true;
    const oDur = Number(o.durationMinutes) || 60;
    return myStart < oStart + oDur && oStart < myStart + myDur;
  });
};

const conflictMessage = (conflicts, assigneeIds) => {
  const ids = new Set((Array.isArray(assigneeIds) ? assigneeIds : [assigneeIds]).map(String));
  const names = new Set();
  conflicts.forEach((o) =>
    (o.assignedTo || []).forEach((m) => {
      if (ids.has(String(m?._id || m))) names.add(`${m?.firstName || ""} ${m?.lastName || ""}`.trim() || "Assignee");
    })
  );
  const list = [...names].join(", ");
  return `${list} already ha${names.size === 1 ? "s" : "ve"} an appointment at that time`;
};

const pagination = (total, pageNum, limitNum) => {
  const totalPages = Math.ceil(total / limitNum) || 0;
  return {
    totalResult: total,
    totalPages,
    currentPage: pageNum,
    hasPrev: pageNum > 1,
    hasNext: pageNum < totalPages,
    prevPage: pageNum > 1 ? pageNum - 1 : null,
    nextPage: pageNum < totalPages ? pageNum + 1 : null
  };
};

export const getAllPastoralAppointments = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const { status, type, category, assignedTo, memberId, search, dateFrom, dateTo, upcoming } = req.query;

    const query = { church: churchId };
    if (!canSeeConfidential(req)) query.confidential = { $ne: true };
    if (status) query.status = status;
    if (type) query.type = type;
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;
    if (memberId) query.member = memberId;

    if (String(upcoming) === "true") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.appointmentDate = { $gte: today };
      query.status = { $in: ["scheduled", "confirmed"] };
    }

    if (search && String(search).trim()) {
      const term = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = { $regex: term, $options: "i" };
      const memberIds = await Member.find({
        church: churchId,
        $or: [{ firstName: rx }, { lastName: rx }, { phoneNumber: rx }]
      })
        .select("_id")
        .lean();
      query.$or = [
        { attendeeName: rx },
        { referenceId: rx },
        { member: { $in: memberIds.map((m) => m._id) } }
      ];
    }

    if (dateFrom || dateTo) {
      query.appointmentDate = { ...(query.appointmentDate || {}) };
      if (dateFrom) query.appointmentDate.$gte = new Date(dateFrom);
      if (dateTo) query.appointmentDate.$lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    const [appointments, total] = await Promise.all([
      populateAppointment(
        PastoralAppointment.find(query).sort({ appointmentDate: 1, startTime: 1 }).skip(skip).limit(limitNum).lean()
      ),
      PastoralAppointment.countDocuments(query)
    ]);

    return res.status(200).json({
      message: "Pastoral appointments fetched successfully",
      pagination: pagination(total, pageNum, limitNum),
      count: appointments.length,
      appointments
    });
  } catch (error) {
    return res.status(400).json({ message: "Pastoral appointments could not be fetched", error: error.message });
  }
};

export const getPastoralAppointmentStats = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const base = { church: churchId };
    if (!canSeeConfidential(req)) base.confidential = { $ne: true };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const activeStatuses = ["scheduled", "confirmed"];

    const [upcoming, todayCount, counselingMonth, completedThisMonth, total] = await Promise.all([
      PastoralAppointment.countDocuments({ ...base, status: { $in: activeStatuses }, appointmentDate: { $gte: today } }),
      PastoralAppointment.countDocuments({
        ...base,
        status: { $in: activeStatuses },
        appointmentDate: { $gte: today, $lt: tomorrow }
      }),
      PastoralAppointment.countDocuments({
        ...base,
        type: "counseling-session",
        appointmentDate: { $gte: monthStart, $lt: monthEnd }
      }),
      PastoralAppointment.countDocuments({
        ...base,
        status: "completed",
        appointmentDate: { $gte: monthStart, $lt: monthEnd }
      }),
      PastoralAppointment.countDocuments(base)
    ]);

    return res.status(200).json({
      message: "Pastoral appointment stats fetched successfully",
      stats: { upcoming, today: todayCount, counselingThisMonth: counselingMonth, completedThisMonth, total }
    });
  } catch (error) {
    return res.status(400).json({ message: "Pastoral appointment stats could not be fetched", error: error.message });
  }
};

export const getPastoralAppointmentById = async (req, res) => {
  try {
    const query = { _id: req.params.appointmentId, church: req.activeChurch._id };
    if (!canSeeConfidential(req)) query.confidential = { $ne: true };

    const appointment = await populateAppointment(PastoralAppointment.findOne(query).lean());
    if (!appointment) return res.status(404).json({ message: "Pastoral appointment not found" });

    return res.status(200).json({ message: "Pastoral appointment fetched successfully", appointment });
  } catch (error) {
    return res.status(400).json({ message: "Pastoral appointment could not be fetched", error: error.message });
  }
};

export const createPastoralAppointment = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const memberId = req.body.memberId || req.body.member;

    let memberRef = null;
    if (memberId) {
      const member = await Member.findOne({ _id: memberId, church: churchId }).select("_id");
      if (!member) return res.status(404).json({ message: "Member not found" });
      memberRef = member._id;
    }

    if (!memberRef && !String(req.body.attendeeName || "").trim()) {
      return res.status(400).json({ message: "Either a member or an attendee name is required" });
    }

    const payload = {
      church: churchId,
      member: memberRef,
      createdBy: req.user._id
    };
    setAllowed(req.body, payload);
    if (memberRef) payload.attendeeName = undefined;

    const conflicts = await findScheduleConflicts({ churchId, ...payload });
    if (conflicts.length) {
      return res.status(409).json({ message: conflictMessage(conflicts, payload.assignedTo) });
    }

    const appointment = await PastoralAppointment.create(payload);
    const populated = await populateAppointment(PastoralAppointment.findById(appointment._id).lean());
    return res.status(201).json({ message: "Pastoral appointment created successfully", appointment: populated });
  } catch (error) {
    return res.status(400).json({ message: "Pastoral appointment could not be created", error: error.message });
  }
};

export const updatePastoralAppointment = async (req, res) => {
  try {
    const query = { _id: req.params.appointmentId, church: req.activeChurch._id };
    if (!canSeeConfidential(req)) query.confidential = { $ne: true };

    const update = {};
    setAllowed(req.body, update);

    if (req.body.memberId !== undefined) {
      if (!req.body.memberId) {
        update.member = null;
      } else {
        const member = await Member.findOne({ _id: req.body.memberId, church: req.activeChurch._id }).select("_id");
        if (!member) return res.status(404).json({ message: "Member not found" });
        update.member = member._id;
      }
    }

    if (update.status === "completed") {
      update.completedAt = new Date();
    } else if (update.status && update.status !== "completed") {
      update.completedAt = null;
    }

    const existing = await PastoralAppointment.findOne(query).lean();
    if (!existing) return res.status(404).json({ message: "Pastoral appointment not found" });

    const next = { ...existing, ...update };
    if (ACTIVE_STATUSES.includes(next.status)) {
      const conflicts = await findScheduleConflicts({
        churchId: existing.church,
        appointmentDate: next.appointmentDate,
        startTime: next.startTime,
        durationMinutes: next.durationMinutes,
        assignedTo: next.assignedTo,
        excludeId: existing._id
      });
      if (conflicts.length) {
        return res.status(409).json({ message: conflictMessage(conflicts, next.assignedTo) });
      }
    }

    const appointment = await PastoralAppointment.findOneAndUpdate(query, { $set: update }, { new: true, runValidators: true });
    if (!appointment) return res.status(404).json({ message: "Pastoral appointment not found" });

    const populated = await populateAppointment(PastoralAppointment.findById(appointment._id).lean());
    return res.status(200).json({ message: "Pastoral appointment updated successfully", appointment: populated });
  } catch (error) {
    return res.status(400).json({ message: "Pastoral appointment could not be updated", error: error.message });
  }
};

export const deletePastoralAppointment = async (req, res) => {
  try {
    const query = { _id: req.params.appointmentId, church: req.activeChurch._id };
    if (!canSeeConfidential(req)) query.confidential = { $ne: true };

    const appointment = await PastoralAppointment.findOneAndDelete(query);
    if (!appointment) return res.status(404).json({ message: "Pastoral appointment not found" });

    return res.status(200).json({ message: "Pastoral appointment deleted successfully" });
  } catch (error) {
    return res.status(400).json({ message: "Pastoral appointment could not be deleted", error: error.message });
  }
};
