import Church from "../models/churchModel.js";
import User from "../models/userModel.js";
import Subscription from "../models/billingModel/subscriptionModel.js";
import { sendEmail } from "../services/emailService.js";
import { validatePhoneNumber } from "../utils/validatePhoneNumber.js";
import { AFRICAN_CURRENCY_CODES } from "../utils/africanCurrencies.js";
import { isCurrencyLockedForChurch } from "../utils/isCurrencyLockedForChurch.js";

// referral models
import ReferralCode from "../models/referralModel/referralCodeModel.js";
import ReferralHistory from "../models/referralModel/referralHistoryModel.js";
import { generateReferralCode } from "../utils/generateReferralCode.js";

const createMyChurch = async (req, res) => {
  try {
    if (req.user?.isEmailVerified === false) {
      return res.status(403).json({
        message: "Please verify your email to continue.",
        needsEmailVerification: true
      });
    }

    const {
      name,
      type,
      parentChurchId,
      phoneNumber,
      pastor,
      email,
      streetAddress,
      city,
      region,
      country,
      currency,
      foundedDate,
      referralCodeInput
    } = req.body;

    if (!name || !type || !phoneNumber || !pastor || !city) {
      return res.status(400).json({
        message: "Church name, pastor, city, phone number and type are required"
      });
    }

    let validatedPhoneNumber;
    try {
      validatedPhoneNumber = validatePhoneNumber(phoneNumber, "GH");
    } catch (e) {
      return res.status(400).json({ message: e?.message || "Invalid phone number" });
    }

    let parentChurch = null;
    if (type === "Branch") {
      if (!parentChurchId) {
        return res.status(400).json({ message: "Branch must belong to HQ" });
      }

      const hq = await Church.findById(parentChurchId);
      if (!hq || hq.type !== "Headquarters") {
        return res.status(400).json({ message: "Invalid HQ selected" });
      }
      parentChurch = hq._id;
    }

    if (type !== "Branch") {
      parentChurch = null;
    }

    const requestedCurrency = String(currency || "").trim().toUpperCase();
    const finalCurrency = requestedCurrency || "GHS";
    if (!AFRICAN_CURRENCY_CODES.includes(finalCurrency)) {
      return res.status(400).json({ message: "Currency must be an African currency" });
    }

    const church = await Church.create({
      name,
      type,
      parentChurch,
      phoneNumber: validatedPhoneNumber,
      pastor,
      email,
      streetAddress,
      city,
      region,
      country,
      currency: finalCurrency,
      foundedDate,
      referralCodeInput,
      createdBy: req.user._id
    });

    const newReferralCode = generateReferralCode(name);
    await ReferralCode.create({
      church: church._id,
      code: newReferralCode
    });

    if (referralCodeInput) {
      const referrerCode = await ReferralCode.findOne({
        code: String(referralCodeInput || "").toUpperCase()
      });

      if (!referrerCode) {
        return res.status(400).json({
          message: "Invalid referral code. Please check and try again."
        });
      }

      if (referrerCode && referrerCode.church.toString() !== church._id.toString()) {
        const existingReferral = await ReferralHistory.findOne({
          referredChurch: church._id
        });

        if (!existingReferral) {
          await ReferralHistory.create({
            referrerChurch: referrerCode.church,
            referredChurch: church._id,
            referredChurchEmail: email
          });
        }
      }
    }

    const existingUsersInChurch = await User.countDocuments({ church: church._id });

    const setRole =
      existingUsersInChurch === 0 &&
      req.user.role !== "superadmin" &&
      req.user.role !== "supportadmin"
        ? "churchadmin"
        : req.user.role;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { church: church._id, role: setRole },
      { new: true }
    );

    try {
      const recipient = updatedUser?.email || req.user?.email;
      if (recipient) {
        await sendEmail({
          to: recipient,
          subject: "Welcome to Church Clerk",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2 style="margin: 0 0 12px;">Welcome to Church Clerk</h2>
              <p>Hello ${updatedUser?.fullName || req.user?.fullName || ""},</p>
              <p>Your church <strong>${church?.name || ""}</strong> has been set up successfully. You can now start managing members, events, finances, and more.</p>
            </div>
          `
        });
      }
    } catch {
      void 0;
    }

    return res.status(201).json({
      message: "Church created successfully. You now belong to a church.",
      churchId: church._id,
      type: church.type,
      parentChurch: church.parentChurch,
      user: {
        userId: updatedUser._id,
        fullName: updatedUser.fullName,
        church: updatedUser.church
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const searchHeadquartersChurches = async (req, res) => {
  try {
    const { search = "" } = req.query;
    if (!String(search || "").trim()) return res.status(200).json([]);

    const churches = await Church.find({
      type: "Headquarters",
      name: { $regex: search, $options: "i" }
    })
      .select("_id name city region createdBy")
      .populate("createdBy", "fullName")
      .limit(10)
      .lean();

    if (!churches.length) return res.status(200).json({ message: "No church matched your search" });

    return res.status(200).json(churches);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET My Church Profile
const getMyChurchProfile = async (req, res) => {
  try {
    const query = {};

    //  Only superadmin and supportadmin can choose which church to view
    if (req.user.role === "superadmin" || req.user.role === "supportadmin") {
      if (!req.params.id) {
        return res.status(400).json({ message: "Church ID is required" });
      }
      query._id = req.params.id;
    } 
    // Everyone else sees ONLY their own church
    else {
      query._id = req.activeChurch._id;
    }

    const church = await Church.findOne(query)
     .populate("createdBy", "fullName email")
     .populate("parentChurch", "name city region type")
     
     .lean();
    if (!church) {
      return res.status(404).json({ message: "Church not found" });
    }

    const currencyLocked = await isCurrencyLockedForChurch(church._id);

    res.status(200).json({
      message: "Church profile fetched successfully",
      church: {
        ...church,
        currencyLocked
      }
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// UPDATE My Church Profile
const updateMyChurchProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.phoneNumber !== undefined) {
      const rawPhone = String(updateData.phoneNumber || "").trim();
      if (rawPhone) {
        try {
          updateData.phoneNumber = validatePhoneNumber(rawPhone, "GH");
        } catch (e) {
          return res.status(400).json({ message: e?.message || "Invalid phone number" });
        }
      } else {
        updateData.phoneNumber = "";
      }
    }

    // Build query based on role
    let query = {};

    if (req.user.role === "superadmin" || req.user.role === "supportadmin") {
      if (!id) {
        return res.status(400).json({ message: "Church ID is required" });
      }
      query._id = id;
    } else {
      // Non-admins can ONLY update their own church
      query._id = req.activeChurch._id;
    }

    //  Prevent invalid church type changes
    if (
      updateData.type &&
      !["Independent", "Branch", "Headquarters"].includes(updateData.type)
    ) {
      return res.status(400).json({ message: "Invalid church type" });
    }

    if (
      updateData.titheRecordingMode &&
      !["individual", "aggregate"].includes(updateData.titheRecordingMode)
    ) {
      return res.status(400).json({ message: "Invalid tithe recording mode" });
    }

    if (updateData.currency !== undefined) {
      const cur = String(updateData.currency || "").trim().toUpperCase();
      if (!cur || !/^[A-Z]{3}$/.test(cur)) {
        return res.status(400).json({ message: "Invalid currency" });
      }

      const lockId = query?._id;
      const locked = await isCurrencyLockedForChurch(lockId);
      if (locked) {
        const current = await Church.findById(lockId).select("currency").lean();
        const currentCur = String(current?.currency || "").trim().toUpperCase();

        if (currentCur !== cur) {
          return res.status(403).json({
            message: "Currency cannot be changed after transactions have been recorded"
          });
        }

        // Allow keeping legacy non-African currencies (do not force migration when locked)
        updateData.currency = currentCur;
      } else {
        if (!AFRICAN_CURRENCY_CODES.includes(cur)) {
          return res.status(400).json({ message: "Currency must be an African currency" });
        }
        updateData.currency = cur;
      }
    }

    /**
     * Branch → HQ validation
     *  Only allow parentChurch if type === "Branch"
     *  parentChurch must exist and be headquarters
     */
    if (updateData.type === "Branch" && updateData.parentChurch) {
      const hq = await Church.findById(updateData.parentChurch).lean();

      if (!hq || hq.type !== "Headquarters") {
        return res.status(400).json({
          message: "Invalid headquarters selected"
        });
      }
    }

    // Prevent illegal parentChurch usage
    if (updateData.type !== "Branch") {
      updateData.parentChurch = null;
    }

    // Update church
    const updatedChurch = await Church.findOneAndUpdate(
      query,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).lean();

    if (!updatedChurch) {
      return res.status(404).json({
        message: "Church not found or not authorized"
      });
    }

    return res.status(200).json({
      message: "Church profile updated successfully",
      church: {
        ...updatedChurch,
        currencyLocked: await isCurrencyLockedForChurch(updatedChurch?._id)
      }
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to update church profile",
      error: error.message
    });
  }
};



//headquarters branch churches

const getMyBranches = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    // ALWAYS use active church
    const headquarters = req.activeChurch;

    //  Ensure it's HQ
    if (String(headquarters?.type || "").toLowerCase() !== "headquarters") {
      return res.status(403).json({
        message: "Only headquarters churches can view branches"
      });
    }

    const baseQuery = {
      parentChurch: req.activeChurch._id
    };

    const query = {
      ...baseQuery
    };

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { name: regex },
        { pastor: regex },
        { streetAddress: regex },
        { city: regex },
        { region: regex },
        { country: regex }
      ];
    }

    const branches = await Church.find(query)
      .select("name pastor streetAddress city region country phoneNumber email memberCount")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalBranches = await Church.countDocuments(query);
    const totalPages = Math.ceil(totalBranches / limitNum);

    const baseKpiAgg = await Church.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalBranches: { $sum: 1 },
          totalMembers: { $sum: { $ifNull: ["$memberCount", 0] } }
        }
      }
    ]);

    const totalBranchesAll = Number(baseKpiAgg?.[0]?.totalBranches || 0);
    const totalMembersAll = Number(baseKpiAgg?.[0]?.totalMembers || 0);

    const branchIds = await Church.find(baseQuery).select("_id").lean();
    const branchIdList = branchIds.map((b) => b._id);

    const activeBranches = branchIdList.length
      ? await Subscription.countDocuments({
          church: { $in: branchIdList },
          status: { $in: ["free trial", "active", "past_due"] }
        })
      : 0;

    const pagination = {
      totalResult: totalBranches,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null
    }

    if (!branches || branches.length === 0) {
      return res.status(200).json({
        message: "No branches church found.",
        kpis: {
          totalBranches: totalBranchesAll,
          totalMembers: totalMembersAll,
          activeBranches
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
        branches: [],
      });
    }

    // SUCCESS RESPONSE
    return res.status(200).json({
      message: "branches fetched successfully",
      kpis: {
        totalBranches: totalBranchesAll,
        totalMembers: totalMembersAll,
        activeBranches
      },
      pagination,
      count: branches.length,
      branches
    })
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//view spcified modules by branch or hq

const getActiveChurchContext = (req, res) => {
  const { _id, name, type, parentChurch, canEdit, visibleModules, titheRecordingMode, currency } = req.activeChurch;

  res.status(200).json({
    message: "Church context fetched",
    activeChurch: {
      _id,
      name,
      type,
      parentChurch: parentChurch || null,
      canEdit,
      visibleModules,
      titheRecordingMode,
      currency
    }
  });
};


const requestMyChurchSenderId = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const planName = String(req.plan?.name || "").trim().toLowerCase();
    const subscriptionStatus = String(req.subscription?.status || "").trim().toLowerCase();
    const isTrial = subscriptionStatus === "free trial" || subscriptionStatus === "trialing";
    const allowedByPlan = isTrial || planName === "standard" || planName === "premium";

    if (!allowedByPlan) {
      return res.status(403).json({
        message: "Sender ID requests are available on Standard and Premium plans only"
      });
    }

    const raw = String(req.body?.senderId || "").trim();
    if (!raw) {
      return res.status(400).json({ message: "senderId is required" });
    }

    const normalized = raw.replace(/\s+/g, "").toUpperCase();

    if (normalized.length > 11) {
      return res.status(400).json({ message: "Sender ID must be at most 11 characters" });
    }

    if (!/^[A-Z0-9]{1,11}$/.test(normalized)) {
      return res.status(400).json({
        message: "Sender ID must contain letters and numbers only (no spaces or symbols)"
      });
    }

    const updated = await Church.findByIdAndUpdate(
      churchId,
      {
        $set: {
          sender_id: normalized,
          sender_id_status: "pending",
          sender_id_requested_at: new Date(),
          sender_id_approved_at: null
        }
      },
      { new: true, runValidators: true }
    ).lean();

    return res.status(200).json({
      message: "Sender ID request submitted",
      church: updated
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export {
  createMyChurch,
  searchHeadquartersChurches,
  getMyChurchProfile,
  updateMyChurchProfile,
  getMyBranches,
  getActiveChurchContext,
  requestMyChurchSenderId
}