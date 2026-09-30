import mongoose from "mongoose";
import { validatePhoneNumber } from "../utils/validatePhoneNumber.js";
import Visitor from "../models/visitorsModel.js";
import VisitorLog from "../models/visitorLogModel.js";
import ServiceIndividualAttendance from "../models/serviceIndividualAttendanceModel.js";
import Member from "../models/memberModel.js";
import { annotateDeletable } from "../services/recordDependencyService.js";

// create visitor

const createVisitor = async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      email,
      location,
      invitedBy,
      source,
      status,
      note,
      attendance
    } = req.body;

    if (!fullName || !phoneNumber || !location) {
      return res.status(400).json({
        message: "fullName, phoneNumber and location are required",
      });
    }

    let session = null;
    if (attendance) {
      if (!mongoose.Types.ObjectId.isValid(attendance)) {
        return res.status(400).json({ message: "invalid attendance session" });
      }
      session = await ServiceIndividualAttendance.findOne({ _id: attendance, church: req.activeChurch._id }).select("_id");
      if (!session) {
        return res.status(404).json({ message: "attendance session not found" });
      }
    }

    let validatedPhoneNumber;
    try {
      validatedPhoneNumber = validatePhoneNumber(phoneNumber, "GH");
    } catch (e) {
      return res.status(400).json({ message: e?.message || "Invalid phone number" });
    }

    const existingVisitor = await Visitor.findOne({
      church: req.activeChurch._id,
      phoneNumber: validatedPhoneNumber
    });

    if (existingVisitor) {
      if (session) {
        await Visitor.updateOne(
          { _id: existingVisitor._id },
          { $addToSet: { attendance: session._id } }
        );
        const updated = await Visitor.findById(existingVisitor._id)
          .populate({ path: "attendance", select: "date serviceType mainSpeaker", options: { sort: { date: -1 } } });
        return res.status(200).json({
          message: "Visitor already exists — added to this session",
          visitor: updated,
          existing: true
        });
      }
      return res.status(409).json({
        message: "A visitor with this phone number already exists.",
        visitor: existingVisitor,
        existing: true
      });
    }

    const data = {
      fullName,
      phoneNumber: validatedPhoneNumber,
      email,
      location,
      invitedBy,
      source,
      note,
      church: req.activeChurch._id,
      createdBy: req.user._id
    };

    if (session) {
      data.attendance = [session._id];
    }

    if (status) {
      data.status = status;
    }

    const visitor = await Visitor.create(data);

    return res.status(201).json({
      message: "Visitor created successfully",
      visitor,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Visitor could not be created",
      error: error.message,
    });
  }
};


//get single visitor

const getSingleVisitor = async (req, res) => {

    try {
        const {id} = req.params;
        const query = { _id: id, church: req.activeChurch._id }

        const visitor = await Visitor.findOne(query)
          .populate("visitorLog", "serviceType serviceDate referenceId")
          .populate({ path: "attendance", select: "date serviceType mainSpeaker", options: { sort: { date: -1 } } })
          .lean();

        if(!visitor) {
            return res.status(404).json({message: "visitor not found"})
        }

        visitor.attendanceCount = Array.isArray(visitor.attendance) ? visitor.attendance.length : 0;

        return res.status(200).json({message: "visitor found successfully", visitor})


    } catch (error) {
        return res.status(400).json({message: "visitor could not be found", error: error.message})
    }
}

//get all visitors

const getAllVisitors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", source: sourceFilter = "", dateFrom = "", dateTo = "", attendance = "" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query = { church: req.activeChurch._id };
    const churchQuery = { church: req.activeChurch._id };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { invitedBy: { $regex: search, $options: "i" } },
      ];
    }

    if (sourceFilter) {
      query.source = sourceFilter;
    }

    if (attendance && mongoose.Types.ObjectId.isValid(attendance)) {
      query.attendance = attendance;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const pctChange = (current, previous) => {
      const c = Number(current || 0);
      const p = Number(previous || 0);
      if (!p) return c ? 100 : 0;
      return ((c - p) / p) * 100;
    };

    const [
      visitors,
      totalVisitors,
      thisMonthVisitors,
      thisWeekVisitors,
      convertedVisitors,
      totalVisitorsPrev,
      lastMonthVisitors,
      lastWeekVisitors,
      convertedVisitorsPrev
    ] = await Promise.all([
      Visitor.find(query)
        .select("fullName phoneNumber email location invitedBy source status church visitorLog attendance createdAt")
        .populate("visitorLog", "serviceType serviceDate referenceId")
        .populate({ path: "attendance", select: "date serviceType", options: { sort: { date: -1 } } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Visitor.countDocuments(query),
      Visitor.countDocuments({ ...churchQuery, createdAt: { $gte: startOfMonth } }),
      Visitor.countDocuments({ ...churchQuery, createdAt: { $gte: startOfWeek } }),
      Member.countDocuments({ visitorId: { $ne: null }, church: req.activeChurch._id }),
      Visitor.countDocuments({ ...churchQuery, createdAt: { $lt: startOfMonth } }),
      Visitor.countDocuments({ ...churchQuery, createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } }),
      Visitor.countDocuments({ ...churchQuery, createdAt: { $gte: startOfLastWeek, $lt: startOfWeek } }),
      Member.countDocuments({ visitorId: { $ne: null }, church: req.activeChurch._id, createdAt: { $lt: startOfMonth } })
    ]);

    const change = {
      totalVisitors: pctChange(totalVisitors, totalVisitorsPrev),
      thisWeekVisitors: pctChange(thisWeekVisitors, lastWeekVisitors),
      thisMonthVisitors: pctChange(thisMonthVisitors, lastMonthVisitors),
      convertedVisitors: pctChange(convertedVisitors, convertedVisitorsPrev)
    };

    const diff = {
      totalVisitors: totalVisitors - totalVisitorsPrev,
      thisWeekVisitors: thisWeekVisitors - lastWeekVisitors,
      thisMonthVisitors: thisMonthVisitors - lastMonthVisitors,
      convertedVisitors: convertedVisitors - convertedVisitorsPrev
    };

    const stats = {
      totalVisitors,
      thisWeekVisitors,
      thisMonthVisitors,
      convertedVisitors,
      change,
      diff
    };

    if (!visitors || visitors.length === 0) {
      return res.status(200).json({
        message: "No visitor found.",
        stats,
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
        visitors: [],
      });
    }

    const totalPages = Math.ceil(totalVisitors / limitNum);

    const pagination = {
      totalResult: totalVisitors,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    };

    visitors.forEach((v) => {
      v.attendanceCount = Array.isArray(v?.attendance) ? v.attendance.length : 0;
    });

    await annotateDeletable("visitor", visitors, req.activeChurch._id);

    return res.status(200).json({
      stats,
      pagination,
      count: visitors.length,
      visitors,
    });

  } catch (error) {
    return res.status(400).json({
      message: "Could not fetch visitors",
      error: error.message,
    });
  }
};



//update visitor
const updateVisitor = async (req, res) => {

    try {
        const {id} = req.params;
        const query = { _id: id, church: req.activeChurch._id }

        delete req.body.visitorLog;
        delete req.body.serviceType;
        delete req.body.serviceDate;

        let sessionToAdd = null;
        if (req.body?.attendance !== undefined) {
          const attendanceRef = req.body.attendance;
          delete req.body.attendance;
          if (attendanceRef) {
            if (!mongoose.Types.ObjectId.isValid(attendanceRef)) {
              return res.status(400).json({ message: "invalid attendance session" });
            }
            sessionToAdd = await ServiceIndividualAttendance.findOne({ _id: attendanceRef, church: req.activeChurch._id }).select("_id");
            if (!sessionToAdd) {
              return res.status(404).json({ message: "attendance session not found" });
            }
          }
        }

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

        const updateOp = { $set: req.body };
        if (sessionToAdd) {
          updateOp.$addToSet = { attendance: sessionToAdd._id };
        }

        const attendance = await Visitor.findOneAndUpdate(query, updateOp, {
            new: true,
            runValidators: true
        })

        if(!attendance) {
            return res.status(404).json({message: "visitor not found"})
        }

        return res.status(200).json({message: "visitor updated successfully", attendance})
    } catch (error) {
        return res.status(400).json({message: "visitor could not be updated", error: error.message})
    }
}


const deleteVisitor = async (req, res) => {

    try {
         const {id} = req.params;
        const query = { _id: id, church: req.activeChurch._id }

        const attendance = await Visitor.findOneAndDelete(query)

        if(!attendance) {
            return res.status(404).json({message: "visitor not found"})
        }

        return res.status(200).json({message: "visitor deleted successfully", attendance})
    } catch (error) {
        return res.status(400).json({message: "visitor could not be deleted", error: error.message})
    }
}


export {
    createVisitor, getSingleVisitor, getAllVisitors, updateVisitor, deleteVisitor
}
