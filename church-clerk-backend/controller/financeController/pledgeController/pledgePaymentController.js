import PledgePayment from "../../../models/financeModel/pledgeModel/pledgePaymentModel.js";
import Pledge from "../../../models/financeModel/pledgeModel/pledgeModel.js";

const syncPledgeStatus = async ({ pledgeId, churchId }) => {
  const pledgeQuery = { _id: pledgeId };
  if (churchId) pledgeQuery.church = churchId;

  const pledge = await Pledge.findOne(pledgeQuery).select("amount status");
  if (!pledge) return;

  const match = { pledge: pledge._id };
  if (churchId) match.church = churchId;

  const totals = await PledgePayment.aggregate([
    { $match: match },
    { $group: { _id: null, totalPaid: { $sum: "$amount" } } }
  ]);

  const totalPaid = Number(totals?.[0]?.totalPaid || 0);
  const nextStatus = totalPaid >= Number(pledge.amount || 0) ? "Completed" : "In Progress";

  if (pledge.status !== nextStatus) {
    pledge.status = nextStatus;
    await pledge.save();
  }
};

// CREATE a payment
const createPledgePayment = async (req, res) => {
  try {
    const { pledgeId } = req.params;
    const { paymentDate, amount, paymentMethod, note } = req.body;

    if (!paymentDate || !amount || !paymentMethod) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const pledgeQuery = { _id: pledgeId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      pledgeQuery.church = req.activeChurch._id;
    }

    const pledge = await Pledge.findOne(pledgeQuery);
    if (!pledge) {
      return res.status(404).json({ message: "Pledge not found" });
    }

    const pledgePayment = await PledgePayment.create({
      church: pledge.church,
      pledge: pledgeId,
      paymentDate,
      amount,
      paymentMethod,
      note,
      createdBy: req.user._id
    });

    await syncPledgeStatus({
      pledgeId,
      churchId: req.user.role !== "superadmin" && req.user.role !== "supportadmin" ? req.activeChurch._id : null
    });

    console.log("Payment recorded successfully")
    return res.status(201).json({
      message: "Payment recorded successfully",
      pledgePayment
    });
  } catch (error) {
    console.log(error)
    return res.status(400).json({ message: "Payment could not be created", error: error.message });
  }
};

// GET all payments for a pledge
const getAllPledgePayments = async (req, res) => {
  try {
    const { pledgeId } = req.params;

    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const pledgeQuery = { _id: pledgeId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      pledgeQuery.church = req.activeChurch._id;
    }

    const pledge = await Pledge.findOne(pledgeQuery);
    if (!pledge) {
      return res.status(404).json({ message: "Pledge not found" });
    }

    // MAIN QUERY
    const query = { pledge: pledgeId };

    // Restrict by church for non-admins
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    // FETCH ATTENDANCES
    const pledgePayments = await PledgePayment.find(query)
      .select("paymentDate amount paymentMethod note createdBy")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // pledge amount
    const amountPledged = pledge.amount;

    // Calculate totalPaid (all payments, not just current page)
    const totals = await PledgePayment.aggregate([
      { $match: query },
      { $group: { _id: null, totalPaid: { $sum: "$amount" } } }
    ]);

    const totalPaid = Number(totals?.[0]?.totalPaid || 0);

    // Remaining balance
    const remainingBalance = pledge.amount - totalPaid;

    // Count total payments
    const totalPledges = await PledgePayment.countDocuments(query);

    // PAGINATION DETAILS
    const totalPages = Math.ceil(totalPledges / limitNum);
    const pagination = {
      totalResult: totalPledges,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    };

    // IF NO RESULTS
    if (!pledgePayments || pledgePayments.length === 0) {
      return res.status(200).json({
        message: "No pledgePayments record found.",
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
        pledgePayments: [],
        amountPledged: pledge.amount,
        totalPaid: 0,
        remainingBalance: pledge.amount
      });
    }

    // SUCCESS RESPONSE
    return res.status(200).json({
      message: "pledgePayments fetched successfully",
      pagination,
      count: pledgePayments.length,
      amountPledged,
      totalPaid,
      remainingBalance,
      pledgePayments
    });
  } catch (error) {
    return res.status(400).json({ message: "pledgePayments could not be fetched", error: error.message });
  }
};

// UPDATE a payment
const updatePledgePayment = async (req, res) => {
  try {
    const { pledgeId, id } = req.params;
    const updates = req.body;

    const query = { _id: id, pledge: pledgeId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    const payment = await PledgePayment.findOneAndUpdate(
      query,
      updates,
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    await syncPledgeStatus({
      pledgeId,
      churchId: req.user.role !== "superadmin" && req.user.role !== "supportadmin" ? req.activeChurch._id : null
    });

    return res.status(200).json({
      message: "Payment updated successfully",
      payment
    });
  } catch (error) {
    return res.status(400).json({ message: "Payment could not be updated", error: error.message });
  }
};

// DELETE a payment
const deletePledgePayment = async (req, res) => {
  try {
    const { pledgeId, id } = req.params;

    const query = { _id: id, pledge: pledgeId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    const payment = await PledgePayment.findOneAndDelete(query);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    await syncPledgeStatus({
      pledgeId,
      churchId: req.user.role !== "superadmin" && req.user.role !== "supportadmin" ? req.activeChurch._id : null
    });

    return res.status(200).json({
      message: "Payment deleted successfully",
      payment
    });
  } catch (error) {
    return res.status(400).json({ message: "Payment could not be deleted", error: error.message });
  }
};


export {createPledgePayment, getAllPledgePayments, updatePledgePayment, deletePledgePayment}