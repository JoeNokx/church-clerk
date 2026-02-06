import TitheAggregate from '../../../models/financeModel/tithesModel/titheAggregateModel.js' 
import User from '../../../models/userModel.js'

const createTitheAggregate = async (req, res) => {
    
    try {
          const {date, amount, description} = req.body;
        
                if (!date || !amount || !description) {
                    return res.status(400).json({ message: "All fields for TitheAggregate are required" });
                  }
        
                  const titheAggregate = await TitheAggregate.create({
                    date,
                    description,
                    amount,
                    church: req.activeChurch._id,
                    createdBy: req.user._id
                  })
        
                  return res.status(201).json({message: "TitheAggregate created successfully", titheAggregate})
    } catch (error) {
        return res.status(400).json({message: "TitheAggregate could not be created", error: error.message})
    }
}



const getAllTitheAggregates = async (req, res) => {
    
    try {
        
         const { page = 1, limit = 10, search = "", dateFrom, dateTo } = req.query;
        
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
            const query = {};
        
            query.church = req.activeChurch._id;

        // Search by recorded by (user fullName/email/phone)
        if (search) {
          const regex = new RegExp(String(search).trim(), "i");
          const users = await User.find({
            church: req.activeChurch._id,
            $or: [{ fullName: regex }, { email: regex }, { phoneNumber: regex }]
          }).select("_id");

          const userIds = users.map((u) => u._id);
          query.createdBy = { $in: userIds.length ? userIds : [null] };
        }
        
          
         // Filter by date range
        if (dateFrom || dateTo) {
          query.date = {};
        
          // Filter from a starting date
          if (dateFrom) {
            const startDate = new Date(dateFrom);
            startDate.setHours(0, 0, 0, 0); // Start of the day
            query.date.$gte = startDate;
          }
        
          // Filter up to an ending date
          if (dateTo) {
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999); // End of the day
            query.date.$lte = endDate;
          }
        }
        
            // FETCH TitheAggregates
            const titheAggregates = await TitheAggregate.find(query)
              .populate("createdBy", "fullName email")
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(limitNum)
              .lean();
        
            // COUNT TOTAL ATTENDANCES
            const totalTitheAggregates = await TitheAggregate.countDocuments(query);
        
             // PAGINATION DETAILS
            const totalPages = Math.ceil(totalTitheAggregates / limitNum);
            const pagination = {
              totalResult: totalTitheAggregates,
              totalPages,
              currentPage: pageNum,
              hasPrev: pageNum > 1,
              hasNext: pageNum < totalPages,
              prevPage: pageNum > 1 ? pageNum - 1 : null,
              nextPage: pageNum < totalPages ? pageNum + 1 : null,
            };
        
            // IF NO RESULTS
            if (!titheAggregates || titheAggregates.length === 0) {
              return res.status(200).json({
                message: "No TitheAggregate found.",
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
                titheAggregates: [],
              });
            }
        
           
            // SUCCESS RESPONSE
            return res.status(200).json({
              message: "TitheAggregates fetched successfully",
              pagination,
              count: titheAggregates.length,
              titheAggregates
            })

    } catch (error) {
        return res.status(400).json({message: "TitheAggregates could not be fetched", error: error.message})
    }
}


const updateTitheAggregate = async (req, res) => {
    
    try {
             const {id} = req.params;
                const query = { _id: id, church: req.activeChurch._id }
        
                const titheAggregates = await TitheAggregate.findOneAndUpdate(query, req.body, {
                    new: true,
                    runValidators: true
                })
        
                if(!titheAggregates) {
                    return res.status(404).json({message: "TitheAggregate not found"})
                }
        
                return res.status(200).json({message: "TitheAggregate updated successfully", titheAggregates})
    } catch (error) {
        return res.status(400).json({message: "TitheAggregate could not be updated", error: error.message})
    }
}


const deleteTitheAggregate = async (req, res) => {
    
    try {
         const {id} = req.params;
                const query = { _id: id, church: req.activeChurch._id }
                
                const titheAggregates = await TitheAggregate.findOneAndDelete(query)
        
                if(!titheAggregates) {
                    return res.status(404).json({message: "TitheAggregate not found"})
                }
        
                return res.status(200).json({message: "TitheAggregate deleted successfully", titheAggregates})
    } catch (error) {
        return res.status(400).json({message: "TitheAggregate could not be deleted", error: error.message})
    }
}


//get TitheAggregate KPI

const getTitheAggregateKPI = async (req, res) => {
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
    const query = { church: req.activeChurch._id };

    // ---- Aggregations ----
    const [week, month, lastMonth, year, thisMonthCount] = await Promise.all([
      // This week
      TitheAggregate.aggregate([
        { $match: { ...query, date: { $gte: startOfWeek } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      // This month
      TitheAggregate.aggregate([
        { $match: { ...query, date: { $gte: startOfMonth } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      // Last month
      TitheAggregate.aggregate([
        {
          $match: {
            ...query,
            date: { $gte: startOfLastMonth, $lte: endOfLastMonth }
          }
        },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      // This year
      TitheAggregate.aggregate([
        { $match: { ...query, date: { $gte: startOfYear } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      // Total records this month
      TitheAggregate.countDocuments({ ...query, date: { $gte: startOfMonth } })
    ]);

    return res.status(200).json({
      message: "TitheAggregate KPI fetched successfully",
      data: {
        thisWeek: week[0]?.totalAmount || 0,
        thisMonth: month[0]?.totalAmount || 0,
        thisMonthRecords: thisMonthCount || 0,
        lastMonth: lastMonth[0]?.totalAmount || 0,
        thisYear: year[0]?.totalAmount || 0
      }
    });

  } catch (error) {
    return res.status(400).json({
      message: "TitheAggregate KPI could not be fetched",
      error: error.message
    });
  }
};


export {createTitheAggregate, getAllTitheAggregates, updateTitheAggregate, deleteTitheAggregate, getTitheAggregateKPI}

