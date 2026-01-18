import GeneralExpenses from "../models/generalExpenseModel.js";

const createGeneralExpenses = async (req, res) => {
    try {
        const { category, amount, description, date, paymentMethod} = req.body;

        if (!amount || !date) {
            return res.status(400).json({ message: "Amount and date are required." });
        }

        const generalExpenses = await GeneralExpenses.create({
            category,
            amount,
            description,
            date,
            paymentMethod,
            church:  req.activeChurch._id,
            createdBy: req.user._id
        });

        return res.status(201).json({ message: "General Expenses created successfully", generalExpenses });
    } catch (error) {
        return res.status(400).json({ message: "General Expenses could not be created", error: error.message });
    }
}

const getAllGeneralExpenses = async (req, res) => {
    try {

        const { page = 1, limit = 10, category, dateFrom, dateTo } = req.query;
                                
                const pageNum = Math.max(1, parseInt(page, 10) || 1);
                const limitNum = Math.max(1, parseInt(limit, 10) || 10);
                const skip = (pageNum - 1) * limitNum;
            
                // MAIN QUERY
                const query = {
                  church: req.activeChurch._id
                };
            
                // Restrict by church for non-admins
                // if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                //     query.church = req.user.church;
                // }
            
                // Filter by serviceType
                if (category) {
                    query.category = category;
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
            
                // FETCH GENERAL EXPENSES
                const generalExpenses = await GeneralExpenses.find(query)
                .select("category amount description date paymentMethod status createdBy")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
            
                  
                // COUNT TOTAL GENERAL EXPENSES
                const totalgeneralExpenses = await GeneralExpenses.countDocuments(query);
            
                    // PAGINATION DETAILS
                const totalPages = Math.ceil(totalgeneralExpenses / limitNum);
                const pagination = {
                    totalResult: totalgeneralExpenses,
                    totalPages,
                    currentPage: pageNum,
                    hasPrev: pageNum > 1,
                    hasNext: pageNum < totalPages,
                    prevPage: pageNum > 1 ? pageNum - 1 : null,
                    nextPage: pageNum < totalPages ? pageNum + 1 : null,
                };
            
                // IF NO RESULTS
                if (!generalExpenses || generalExpenses.length === 0) {
                    return res.status(200).json({
                    message: "No generalExpenses record found.",
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
                    generalExpenses: [],
                    });
                }
            
                
                // SUCCESS RESPONSE
                console.log("general expense fetched successfully")
                return res.status(200).json({
                    message: "general Expenses fetched successfully",
                    pagination,
                    count: generalExpenses.length,
                    generalExpenses
                });

    } catch (error) {
        return res.status(400).json({ message: "General Expenses could not be fetched", error: error.message });
    }
}



//update general expenses
const updateGeneralExpenses = async (req, res) => {
    try {

        const {id} = req.params;
        const query = {
          _id: id,
           church: req.activeChurch._id
        }

    
        const generalExpenses = await GeneralExpenses.findOneAndUpdate(query, req.body, {
            new: true,
            runValidators: true
        });

        if(!generalExpenses) {
            return res.status(404).json({message: "General Expenses not found"})
        }

        return res.status(200).json({ message: "General Expenses updated successfully", generalExpenses });
    } catch (error) {
        return res.status(400).json({ message: "General Expenses could not be updated", error: error.message });
    }
}


//delete general expenses
const deleteGeneralExpenses = async (req, res) => {
    try {

          const {id} = req.params;
        const query = {
          _id: id,
         church: req.activeChurch._id}


        const generalExpenses = await GeneralExpenses.findOneAndDelete(query);

        if(!generalExpenses) {
            return res.status(404).json({message: "General Expenses not found"})
        }   
        return res.status(200).json({ message: "General Expenses deleted successfully", generalExpenses });
    } catch (error) {
        return res.status(400).json({ message: "General Expenses could not be deleted", error: error.message });
    }
}



//get expenses KPI

const getGeneralExpensesKPI = async (req, res) => {
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


    // if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
    //   query.church = req.user.church;
    // }

    // ---- Aggregations ----
    const [week, month, lastMonth, year] = await Promise.all([
      // This week
      GeneralExpenses.aggregate([
        { $match: { ...query, date: { $gte: startOfWeek } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      // This month
      GeneralExpenses.aggregate([
        { $match: { ...query, date: { $gte: startOfMonth } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      // Last month
      GeneralExpenses.aggregate([
        {
          $match: {
            ...query,
            date: { $gte: startOfLastMonth, $lte: endOfLastMonth }
          }
        },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      // This year
      GeneralExpenses.aggregate([
        { $match: { ...query, date: { $gte: startOfYear } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ])
    ]);

    return res.status(200).json({
      message: "general Expenses KPI fetched successfully",
      data: {
        thisWeek: week[0]?.totalAmount || 0,
        thisMonth: month[0]?.totalAmount || 0,
        lastMonth: lastMonth[0]?.totalAmount || 0,
        thisYear: year[0]?.totalAmount || 0
      }
    });

  } catch (error) {
    return res.status(400).json({
      message: "generalExpenses KPI could not be fetched",
      error: error.message
    });
  }
};




export { createGeneralExpenses, getAllGeneralExpenses, updateGeneralExpenses, deleteGeneralExpenses, getGeneralExpensesKPI }