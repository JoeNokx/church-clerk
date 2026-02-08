import Church from "../models/churchModel.js";
import User from "../models/userModel.js";
import Subscription from "../models/billingModel/subscriptionModel.js";

// referral models
import ReferralCode from "../models/referralModel/referralCodeModel.js";
import ReferralHistory from "../models/referralModel/referralHistoryModel.js";
import { generateReferralCode } from "../utils/generateReferralCode.js";


const createMyChurch = async (req, res) => {
  try {
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
      foundedDate,
      referralCodeInput
    } = req.body;

    if (!name || !type || !phoneNumber || !pastor || !city) {
      return res.status(400).json({
        message: "Church name, pastor, city, phone number and type are required"
      });
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

    // HQ & Independent should NOT have parent
    if (type !== "Branch") {
      parentChurch = null;
    }

    const church = await Church.create({
      name,
      type,
      parentChurch,
      phoneNumber,
      pastor,
      email,
      streetAddress,
      city,
      region,
      country,
      foundedDate,
      referralCodeInput,
      createdBy: req.user._id
    });

      // Create permanent unique referral code for THIS church
  const newReferralCode = generateReferralCode(name);

  await ReferralCode.create({
    church: church._id,
    code: newReferralCode
  });

  //Handle referral input (if provided)
  if (referralCodeInput) {
    const referrerCode = await ReferralCode.findOne({
      code: referralCodeInput.toUpperCase()
    });


     if (!referrerCode) {
    // Bounce back with error
    return res.status(400).json({
      message: "Invalid referral code. Please check and try again."
    });
  }

    if (referrerCode && referrerCode.church.toString() !== church._id.toString()) {

      //  PREVENT DOUBLE REFERRAL
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

  

     // Update the user to belong to this church
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { church: church._id },
      { new: true }
    );

    res.status(201).json({
     message: "Church created successfully. You now belong to a church.",
      churchId: church._id,
      type: church.type,
      parentChurch: church.parentChurch,
      user: {
        userId: updatedUser._id,
        fullName: updatedUser.fullName,
        church: updatedUser.church
      }
    })

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Search Headquarters (Autocomplete)
const searchHeadquartersChurches = async (req, res) => {
  try {
    const { search = "" } = req.query;
    if (!search.trim()) return res.status(200).json([]);

    const churches = await Church.find({
      type: "Headquarters",
      name: { $regex: search, $options: "i" }
    })
    .select("_id name city region createdBy")
    .populate("createdBy", "fullName")
    .limit(10)
    .lean();

    if(!churches.length) return res.status(200).json({message: "No church matched your search"});

    res.status(200).json(churches);

  } catch (error) {
    res.status(500).json({ message: error.message });
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

    res.status(200).json({
      message: "Church profile fetched successfully",
      church
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// UPDATE My Church Profile
const updateMyChurchProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

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
      church: updatedChurch
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
          status: { $in: ["trialing", "active", "past_due"] }
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
  const { _id, name, type, parentChurch, canEdit, visibleModules, titheRecordingMode } = req.activeChurch;

  res.status(200).json({
    message: "Church context fetched",
    activeChurch: { _id, name, type, parentChurch: parentChurch || null, canEdit, visibleModules, titheRecordingMode },
  });
};


export { createMyChurch, searchHeadquartersChurches, getMyChurchProfile, updateMyChurchProfile, getMyBranches, getActiveChurchContext }