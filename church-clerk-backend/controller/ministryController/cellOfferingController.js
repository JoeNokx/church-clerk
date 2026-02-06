import Offering from "../../models/ministryModel/cellOfferingModel.js";
import Cell from "../../models/ministryModel/cellModel.js";

const createCellOffering = async (req, res) => {
  try {
    const { cellId } = req.params;
    const { date, amount, note } = req.body;

    if (!date || !amount) {
      return res.status(400).json({ message: "date and amount are required" });
    }

    const churchId = req.activeChurch?._id || req.user?.church;

    const cell = await Cell.findOne({ _id: cellId, church: churchId });
    if (!cell) {
      return res.status(404).json({ message: "Cell not found" });
    }

    const offering = await Offering.create({
      cell: cellId,
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

const getAllCellOfferings = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const { cellId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const query = { cell: cellId, church: churchId };

    const offerings = await Offering.find(query)
      .select("date amount note cell createdBy")
      .populate("cell", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalCellOfferings = await Offering.countDocuments(query);

    if (!offerings || offerings.length === 0) {
      return res.status(200).json({
        message: "No Offering found.",
        stats: {
          totalCellOfferings: 0
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

    const totalPages = Math.ceil(totalCellOfferings / limitNum);

    const pagination = {
      totalResult: totalCellOfferings,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null
    };

    return res.status(200).json({
      message: "All cell Offerings",
      stats: {
        totalCellOfferings
      },
      pagination,
      count: offerings.length,
      offerings
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updateCellOffering = async (req, res) => {
  try {
    const { cellId, offeringId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const cell = await Cell.findOne({ _id: cellId, church: churchId });
    if (!cell) {
      return res.status(404).json({ message: "Cell not found" });
    }

    const offering = await Offering.findOneAndUpdate(
      { _id: offeringId, cell: cellId, church: churchId },
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

const deleteCellOffering = async (req, res) => {
  try {
    const { cellId, offeringId } = req.params;
    const churchId = req.activeChurch?._id || req.user?.church;

    const cell = await Cell.findOne({ _id: cellId, church: churchId });
    if (!cell) {
      return res.status(404).json({ message: "Cell not found" });
    }

    const offering = await Offering.findOneAndDelete({ _id: offeringId, cell: cellId, church: churchId });

    if (!offering) {
      return res.status(404).json({ message: "Offering not found" });
    }

    return res.status(200).json({ message: "Offering deleted successfully", offering });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export { createCellOffering, updateCellOffering, deleteCellOffering, getAllCellOfferings };
