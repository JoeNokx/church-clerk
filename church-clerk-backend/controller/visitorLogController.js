import mongoose from "mongoose";
import VisitorLog from "../models/visitorLogModel.js";
import Visitor from "../models/visitorsModel.js";
import { buildPaginationParams, buildPaginationResponse } from "../utils/paginationHelper.js";
import { buildDateRangeQuery } from "../utils/searchHelper.js";

const createVisitorLog = async (req, res) => {
  try {
    const { serviceType, serviceDate, note } = req.body;

    if (!serviceType || !serviceDate) {
      return res.status(400).json({ message: "service type and service date are required" });
    }

    const visitorLog = await VisitorLog.create({
      serviceType: String(serviceType).trim(),
      serviceDate,
      note: note ? String(note).trim() : "",
      church: req.activeChurch._id,
      createdBy: req.user._id,
    });

    return res.status(201).json({ message: "visitors log created successfully", visitorLog });
  } catch (error) {
    return res.status(400).json({ message: "visitors log could not be created", error: error.message });
  }
};

const getAllVisitorLogs = async (req, res) => {
  try {
    const { page, limit, skip } = buildPaginationParams(req.query);
    const { serviceType, dateFrom, dateTo, search } = req.query;

    const query = { church: req.activeChurch._id };

    if (serviceType) {
      query.serviceType = serviceType;
    }

    if (search) {
      query.$or = [
        { serviceType: { $regex: search, $options: "i" } },
        { note: { $regex: search, $options: "i" } },
      ];
    }

    if (dateFrom || dateTo) {
      Object.assign(query, buildDateRangeQuery(dateFrom, dateTo, "serviceDate"));
    }

    const [logs, totalLogs] = await Promise.all([
      VisitorLog.find(query)
        .sort({ serviceDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VisitorLog.countDocuments(query),
    ]);

    const logIds = logs.map((l) => l._id);
    const counts = await Visitor.aggregate([
      { $match: { church: req.activeChurch._id, visitorLog: { $in: logIds } } },
      { $group: { _id: "$visitorLog", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach((c) => { countMap[String(c._id)] = c.count; });
    logs.forEach((l) => { l.visitorCount = countMap[String(l._id)] || 0; });

    const pagination = buildPaginationResponse(totalLogs, page, limit);

    return res.status(200).json({
      pagination,
      count: logs.length,
      visitorLogs: logs,
    });
  } catch (error) {
    return res.status(400).json({ message: "could not fetch visitors logs", error: error.message });
  }
};

const getSingleVisitorLog = async (req, res) => {
  try {
    const { id } = req.params;

    const visitorLog = await VisitorLog.findOne({ _id: id, church: req.activeChurch._id }).lean();

    if (!visitorLog) {
      return res.status(404).json({ message: "visitors log not found" });
    }

    visitorLog.visitorCount = await Visitor.countDocuments({
      church: req.activeChurch._id,
      visitorLog: visitorLog._id,
    });

    return res.status(200).json({ message: "visitors log found successfully", visitorLog });
  } catch (error) {
    return res.status(400).json({ message: "visitors log could not be found", error: error.message });
  }
};

const updateVisitorLog = async (req, res) => {
  try {
    const { id } = req.params;

    const update = {};
    if (req.body.serviceType !== undefined) update.serviceType = String(req.body.serviceType).trim();
    if (req.body.serviceDate !== undefined) update.serviceDate = req.body.serviceDate;
    if (req.body.note !== undefined) update.note = req.body.note ? String(req.body.note).trim() : "";

    const visitorLog = await VisitorLog.findOneAndUpdate(
      { _id: id, church: req.activeChurch._id },
      update,
      { new: true, runValidators: true }
    );

    if (!visitorLog) {
      return res.status(404).json({ message: "visitors log not found" });
    }

    // keep linked visitors' service details in sync with the log
    await Visitor.updateMany(
      { church: req.activeChurch._id, visitorLog: visitorLog._id },
      { $set: { serviceType: visitorLog.serviceType, serviceDate: visitorLog.serviceDate } }
    );

    return res.status(200).json({ message: "visitors log updated successfully", visitorLog });
  } catch (error) {
    return res.status(400).json({ message: "visitors log could not be updated", error: error.message });
  }
};

const deleteVisitorLog = async (req, res) => {
  try {
    const { id } = req.params;

    const visitorLog = await VisitorLog.findOneAndDelete({ _id: id, church: req.activeChurch._id });

    if (!visitorLog) {
      return res.status(404).json({ message: "visitors log not found" });
    }

    // keep the visitors; just unlink them from the deleted log
    await Visitor.updateMany(
      { church: req.activeChurch._id, visitorLog: visitorLog._id },
      { $set: { visitorLog: null } }
    );

    return res.status(200).json({ message: "visitors log deleted successfully", visitorLog });
  } catch (error) {
    return res.status(400).json({ message: "visitors log could not be deleted", error: error.message });
  }
};

export {
  createVisitorLog,
  getAllVisitorLogs,
  getSingleVisitorLog,
  updateVisitorLog,
  deleteVisitorLog,
};
