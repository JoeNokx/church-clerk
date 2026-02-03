import Offering from "../../models/financeModel/offeringModel.js";

const createOffering = async (req, res) => {
    
    try {
          const {serviceType, offeringType, serviceDate, amount} = req.body;
        
                if (!serviceType || !offeringType || !serviceDate || !amount) {
                    return res.status(400).json({ message: "All fields for offering are required" });
                  }
        
                  const offering = await Offering.create({
                    serviceType,
                    offeringType,
                    serviceDate,
                    amount,
                    church: req.activeChurch._id,
                    createdBy: req.user._id
                  })
        
                  return res.status(201).json({message: "offering created successfully", offering})
    } catch (error) {
        return res.status(400).json({message: "offering could not be created", error: error.message})
    }
}



const getAllOfferings = async (req, res) => {
    
    try {
        
         const { page = 1, limit = 10, serviceType, dateFrom, dateTo } = req.query;
        
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
        
            // Filter by serviceType
            if (serviceType) {
              query.serviceType = serviceType;
            }
        
         // Filter by date range
        if (dateFrom || dateTo) {
          query.serviceDate = {};
        
          // Filter from a starting date
          if (dateFrom) {
            const startDate = new Date(dateFrom);
            startDate.setHours(0, 0, 0, 0); // Start of the day
            query.serviceDate.$gte = startDate;
          }
        
          // Filter up to an ending date
          if (dateTo) {
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999); // End of the day
            query.serviceDate.$lte = endDate;
          }
        }
        
            // FETCH offerings
            const offerings = await Offering.find(query)
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(limitNum)
              .lean();
        
            // COUNT TOTAL ATTENDANCES
            const totalOfferings = await Offering.countDocuments(query);
        
             // PAGINATION DETAILS
            const totalPages = Math.ceil(totalOfferings / limitNum);
            const pagination = {
              totalResult: totalOfferings,
              totalPages,
              currentPage: pageNum,
              hasPrev: pageNum > 1,
              hasNext: pageNum < totalPages,
              prevPage: pageNum > 1 ? pageNum - 1 : null,
              nextPage: pageNum < totalPages ? pageNum + 1 : null,
            };
        
            // IF NO RESULTS
            if (!offerings || offerings.length === 0) {
              return res.status(200).json({
                message: "No offering found.",
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
                offerings: [],
              });
            }
        
           
            // SUCCESS RESPONSE
            return res.status(200).json({
              message: "offerings fetched successfully",
              pagination,
              count: offerings.length,
              offerings
            })

    } catch (error) {
        return res.status(400).json({message: "offerings could not be fetched", error: error.message})
    }
}


const updateOffering = async (req, res) => {
    
    try {
             const {id} = req.params;
                const query = { _id: id, church: req.activeChurch._id }
        
                const offering = await Offering.findOneAndUpdate(query, req.body, {
                    new: true,
                    runValidators: true
                })
        
                if(!offering) {
                    return res.status(404).json({message: "offering not found"})
                }
        
                return res.status(200).json({message: "offering updated successfully", offering})
    } catch (error) {
        return res.status(400).json({message: "offering could not be updated", error: error.message})
    }
}


const deleteOffering = async (req, res) => {
    
    try {
         const {id} = req.params;
                const query = { _id: id, church: req.activeChurch._id }
                
                const offering = await Offering.findOneAndDelete(query)
        
                if(!offering) {
                    return res.status(404).json({message: "offering not found"})
                }
        
                return res.status(200).json({message: "offering deleted successfully", offering})
    } catch (error) {
        return res.status(400).json({message: "offering could not be deleted", error: error.message})
    }
}


//get Offering KPI

const getOfferingKPI = async (req, res) => {
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
    const [week, month, lastMonth, year] = await Promise.all([
      // This week
      Offering.aggregate([
        { $match: { ...query, serviceDate: { $gte: startOfWeek } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      // This month
      Offering.aggregate([
        { $match: { ...query, serviceDate: { $gte: startOfMonth } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      // Last month
      Offering.aggregate([
        {
          $match: {
            ...query,
            serviceDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }
          }
        },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      // This year
      Offering.aggregate([
        { $match: { ...query, serviceDate: { $gte: startOfYear } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ])
    ]);

    return res.status(200).json({
      message: "Offering KPI fetched successfully",
      data: {
        thisWeek: week[0]?.totalAmount || 0,
        thisMonth: month[0]?.totalAmount || 0,
        lastMonth: lastMonth[0]?.totalAmount || 0,
        thisYear: year[0]?.totalAmount || 0
      }
    });

  } catch (error) {
    return res.status(400).json({
      message: "Offering KPI could not be fetched",
      error: error.message
    });
  }
};


export {createOffering, getAllOfferings, updateOffering, deleteOffering, getOfferingKPI}

