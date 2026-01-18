import BusinessExpenses from "../../../models/financeModel/businessModel/BusinessExpensesModel.js";
import BusinessVentures from "../../../models/financeModel/businessModel/businessVenturesModel.js";


const createBusinessExpenses = async (req, res) => {
    
    try {
            const { businessId } = req.params;

          const {
                spentBy,
                date,
                amount,
                category,
                description
                } = req.body;
                

                const query = { _id: businessId };
                if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                query.church = req.user.church;
                }

                const business = await BusinessVentures.findOne(query);
                if (!business) {
                return res.status(404).json({ message: "Business not found" });
                }

                if (!spentBy || !date || !amount || !category) {
                return res.status(400).json({ message: "spentBy, category, date and amount are required." });
                }
        

                const businessExpenses = await BusinessExpenses.create({
                businessVentures: businessId,
                spentBy,
                date,
                amount,
                description,
                category,
                church: business.church,
                createdBy: req.user._id
                });
                
                console.log("business expenses added successfully")
                return res.status(201).json({
                message: "business expenses added successfully",
                businessExpenses
                });
    } catch (error) {
        console.log("business expenses could not be added", error)
        return res.status(400).json({message: "business expenses could not be added", error: error.message})
    }
}



const getAllBusinessExpenses = async (req, res) => {
    
    try {
           const { page = 1, limit = 10, search = "", category, dateFrom, dateTo } = req.query;
                                                
                const pageNum = Math.max(1, parseInt(page, 10) || 1);
                const limitNum = Math.max(1, parseInt(limit, 10) || 10);
                const skip = (pageNum - 1) * limitNum;
            
                // MAIN QUERY
                const {businessId} = req.params 
                const query = {businessVentures: businessId};
            
                // Restrict by church for non-admins
                if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.user.church;
                }
            
                const business = await BusinessVentures.findById(businessId);
                if (!business) {
                    return res.status(404).json({ message: "Business not found" });
                }
               
                
                  //search by recievedFrom name
                        if (search) {
                            query.spentBy = { $regex: search, $options: "i" };
                        }

                        if(category) {
                            query.category = category
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
                const businessExpenses = await BusinessExpenses.find(query)
                .select("spentBy category date amount description createdBy")
                .populate("createdBy", "fullName")
                .populate("businessVentures", "businessName")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
            
                    
                // COUNT TOTAL GENERAL EXPENSES
                const totalBusinessExpenses = await BusinessExpenses.countDocuments(query);
            
                    // PAGINATION DETAILS
                const totalPages = Math.ceil(totalBusinessExpenses / limitNum);
                const pagination = {
                    totalResult: totalBusinessExpenses,
                    totalPages,
                    currentPage: pageNum,
                    hasPrev: pageNum > 1,
                    hasNext: pageNum < totalPages,
                    prevPage: pageNum > 1 ? pageNum - 1 : null,
                    nextPage: pageNum < totalPages ? pageNum + 1 : null,
                };
            
                // IF NO RESULTS
                if (!businessExpenses || businessExpenses.length === 0) {
                    return res.status(200).json({
                    message: "No business expenses record found.",
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
                    businessExpenses: [],
                    });
                }
            
                
                // SUCCESS RESPONSE
                console.log("business expenses fetched successfully")
                return res.status(200).json({
                    message: "business expenses fetched successfully",
                    pagination,
                    count: businessExpenses.length,
                    businessExpenses,
                });
    } catch (error) {
        return res.status(400).json({message: "business expenses could not be fetched", error: error.message})
    }
}


const updateBusinessExpenses = async (req, res) => {
    
    try {
         const { businessId, expensesId } = req.params;


         const query = {_id: expensesId, businessVentures: businessId}
        
                if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.user.church
                }
        
                const business = await BusinessVentures.findById(businessId)
                if(!business) {
                    return res.status(404).json({message: "business not found"})
                }

                const businessExpenses = await BusinessExpenses.findOneAndUpdate(query, req.body, {new: true, runValidators: true})
        
                if(!businessExpenses) {
                    return res.status(404).json({message: "business expenses not found"})
                }
        
                return res.status(200).json({message: "business expenses updated successfully", businessExpenses})
        
    } catch (error) {
        return res.status(400).json({message: "business expenses could not be updated", error: error.message})   
    }
}


const deleteBusinessExpenses = async (req, res) => {
    
    try {
        const { businessId, expensesId } = req.params;

const query = {
  _id: expensesId,
  businessVentures: businessId
};

if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
  query.church = req.user.church;
}

const business = await BusinessVentures.findById(businessId);
if (!business) {
  return res.status(404).json({ message: "Business not found" });
}

const businessExpenses = await BusinessExpenses.findOneAndDelete(query);

if (!businessExpenses) {
  return res.status(404).json({ message: "business expenses not found" });
}

return res.status(200).json({ message: "business expenses deleted successfully", businessExpenses });

    } catch (error) {
        return res.status(400).json({message: "business expenses could not be deleted", error: error.message})
    }
}
                


export {createBusinessExpenses, getAllBusinessExpenses, updateBusinessExpenses, deleteBusinessExpenses}