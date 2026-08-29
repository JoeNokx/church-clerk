import BusinessVentures from "../../../models/financeModel/businessModel/businessVenturesModel.js";
import BusinessIncome from "../../../models/financeModel/businessModel/businessIncomeModel.js";
import BusinessExpenses from "../../../models/financeModel/businessModel/businessExpensesModel.js";

import { validatePhoneNumber } from "../../../utils/validatePhoneNumber.js";


const createBusinessVentures = async (req, res) => {
    
    try {
          const {
                businessName,
                description,
                manager,
                phoneNumber,
                startDate
                } = req.body;
                
                if (!businessName || !description) {
                return res.status(400).json({ message: "Business name and description are required." });
                }

                let validatedPhoneNumber;
                if (phoneNumber !== undefined) {
                  const rawPhone = String(phoneNumber || "").trim();
                  if (rawPhone) {
                    try {
                      validatedPhoneNumber = validatePhoneNumber(rawPhone, "GH");
                    } catch (e) {
                      return res.status(400).json({ message: e?.message || "Invalid phone number" });
                    }
                  } else {
                    validatedPhoneNumber = "";
                  }
                }
        

                const businessVentures = await BusinessVentures.create({
                businessName,
                description,
                manager,
                phoneNumber: validatedPhoneNumber,
                startDate: startDate ? new Date(startDate) : new Date(),
                church: req.activeChurch._id,
                createdBy: req.user._id
                });
        
                return res.status(201).json({
                message: "business Ventures created successfully",
                businessVentures
                });
    } catch (error) {
        return res.status(400).json({message: "business Ventures could not be created", error: error.message})
    }
}



const getAllBusinessVentures = async (req, res) => {
    
    try {
        const { page = 1, limit = 10 } = req.query;
                                                
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, parseInt(limit, 10) || 10);
        const skip = (pageNum - 1) * limitNum;
    
        // MAIN QUERY
        const query = {};
    
        // Restrict by church for non-admins
        if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.activeChurch._id;
        }
    
        // FETCH ALL  BUSINESS VENTURES
        const businessVentures = await BusinessVentures.find(query)
        .select("businessName description manager phoneNumber createdBy referenceId startDate")
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();
            
          
    // FETCH ALL INCOME & EXPENSES ONCE
    const [incomes, expenses] = await Promise.all([
      BusinessIncome.find(query).lean(),
      BusinessExpenses.find(query).lean()
    ]);

    // CALCULATE TOTALS PER BUSINESS
    const businessWithTotals = businessVentures.map((biz) => {
      const totalIncome = incomes
        .filter(i => i.businessVentures?.toString() === biz._id.toString())
        .reduce((sum, i) => sum + i.amount, 0);

      const totalExpenses = expenses
        .filter(e => e.businessVentures?.toString() === biz._id.toString())
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        ...biz,
        totalIncome,
        totalExpenses,
        net: totalIncome - totalExpenses
      };
    });
                    
                // COUNT TOTAL GENERAL EXPENSES
                const totalbusinessVentures = await BusinessVentures.countDocuments(query);
            
                    // PAGINATION DETAILS
                const totalPages = Math.ceil(totalbusinessVentures / limitNum);
                const pagination = {
                    totalResult: totalbusinessVentures,
                    totalPages,
                    currentPage: pageNum,
                    hasPrev: pageNum > 1,
                    hasNext: pageNum < totalPages,
                    prevPage: pageNum > 1 ? pageNum - 1 : null,
                    nextPage: pageNum < totalPages ? pageNum + 1 : null,
                };
            
                // IF NO RESULTS
                if (!businessVentures || businessVentures.length === 0) {
                    return res.status(200).json({
                    message: "No business Ventures record found.",
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
                    businessVentures: []
                    });
                }
            
                
                // SUCCESS RESPONSE
                console.log("business Ventures fetched successfully")
                return res.status(200).json({
                    message: "business Ventures fetched successfully",
                    pagination,
                    count: businessWithTotals.length,
                    businessVentures: businessWithTotals
                });
    } catch (error) {
        return res.status(400).json({message: "business Ventures could not be fetched", error: error.message})
    }
}



const getSingleBusinessVentures = async (req, res) => {
    
    try {
         const {id} = req.params
            const query = {_id: id}
    
            if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                query.church = req.activeChurch._id
            }
          const businessVentures = await BusinessVentures.findOne(query)
                .select("businessName description manager phoneNumber createdBy")

                if(!businessVentures) {
                    return res.status(404).json({message: "business Venture not found"})
                }

                return res.status(200).json({message: "business Venture found successfully", businessVentures})
        
    } catch (error) {
        return res.status(400).json({message: "business Ventures could not be fetched", error: error.message})
    }
}


const updateBusinessVentures = async (req, res) => {
    
    try {
         const {id} = req.params
                const query = {_id: id}
        
                if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.activeChurch._id
                }

                if (req.body?.phoneNumber !== undefined) {
                  const rawPhone = String(req.body.phoneNumber || "").trim();
                  if (rawPhone) {
                    try {
                      req.body.phoneNumber = validatePhoneNumber(rawPhone, "GH");
                    } catch (e) {
                      return res.status(400).json({ message: e?.message || "Invalid phone number" });
                    }
                  } else {
                    req.body.phoneNumber = "";
                  }
                }
        
                const businessVentures = await BusinessVentures.findOneAndUpdate(query, req.body, {new: true, runValidators: true})
        
                if(!businessVentures) {
                    return res.status(404).json({message: "business Ventures not found"})
                }
        
                return res.status(200).json({message: "business Ventures updated successfully", businessVentures})
        
    } catch (error) {
        return res.status(400).json({message: "business Ventures could not be updated", error: error.message})   
    }
}


const deleteBusinessVentures = async (req, res) => {
    
    try {
        const {id} = req.params
                const query = {_id: id}
        
                if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.activeChurch._id
                }
        
                const businessVentures = await BusinessVentures.findOneAndDelete(query)
        
                if(!businessVentures) {
                    return res.status(404).json({message: "business Ventures not found"})
                }
        
                return res.status(200).json({message: "business Ventures deleted successfully", businessVentures})
        
    } catch (error) {
        return res.status(400).json({message: "business Ventures could not be deleted", error: error.message})
    }
}


// GET ALL BUSINESS VENTURES KPI

const getAllBusinessKPI = async(req, res) => {

    try {

    const query = {};
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const pctChange = (current, previous) => {
      const c = Number(current || 0);
      const p = Number(previous || 0);
      if (!p) return c ? 100 : 0;
      return ((c - p) / p) * 100;
    };

    const [
      totalVentures,
      totalVenturesPrev,
      [incomeAgg],
      [incomePrevAgg],
      [expensesAgg],
      [expensesPrevAgg]
    ] = await Promise.all([
      BusinessVentures.countDocuments(query),
      BusinessVentures.countDocuments({ ...query, createdAt: { $lt: startOfMonth } }),
      BusinessIncome.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      BusinessIncome.aggregate([
        { $match: { ...query, date: { $lt: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      BusinessExpenses.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      BusinessExpenses.aggregate([
        { $match: { ...query, date: { $lt: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    const totalIncome = Number(incomeAgg?.total || 0);
    const totalIncomePrev = Number(incomePrevAgg?.total || 0);
    const totalExpenses = Number(expensesAgg?.total || 0);
    const totalExpensesPrev = Number(expensesPrevAgg?.total || 0);
    const net = totalIncome - totalExpenses;
    const netPrev = totalIncomePrev - totalExpensesPrev;

    const change = {
      totalVentures: pctChange(totalVentures, totalVenturesPrev),
      totalIncome: pctChange(totalIncome, totalIncomePrev),
      totalExpenses: pctChange(totalExpenses, totalExpensesPrev),
      net: pctChange(net, netPrev)
    };

    const diff = {
      totalVentures: totalVentures - totalVenturesPrev
    };

    return res.status(200).json({
      message: "Business KPI fetched successfully",
      businessKPI: { totalVentures, totalIncome, totalExpenses, net, change, diff }
    });

    } catch (error) {
        return res.status(400).json({message: "Business KPI could not be fetched", error: error.message})
    }
}



export {createBusinessVentures, getAllBusinessVentures, getSingleBusinessVentures, updateBusinessVentures, deleteBusinessVentures, getAllBusinessKPI}