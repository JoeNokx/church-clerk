import BusinessIncome from "../../../models/financeModel/businessModel/businessIncomeModel.js";
import BusinessVentures from "../../../models/financeModel/businessModel/businessVenturesModel.js";


const createBusinessIncome = async (req, res) => {
    
    try {
            const { businessId } = req.params;

          const {
                recievedFrom,
                date,
                amount,
                note
                } = req.body;
                

                const query = { _id: businessId };
                if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                query.church = req.user.church;
                }

                const business = await BusinessVentures.findOne(query);
                if (!business) {
                return res.status(404).json({ message: "Business not found" });
                }

                if (!recievedFrom || !date || !amount) {
                return res.status(400).json({ message: "recievedFrom, date and amount are required." });
                }
        

                const businessIncome = await BusinessIncome.create({
                businessVentures: businessId,
                recievedFrom,
                date,
                amount,
                note,
                church: business.church,
                createdBy: req.user._id
                });
                
                console.log("business income added successfully")
                return res.status(201).json({
                message: "business income added successfully",
                businessIncome
                });
    } catch (error) {
        console.log("business income could not be added", error)
        return res.status(400).json({message: "business income could not be added", error: error.message})
    }
}



const getAllBusinessIncome = async (req, res) => {
    
    try {
           const { page = 1, limit = 10, search = "", dateFrom, dateTo } = req.query;
                                                
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
                            query.recievedFrom = { $regex: search, $options: "i" };
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
            
                // FETCH BUSINESS INCOME
                const businessIncome = await BusinessIncome.find(query)
                .select("recievedFrom date amount note createdBy")
                .populate("createdBy", "fullName")
                .populate("businessVentures", "businessName")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
            
                    
                // COUNT TOTAL GENERAL EXPENSES
                const totalBusinessIncome = await BusinessIncome.countDocuments(query);
            
                    // PAGINATION DETAILS
                const totalPages = Math.ceil(totalBusinessIncome / limitNum);
                const pagination = {
                    totalResult: totalBusinessIncome,
                    totalPages,
                    currentPage: pageNum,
                    hasPrev: pageNum > 1,
                    hasNext: pageNum < totalPages,
                    prevPage: pageNum > 1 ? pageNum - 1 : null,
                    nextPage: pageNum < totalPages ? pageNum + 1 : null,
                };
            
                // IF NO RESULTS
                if (!businessIncome || businessIncome.length === 0) {
                    return res.status(200).json({
                    message: "No business income record found.",
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
                    businessIncome: [],
                    });
                }
            
                
                // SUCCESS RESPONSE
                console.log("business income fetched successfully")
                return res.status(200).json({
                    message: "business income fetched successfully",
                    pagination,
                    count: businessIncome.length,
                    businessIncome,
                });
    } catch (error) {
        return res.status(400).json({message: "business income could not be fetched", error: error.message})
    }
}


const updateBusinessIncome = async (req, res) => {
    
    try {
         const { businessId, incomeId } = req.params;


         const query = {_id: incomeId, businessVentures: businessId}
        
                if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.user.church
                }
        
                const business = await BusinessVentures.findById(businessId)
                if(!business) {
                    return res.status(404).json({message: "business not found"})
                }

                const businessIncome = await BusinessIncome.findOneAndUpdate(query, req.body, {new: true, runValidators: true})
        
                if(!businessIncome) {
                    return res.status(404).json({message: "business income not found"})
                }
        
                return res.status(200).json({message: "business income updated successfully", businessIncome})
        
    } catch (error) {
        return res.status(400).json({message: "business income could not be updated", error: error.message})   
    }
}


const deleteBusinessIncome = async (req, res) => {
    
    try {
        const { businessId, incomeId } = req.params;

const query = {
  _id: incomeId,
  businessVentures: businessId
};

if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
  query.church = req.user.church;
}

const business = await BusinessVentures.findById(businessId);
if (!business) {
  return res.status(404).json({ message: "Business not found" });
}

const businessIncome = await BusinessIncome.findOneAndDelete(query);

if (!businessIncome) {
  return res.status(404).json({ message: "Business income not found" });
}

return res.status(200).json({ message: "Business income deleted successfully", businessIncome });

    } catch (error) {
        return res.status(400).json({message: "business income could not be deleted", error: error.message})
    }
}
                


export {createBusinessIncome, getAllBusinessIncome, updateBusinessIncome, deleteBusinessIncome}