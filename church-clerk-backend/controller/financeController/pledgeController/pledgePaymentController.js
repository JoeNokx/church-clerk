import PledgePayment from "../../../models/financeModel/pledgeModel/pledgePaymentModel.js";
import Pledge from "../../../models/financeModel/pledgeModel/pledgeModel.js";

// CREATE a payment
 const createPledgePayment = async (req, res) => {
  try {
    const { pledgeId } = req.params;
    const {  paymentDate, amount, paymentMethod, note } = req.body;

    if ( !paymentDate || !amount || !paymentMethod) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check pledge exists
    const pledge = await Pledge.findById(pledgeId);
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
    const { id, pledgeId } = req.params;

     const { page = 1, limit = 10 } = req.query;
                    
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, parseInt(limit, 10) || 10);
        const skip = (pageNum - 1) * limitNum;
    
        // MAIN QUERY
        const query = {payments: id, pledge: pledgeId};
    
        // Restrict by church for non-admins
        if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.user.church;
        }
    
        const pledge = await Pledge.findById(pledgeId);
        if (!pledge) {
            return res.status(404).json({ message: "Pledge not found" });
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

    // Calculate totalPaid
    const totalPaid = pledgePayments.reduce((sum, p) => sum + p.amount, 0);

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
    const { paymentId } = req.params;
    const updates = req.body;

    const payment = await PledgePayment.findOneAndUpdate(
      { _id: paymentId, church: req.user.church },
      updates,
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

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
    const { paymentId } = req.params;

    const payment = await PledgePayment.findOneAndDelete({
      _id: paymentId,
      church: req.user.church
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    return res.status(200).json({
      message: "Payment deleted successfully",
      payment
    });
  } catch (error) {
    return res.status(400).json({ message: "Payment could not be deleted", error: error.message });
  }
};


export {createPledgePayment, getAllPledgePayments, updatePledgePayment, deletePledgePayment}