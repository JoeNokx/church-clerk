import Church from "../models/churchModel.js";
import User from "../models/userModel.js";
import Member from "../models/memberModel.js";
import { CHURCH_ROLES, SYSTEM_ROLES } from "../config/roles.js";
import ActivityLog from "../models/activityLogModel.js";
import ReferralHistory from "../models/referralModel/referralHistoryModel.js";
import ReferralCode from "../models/referralModel/referralCodeModel.js";


// GET all churches in system
const getAllChurches = async (req, res) => {
  try {
    const { search = "", type = "" } = req.query;
    const hasPaging = Object.prototype.hasOwnProperty.call(req.query || {}, "page") ||
      Object.prototype.hasOwnProperty.call(req.query || {}, "limit");

    const filter = {};
    const safeType = String(type || "").trim();
    if (safeType) {
      filter.type = safeType;
    }

    const q = String(search || "").trim();
    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { phoneNumber: regex },
        { city: regex },
        { region: regex }
      ];
    }

    if (!hasPaging) {
      const churches = await Church.find(filter).sort({ createdAt: -1 }).lean();
      return res.status(200).json({
        message: "All churches fetched successfully",
        data: churches
      });
    }

    const { page = 1, limit = 25 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const totalResult = await Church.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalResult / limitNum));

    const churches = await Church.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      message: "All churches fetched successfully",
      data: churches,
      pagination: {
        totalResult,
        totalPages,
        currentPage: pageNum,
        hasPrev: pageNum > 1,
        hasNext: pageNum < totalPages,
        prevPage: pageNum > 1 ? pageNum - 1 : null,
        nextPage: pageNum < totalPages ? pageNum + 1 : null,
        limit: limitNum
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET a single church in system (superadmin + supportadmin)
const getSystemChurchById = async (req, res) => {
  try {
    const { id } = req.params;
    const church = await Church.findById(id).lean();

    if (!church) {
      return res.status(404).json({ message: "Church not found" });
    }

    return res.status(200).json({
      message: "Church fetched successfully",
      data: church
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET all users in system (superadmin + supportadmin)
const getAllSystemUsers = async (req, res) => {
  try {
    const { page = 1, limit = 25, search = "", role = "", churchId = "" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 25);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (role) {
      filter.role = String(role);
    }

    if (churchId) {
      filter.church = churchId;
    }

    if (search) {
      const regex = new RegExp(String(search), "i");
      filter.$or = [
        { fullName: regex },
        { email: regex },
        { phoneNumber: regex }
      ];
    }

    const totalResult = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select("-password")
      .populate("church", "name type")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalPages = Math.ceil(totalResult / limitNum) || 1;

    res.status(200).json({
      message: "System users fetched successfully",
      data: users,
      pagination: {
        totalResult,
        totalPages,
        currentPage: pageNum,
        hasPrev: pageNum > 1,
        hasNext: pageNum < totalPages,
        prevPage: pageNum > 1 ? pageNum - 1 : null,
        nextPage: pageNum < totalPages ? pageNum + 1 : null,
        limit: limitNum
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSystemRoles = async (req, res) => {
  try {
    const enumRoles = User?.schema?.path("role")?.enumValues;
    const allRoles = Array.isArray(enumRoles) && enumRoles.length
      ? Array.from(new Set(enumRoles))
      : Array.from(new Set([...(SYSTEM_ROLES || []), ...(CHURCH_ROLES || [])]));

    const churchRoles = allRoles.filter((r) => !SYSTEM_ROLES.includes(r));

    res.status(200).json({
      message: "Roles fetched successfully",
      data: {
        systemRoles: SYSTEM_ROLES,
        churchRoles,
        allRoles
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSystemUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("church", "name type")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User fetched successfully",
      data: user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSystemUser = async (req, res) => {
  try {
    const { role, isActive } = req.body || {};

    const update = {};
    if (role !== undefined) {
      const nextRole = String(role);
      const enumRoles = User?.schema?.path("role")?.enumValues;
      const allowed = new Set(
        Array.isArray(enumRoles) && enumRoles.length
          ? enumRoles
          : [...SYSTEM_ROLES, ...CHURCH_ROLES]
      );
      if (!allowed.has(nextRole)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      update.role = nextRole;
    }

    if (isActive !== undefined) {
      update.isActive = Boolean(isActive);
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    })
      .select("-password")
      .populate("church", "name type");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      data: user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSystemAuditLogs = async (req, res) => {
  try {
    const {
      search = "",
      module = "",
      action = "",
      role = "",
      churchId = "",
      status = "",
      dateFrom = "",
      dateTo = "",
      page = 1,
      limit = 20
    } = req.query;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const query = {};
    if (churchId) query.church = churchId;

    const q = String(search || "").trim();
    if (q) {
      const regex = new RegExp(q, "i");
      query.$or = [
        { userName: regex },
        { userRole: regex },
        { module: regex },
        { action: regex },
        { resource: regex },
        { path: regex },
        { ipAddress: regex },
        { deviceType: regex },
        { browser: regex },
        { os: regex },
        { model: regex },
        { userAgent: regex }
      ];
    }

    const moduleFilter = String(module || "").trim();
    if (moduleFilter) query.module = moduleFilter;

    const actionFilter = String(action || "").trim();
    if (actionFilter) query.action = actionFilter;

    const roleFilter = String(role || "").trim();
    if (roleFilter) query.userRole = roleFilter;

    const statusFilter = String(status || "").trim();
    if (statusFilter) query.status = statusFilter;

    const from = String(dateFrom || "").trim();
    const to = String(dateTo || "").trim();
    if (from || to) {
      const range = {};
      if (from) {
        const d = new Date(from);
        if (!Number.isNaN(d.getTime())) range.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!Number.isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999);
          range.$lte = d;
        }
      }
      if (Object.keys(range).length) {
        query.createdAt = range;
      }
    }

    const total = await ActivityLog.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("user", "fullName role")
      .populate("church", "name type")
      .lean();

    return res.status(200).json({
      message: "System activity logs fetched",
      logs,
      pagination: {
        total,
        totalPages,
        currentPage: safePage,
        limit: safeLimit,
        nextPage: safePage < totalPages ? safePage + 1 : null,
        prevPage: safePage > 1 ? safePage - 1 : null
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSystemAuditLogById = async (req, res) => {
  try {
    const log = await ActivityLog.findById(req.params.id)
      .populate("user", "fullName role")
      .populate("church", "name type")
      .lean();

    if (!log) return res.status(404).json({ message: "Activity log not found" });

    return res.status(200).json({ message: "Activity log fetched", log });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSystemReferralSummary = async (req, res) => {
  try {
    const totalReferrals = await ReferralHistory.countDocuments();
    const pendingReferrals = await ReferralHistory.countDocuments({ rewardStatus: "pending" });
    const rewardedReferrals = await ReferralHistory.countDocuments({ rewardStatus: "rewarded" });
    const totalCodes = await ReferralCode.countDocuments();

    return res.status(200).json({
      message: "Referral summary fetched",
      data: {
        totalReferrals,
        pendingReferrals,
        rewardedReferrals,
        totalCodes
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSystemReferralHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      status = "",
      referrerChurchId = "",
      search = ""
    } = req.query;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
    const skip = (safePage - 1) * safeLimit;

    const query = {};
    const safeStatus = String(status || "").trim();
    if (safeStatus) query.rewardStatus = safeStatus;
    if (referrerChurchId) query.referrerChurch = referrerChurchId;

    const q = String(search || "").trim();
    if (q) {
      const regex = new RegExp(q, "i");
      query.referredChurchEmail = regex;
    }

    const total = await ReferralHistory.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    const referrals = await ReferralHistory.find(query)
      .sort({ referredAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("referrerChurch", "name email")
      .populate("referredChurch", "name email")
      .lean();

    return res.status(200).json({
      message: "Referral history fetched",
      data: referrals,
      pagination: {
        total,
        totalPages,
        currentPage: safePage,
        limit: safeLimit,
        nextPage: safePage < totalPages ? safePage + 1 : null,
        prevPage: safePage > 1 ? safePage - 1 : null
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET dashboard stats for superadmin
const getDashboardStats = async (req, res) => {
  try {
    const totalChurches = await Church.countDocuments();
    const totalMembers = await Member.countDocuments();
    const totalUsers = await User.countDocuments();

    res.status(200).json({
      message: "Dashboard stats fetched successfully",
      data: {
        totalChurches,
        totalMembers,
        totalUsers
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export {
  getAllChurches,
  getSystemChurchById,
  getAllSystemUsers,
  getDashboardStats,
  getSystemRoles,
  getSystemUserById,
  updateSystemUser,
  getSystemAuditLogs,
  getSystemAuditLogById,
  getSystemReferralSummary,
  getSystemReferralHistory
};