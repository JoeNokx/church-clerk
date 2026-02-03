import SpecialFund from "../../models/financeModel/specialFundModel.js";
import Member from "../../models/memberModel.js";

const createSpecialFund = async (req, res) => {
    
    try {
    const { giverName, category, totalAmount, description, givingDate } = req.body;

    if (!giverName || !totalAmount || !givingDate || !category) {
      return res.status(400).json({ message: "Amount and date are required." });
    }

    // Create special fund record
    const specialFund = await SpecialFund.create({
      giverName,
      category,
      totalAmount,
      givingDate,
      description,
      church: req.activeChurch._id,
      createdBy: req.user._id
    });

    return res.status(200).json({
      message: "Special fund created successfully",
      specialFund
    });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}



const getAllSpecialFunds = async (req, res) => {
    
    try {
         const { page = 1, limit = 10, search = "", category, dateFrom, dateTo } = req.query;
                        
           
          // ---- Validate date query params ----
    if (dateFrom && isNaN(Date.parse(dateFrom))) {
      return res.status(400).json({ message: "Invalid dateFrom" });
    }

    if (dateTo && isNaN(Date.parse(dateTo))) {
      return res.status(400).json({ message: "Invalid dateTo" });
    }
  
      // PAGINATION
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 10);
      const skip = (pageNum - 1) * limitNum;
  
      // MAIN QUERY
      const query = {
        church: req.activeChurch._id
      };

      if (search) {
        query.$or = [
          { giverName: { $regex: search, $options: "i" } }
        ];
      }
  
      // Filter by category
      if (category) {
        query.category = category;
      }
  
    // Filter by date range
  if (dateFrom || dateTo) {
    query.givingDate = {};
  
    // Filter from a starting date
    if (dateFrom) {
      const startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0); // Start of the day
      query.givingDate.$gte = startDate;
    }
  
    // Filter up to an ending date
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999); // End of the day
      query.givingDate.$lte = endDate;
    }
  }
  
      // FETCH special funds
      const specialFund = await SpecialFund.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
  
        
      // COUNT TOTAL ATTENDANCES
      const totalspecialFund = await SpecialFund.countDocuments(query);
  
        // PAGINATION DETAILS
      const totalPages = Math.ceil(totalspecialFund / limitNum);
      const pagination = {
        totalResult: totalspecialFund,
        totalPages,
        currentPage: pageNum,
        hasPrev: pageNum > 1,
        hasNext: pageNum < totalPages,
        prevPage: pageNum > 1 ? pageNum - 1 : null,
        nextPage: pageNum < totalPages ? pageNum + 1 : null,
      };
  
      // IF NO RESULTS
      if (!specialFund || specialFund.length === 0) {
        return res.status(200).json({
          message: "No specialFund record found.",
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
          specialFund: [],
        });
      }
  
      
      // SUCCESS RESPONSE
      return res.status(200).json({
        message: "specialFund fetched successfully",
        pagination,
        count: specialFund.length,
        specialFund
      })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}


const updateSpecialFund = async (req, res) => {
    
    try {
          const {id} = req.params;
      const query = {
        _id: id,
        church: req.activeChurch._id
      }

      const specialFund = await SpecialFund.findOneAndUpdate(query, req.body, {
          new: true,
          runValidators: true
      })

      if(!specialFund) {
          return res.status(404).json({message: "specialFund not found"})
      }

      return res.status(200).json({message: "specialFund updated successfully", specialFund})
    } catch (error) {
        return res.status(400).json({message: "specialFund could not be updated", error: error.message})
    }
}



const deleteSpecialFund = async (req, res) => {
    
    try {
          const {id} = req.params;
            const query = {
              _id: id,
              church: req.activeChurch._id
            }
            
            const specialFund = await SpecialFund.findOneAndDelete(query)
    
            if(!specialFund) {
                return res.status(404).json({message: "specialFund not found"})
            }
    
            return res.status(200).json({message: "specialFund deleted successfully", specialFund})
    } catch (error) {
        return res.status(400).json({message: "specialFund could not be deleted", error: error.message})   
    }
}


//get SpecialFund KPI

const getSpecialFundKPI = async (req, res) => {
  try {
    const now = new Date();

    // ---- Date ranges ----

    // Start of week (Monday)
    const startOfWeek = new Date(now);
    const day = now.getDay() || 7;
    startOfWeek.setDate(now.getDate() - day + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Start of last month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    startOfLastMonth.setHours(0, 0, 0, 0);

    // End of last month
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    endOfLastMonth.setHours(23, 59, 59, 999);

    // Start of year
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    // ---- Query (matches your pattern) ----
    const query = {
      church: req.activeChurch._id
    };

    // ---- Aggregations ----
    const [week, month, lastMonth, year] = await Promise.all([
      // This week
      SpecialFund.aggregate([
        { $match: { ...query, givingDate: { $gte: startOfWeek } } },
        { $group: { _id: null, totalAmount: { $sum: "$totalAmount" } } }
      ]),

      // This month
      SpecialFund.aggregate([
        { $match: { ...query, givingDate: { $gte: startOfMonth } } },
        { $group: { _id: null, totalAmount: { $sum: "$totalAmount" } } }
      ]),

      // Last month
      SpecialFund.aggregate([
        {
          $match: {...query, givingDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }}
        },
        { $group: { _id: null, totalAmount: { $sum: "$totalAmount" } } }
      ]),

      // This year
      SpecialFund.aggregate([
        { $match: { ...query, givingDate: { $gte: startOfYear } } },
        { $group: { _id: null, totalAmount: { $sum: "$totalAmount" } } }
      ])
    ]);

    return res.status(200).json({
      message: "SpecialFund KPI fetched successfully",
      data: {
        thisWeek: week[0]?.totalAmount || 0,
        thisMonth: month[0]?.totalAmount || 0,
        lastMonth: lastMonth[0]?.totalAmount || 0,
        thisYear: year[0]?.totalAmount || 0
      }
    });

  } catch (error) {
    return res.status(400).json({
      message: "SpecialFund KPI could not be fetched",
      error: error.message
    });
  }
};



export { createSpecialFund, getAllSpecialFunds, updateSpecialFund, deleteSpecialFund, getSpecialFundKPI }
