import Church from "../models/churchModel.js";
import User from "../models/userModel.js";
import Member from "../models/memberModel.js";
import { CHURCH_ROLES, SYSTEM_ROLES } from "../config/roles.js";
import Role from "../models/roleModel.js";
import ActivityLog from "../models/activityLogModel.js";
import ReferralHistory from "../models/referralModel/referralHistoryModel.js";
import ReferralCode from "../models/referralModel/referralCodeModel.js";
import AnnouncementWallet from "../models/announcementWalletModel.js";
import AnnouncementWalletTransaction from "../models/announcementWalletTransactionModel.js";
import AnnouncementMessageDelivery from "../models/announcementMessageDeliveryModel.js";


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
    const hasAnyDbRole = Boolean(await Role.exists({}));
    const dbRoles = await Role.find({ isActive: true }).select("key scope").lean();
    const dbSystemRoles = (dbRoles || [])
      .filter((r) => r?.scope === "system")
      .map((r) => String(r?.key || "").trim().toLowerCase())
      .filter(Boolean);
    const dbChurchRoles = (dbRoles || [])
      .filter((r) => r?.scope === "church")
      .map((r) => String(r?.key || "").trim().toLowerCase())
      .filter(Boolean);

    const systemRoles = hasAnyDbRole ? Array.from(new Set(dbSystemRoles)) : Array.from(new Set(SYSTEM_ROLES || []));
    const churchRoles = hasAnyDbRole ? Array.from(new Set(dbChurchRoles)) : Array.from(new Set(CHURCH_ROLES || []));
    const allRoles = Array.from(new Set([...(systemRoles || []), ...(churchRoles || [])]));

    res.status(200).json({
      message: "Roles fetched successfully",
      data: {
        systemRoles,
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
      const nextRole = String(role || "").trim().toLowerCase();
      if (!nextRole) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const isLegacy = [...SYSTEM_ROLES, ...CHURCH_ROLES].includes(nextRole);
      if (isLegacy) {
        const expectedScope = SYSTEM_ROLES.includes(nextRole) ? "system" : "church";
        const dbRole = await Role.findOne({ key: nextRole, scope: expectedScope }).select("_id isActive").lean();
        if (dbRole?._id && dbRole?.isActive === false) {
          return res.status(400).json({ message: "Invalid role" });
        }
        update.role = nextRole;
        update.roleRef = dbRole?._id || null;
      } else {
        const dbRole = await Role.findOne({ key: nextRole, scope: "system", isActive: true }).select("_id").lean();
        if (!dbRole?._id) {
          return res.status(400).json({ message: "Invalid role" });
        }

        update.role = nextRole;
        update.roleRef = dbRole._id;
      }
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
    return res.status(500).json({ message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const totalChurches = await Church.countDocuments();
    const totalMembers = await Member.countDocuments();
    const totalUsers = await User.countDocuments();

    return res.status(200).json({
      message: "Dashboard stats fetched successfully",
      data: {
        totalChurches,
        totalMembers,
        totalUsers
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getGlobalAnnouncementWalletKpis = async (req, res) => {
  try {
    const [walletAgg, creditsAgg, totalTx, smsAgg] = await Promise.all([
      AnnouncementWallet.aggregate([
        { $group: { _id: null, totalWalletBalanceCredits: { $sum: "$balanceCredits" } } }
      ]),
      AnnouncementWalletTransaction.aggregate([
        {
          $match: {
            status: "success"
          }
        },
        {
          $group: {
            _id: null,
            totalCreditsIssued: {
              $sum: {
                $cond: [{ $eq: ["$type", "fund"] }, "$amountCredits", 0]
              }
            },
            totalCreditsUsed: {
              $sum: {
                $cond: [{ $eq: ["$type", "deduct"] }, { $multiply: ["$amountCredits", -1] }, 0]
              }
            }
          }
        }
      ]),
      AnnouncementWalletTransaction.countDocuments({ status: "success" }),
      AnnouncementMessageDelivery.aggregate([
        {
          $match: {
            channel: "sms",
            status: { $ne: "failed" }
          }
        },
        { $group: { _id: null, totalSmsSent: { $sum: 1 } } }
      ])
    ]);

    const totalWalletBalanceCredits = Number(walletAgg?.[0]?.totalWalletBalanceCredits || 0);
    const totalCreditsIssued = Number(creditsAgg?.[0]?.totalCreditsIssued || 0);
    const totalCreditsUsed = Number(creditsAgg?.[0]?.totalCreditsUsed || 0);
    const totalWalletTransactions = Number(totalTx || 0);
    const totalSmsSent = Number(smsAgg?.[0]?.totalSmsSent || 0);

    return res.status(200).json({
      message: "Global wallet KPIs fetched",
      data: {
        totalWalletBalanceCredits,
        totalCreditsIssued,
        totalCreditsUsed,
        totalWalletTransactions,
        totalSmsSent
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const listChurchSenderIdRequests = async (req, res) => {
  try {
    const { status = "pending", search = "", page = 1, limit = 25 } = req.query;

    const safeStatus = String(status || "").trim().toLowerCase();
    const safeSearch = String(search || "").trim();

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      sender_id: { $exists: true, $nin: [null, ""] }
    };

    if (safeStatus && safeStatus !== "all") {
      filter.sender_id_status = safeStatus;
    } else {
      filter.sender_id_status = { $in: ["pending", "approved", "rejected"] };
    }

    if (safeSearch) {
      const regex = new RegExp(safeSearch, "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { phoneNumber: regex },
        { city: regex },
        { region: regex },
        { sender_id: regex }
      ];
    }

    const totalResult = await Church.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalResult / limitNum));

    const rows = await Church.find(filter)
      .select(
        "name type email phoneNumber city region sender_id sender_id_status sender_id_requested_at sender_id_approved_at createdAt"
      )
      .sort({ sender_id_requested_at: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      message: "Sender ID requests fetched",
      data: rows,
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
    return res.status(500).json({ message: error.message });
  }
};

const approveChurchSenderId = async (req, res) => {
  try {
    const id = String(req.params?.id || "").trim();
    if (!id) return res.status(400).json({ message: "Church id is required" });

    const church = await Church.findById(id);
    if (!church) return res.status(404).json({ message: "Church not found" });

    const senderId = String(church?.sender_id || "").trim();
    if (!senderId) {
      return res.status(400).json({ message: "Church has no sender ID to approve" });
    }

    const normalized = senderId.replace(/\s+/g, "").toUpperCase();
    if (normalized.length > 11) {
      return res.status(400).json({ message: "Sender ID must be at most 11 characters" });
    }
    if (!/^[A-Z0-9]{1,11}$/.test(normalized)) {
      return res.status(400).json({ message: "Sender ID must contain letters and numbers only (no spaces or symbols)" });
    }

    if (normalized !== senderId) {
      church.sender_id = normalized;
    }

    church.sender_id_status = "approved";
    church.sender_id_approved_at = new Date();
    await church.save();

    return res.status(200).json({
      message: "Sender ID approved",
      data: church
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const rejectChurchSenderId = async (req, res) => {
  try {
    const id = String(req.params?.id || "").trim();
    if (!id) return res.status(400).json({ message: "Church id is required" });

    const church = await Church.findById(id);
    if (!church) return res.status(404).json({ message: "Church not found" });

    church.sender_id_status = "rejected";
    church.sender_id_approved_at = null;
    await church.save();

    return res.status(200).json({
      message: "Sender ID rejected",
      data: church
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
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
  getSystemReferralHistory,
  getGlobalAnnouncementWalletKpis,
  listChurchSenderIdRequests,
  approveChurchSenderId,
  rejectChurchSenderId
};