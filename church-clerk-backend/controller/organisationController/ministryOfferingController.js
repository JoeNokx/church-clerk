import Offering from "../../models/organisationModel/ministryOfferingModel.js";
import Ministry from "../../models/organisationModel/ministryModel.js";

const createMinistryOffering = async (req, res) => {
  try {
    const { ministryId } = req.params;
    const { date, amount, note } = req.body;

    if (!date || !amount) {
      return res.status(400).json({ message: "date and amount are required" });
    }

    const churchId = req.activeChurch?._id || req.user?.church;

    const ministry = await Ministry.findOne({ _id: ministryId, church: churchId });
    if (!ministry) {
      return res.status(404).json({ message: "Ministry not found" });
    }

    const offering = await Offering.create({
      ministry: ministryId,
      church: churchId,
      createdBy: req.user._id,
      date,
      amount,
      note
    });

    return res.status(201).json({ message: "Offering recorded successfully", offering });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getAllMinistryOfferings = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const { ministryId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const query = { ministry: ministryId, church: churchId };

    if (search) {
      const User = (await import("../../models/userModel.js")).default;
      const matchingUsers = await User.find({ fullName: { $regex: search, $options: "i" } }, "_id").lean();
      query.createdBy = { $in: matchingUsers.length ? matchingUsers.map(u => u._id) : [] };
    }

    const offerings = await Offering.find(query)
      .select("date amount note ministry createdBy referenceId")
      .populate("ministry", "name")
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalMinistryOfferings = await Offering.countDocuments(query);

    if (!offerings || offerings.length === 0) {
      return res.status(200).json({
        message: "No Offering found.",
        stats: {
          totalMinistryOfferings: 0
        },
        pagination: {
          totalResult: 0,
          totalPages: 0,
          currentPage: pageNum,
          hasPrev: false,
          hasNext: false,
          prevPage: null,
          nextPage: null
        },
        count: 0,
        offerings: []
      });
    }

    const totalPages = Math.ceil(totalMinistryOfferings / limitNum);

    const pagination = {
      totalResult: totalMinistryOfferings,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null
    };

    return res.status(200).json({
      message: "All ministry Offerings",
      stats: {
        totalMinistryOfferings
      },
      pagination,
      count: offerings.length,
      offerings
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updateMinistryOffering = async (req, res) => {
  try {
    const { ministryId, offeringId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const ministry = await Ministry.findOne({ _id: ministryId, church: churchId });
    if (!ministry) {
      return res.status(404).json({ message: "Ministry not found" });
    }

    const offering = await Offering.findOneAndUpdate(
      { _id: offeringId, ministry: ministryId, church: churchId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!offering) {
      return res.status(404).json({ message: "Offering not found" });
    }

    return res.status(200).json({ message: "Offering updated successfully", offering });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const deleteMinistryOffering = async (req, res) => {
  try {
    const { ministryId, offeringId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const ministry = await Ministry.findOne({ _id: ministryId, church: churchId });
    if (!ministry) {
      return res.status(404).json({ message: "Ministry not found" });
    }

    const offering = await Offering.findOneAndDelete({ _id: offeringId, ministry: ministryId, church: churchId });

    if (!offering) {
      return res.status(404).json({ message: "Offering not found" });
    }

    return res.status(200).json({ message: "Offering deleted successfully", offering });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export { createMinistryOffering, updateMinistryOffering, deleteMinistryOffering, getAllMinistryOfferings };
