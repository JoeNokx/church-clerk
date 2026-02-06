import Church from "../models/churchModel.js";
import User from "../models/userModel.js";

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
      email,
      streetAddress,
      city,
      region,
      country,
      foundedDate,
      referralCodeInput
    } = req.body;

    if (!name || !type || !phoneNumber || !city) {
      return res.status(400).json({
        message: "Church name, city, phone number and type are required"
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
    .select("_id name city region")
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
      query._id = req.user.church;
    }


    const church = await Church.findOne(query)
     .populate("createdBy", "fullName email")
     
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
      query._id = req.activeChurch?._id || req.user.church;
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
    if (headquarters.type !== "Headquarters") {
      return res.status(403).json({
        message: "Only headquarters churches can view branches"
      });
    }

    // Branch query
    const query = {
        parentChurch: req.activeChurch._id

    };

    // Search
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { name: regex },
        { city: regex },
        { region: regex }
      ];
    }

    const branches = await Church.find(query)
      .select("name city region phoneNumber email memberCount")
      .populate("createdBy", "fullName phoneNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalBranches = await Church.countDocuments(query);
    const totalPages = Math.ceil(totalBranches / limitNum);

   
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

          console.log("ACTIVE:", req.activeChurch.name, req.activeChurch.type);

            // SUCCESS RESPONSE
          return res.status(200).json({
            message: "branches fetched successfully",
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