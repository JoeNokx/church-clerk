import WelfareContributions from "../../../models/financeModel/welfareModel/welfareContributionModel.js"
import Member from "../../../models/memberModel.js"


const createWelfareContribution = async (req, res) => {
    
    try {
        const searchMember = (req.body.searchMember || "").trim();
          const {
                amount,
                date,
                paymentMethod
                } = req.body;
                
                if (!amount || !date) {
                return res.status(400).json({ message: "Amount and date are required." });
                }
        
                // Ensure user provides at least one identifier
                 if (!searchMember) {
                      return res.status(400).json({ message: "Please provide a name, email, or phone to search." });
                  }

                //search member by name, email or phone
                const member = await Member.findOne({
                church: req.user.church,
                $or: [
                    { firstName: { $regex: searchMember, $options: "i" } },
                    { lastName: { $regex: searchMember, $options: "i" } },
                    { email: { $regex: searchMember, $options: "i" } },
                    { phoneNumber: { $regex: searchMember, $options: "i" } },
                ],
                });
        
                if (!member) {
                return res.status(404).json({ message: "Member not found" });
                }

                const welfareContribution = await WelfareContributions.create({
                member: member._id,
                amount,
                date,
                paymentMethod,
                church: req.user.church,
                createdBy: req.user._id
                });
        
                return res.status(201).json({
                message: "Welfare contribution created successfully",
                welfareContribution
                });
    } catch (error) {
        return res.status(400).json({message: "Welfare contribution could not be created", error: error.message})
    }
}



const getAllWelfareContribution = async (req, res) => {
    
    try {
           const { page = 1, limit = 10, search="", dateFrom, dateTo } = req.query;
                                                
                const pageNum = Math.max(1, parseInt(page, 10) || 1);
                const limitNum = Math.max(1, parseInt(limit, 10) || 10);
                const skip = (pageNum - 1) * limitNum;
            
                // MAIN QUERY
                const query = {};
            
                // Restrict by church for non-admins
                if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.user.church;
                }
            
            
                // Search by member name
                if (search) {
                  const members = await Member.find({
                    church: req.user.church,
                    $or: [
                      { firstName: { $regex: search, $options: "i" } },
                      { lastName: { $regex: search, $options: "i" } }
                    ]
                  }).select("_id");
            
                  const memberIds = members.map(m => m._id);
            
                  // Filter TitheIndividual by matching members
                  query.member = { $in: memberIds.length ? memberIds : [null] }; // [null] ensures no match if no members found
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
             
                // FETCH welfare Disbursement
                const welfareContribution = await WelfareContributions.find(query)
                .select("searchMember amount date paymentMethod createdBy")
                .populate("member", "firstName lastName email phoneNumber")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
            
                    
                // COUNT TOTAL welfare Disbursement
                const totalWelfareContribution = await WelfareContributions.countDocuments(query);
            
                    // PAGINATION DETAILS
                const totalPages = Math.ceil(totalWelfareContribution / limitNum);
                const pagination = {
                    totalResult: totalWelfareContribution,
                    totalPages,
                    currentPage: pageNum,
                    hasPrev: pageNum > 1,
                    hasNext: pageNum < totalPages,
                    prevPage: pageNum > 1 ? pageNum - 1 : null,
                    nextPage: pageNum < totalPages ? pageNum + 1 : null,
                };
            
                // IF NO RESULTS
                if (!welfareContribution || welfareContribution.length === 0) {
                    return res.status(200).json({
                    message: "No welfare contribution record found.",
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
                    welfareContribution: [],
                    });
                }
            
                
                // SUCCESS RESPONSE
                console.log("welfare contribution fetched successfully")
                return res.status(200).json({
                    message: "welfare contribution fetched successfully",
                    pagination,
                    count: welfareContribution.length,
                    welfareContribution,
                });
    } catch (error) {
        return res.status(400).json({message: "welfare contribution could not be fetched", error: error.message})
    }
}


const updateWelfareContribution = async (req, res) => {
    
    try {
         const {id} = req.params
                const query = {_id: id}
        
                if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.user.church
                }
        
                const welfareContributions = await WelfareContributions.findOneAndUpdate(query, req.body, {new: true, runValidators: true})
        
                if(!welfareContributions) {
                    return res.status(404).json({message: "Welfare contribution not found"})
                }
        
                return res.status(200).json({message: "Welfare contribution updated successfully", welfareContributions})
        
    } catch (error) {
        return res.status(400).json({message: "Welfare contribution could not be updated", error: error.message})   
    }
}


const deleteWelfareContribution = async (req, res) => {
    
    try {
        const {id} = req.params
                const query = {_id: id}
        
                if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.user.church
                }
        
                const welfareContributions = await WelfareContributions.findOneAndDelete(query)
        
                if(!welfareContributions) {
                    return res.status(404).json({message: "Welfare contribution not found"})
                }
        
                return res.status(200).json({message: "Welfare contribution deleted successfully", welfareContributions})
        
    } catch (error) {
        return res.status(400).json({message: "Welfare contribution could not be deleted", error: error.message})
    }
}

export {createWelfareContribution, getAllWelfareContribution, updateWelfareContribution, deleteWelfareContribution}