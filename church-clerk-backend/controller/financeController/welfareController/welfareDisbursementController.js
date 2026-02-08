import WelfareDisbursements from "../../../models/financeModel/welfareModel/welfareDisbursementModel.js"

const createWelfareDisbursement = async (req, res) => {
    
    try {
        const {
        beneficiaryName,
        category,
        amount,
        date,
        description,
        paymentMethod
        } = req.body;

        const welfareDisbursement = await WelfareDisbursements.create({
        beneficiaryName,
        category,
        amount,
        date,
        description,
        paymentMethod,
        church: req.activeChurch._id,
        createdBy: req.user._id
        });

        return res.status(201).json({
        message: "Welfare disbursement created successfully",
        welfareDisbursement
        });
    } catch (error) {
        return res.status(400).json({ message: "Welfare disbursement could not be created", error: error.message });
    }
}



const getAllWelfareDisbursement = async (req, res) => {
    
    try {
        const { page = 1, limit = 10, category, search = "", dateFrom, dateTo } = req.query;
                                        
                        const pageNum = Math.max(1, parseInt(page, 10) || 1);
                        const limitNum = Math.max(1, parseInt(limit, 10) || 10);
                        const skip = (pageNum - 1) * limitNum;
                    
                        // MAIN QUERY
                        const query = {};
                    
                        // Restrict by church for non-admins
                        if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                            query.church = req.activeChurch._id;
                        }
                    
                        //search by beneficiary name
                        if (search) {
                            query.beneficiaryName = { $regex: search, $options: "i" };
                        }

                        // Filter by category
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
                    
                        // FETCH welfare Disbursement 
                        const welfareDisbursement = await WelfareDisbursements.find(query)
                        .select("beneficiaryName category amount date description paymentMethod createdBy")
                            .sort({ createdAt: -1 })
                            .skip(skip)
                            .limit(limitNum)
                    
                          
                        // COUNT TOTAL welfare Disbursement
                        const totalwelfareDisbursement = await WelfareDisbursements.countDocuments(query);
                    
                            // PAGINATION DETAILS
                        const totalPages = Math.ceil(totalwelfareDisbursement / limitNum);
                        const pagination = {
                            totalResult: totalwelfareDisbursement,
                            totalPages,
                            currentPage: pageNum,
                            hasPrev: pageNum > 1,
                            hasNext: pageNum < totalPages,
                            prevPage: pageNum > 1 ? pageNum - 1 : null,
                            nextPage: pageNum < totalPages ? pageNum + 1 : null,
                        };
                    
                        // IF NO RESULTS
                        if (!welfareDisbursement || welfareDisbursement.length === 0) {
                            return res.status(200).json({
                            message: "No welfare Disbursement record found.",
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
                            welfareDisbursement: [],
                            });
                        }
                    
                        
                        // SUCCESS RESPONSE
                        console.log("welfare Disbursement fetched successfully")
                        return res.status(200).json({
                            message: "welfare Disbursement fetched successfully",
                            pagination,
                            count: welfareDisbursement.length,
                            welfareDisbursement,
                        });
    } catch (error) {
        return res.status(400).json({ message: "welfare Disbursement could not be fetched", error: error.message });
    }
}
 

const updateWelfareDisbursement = async (req, res) => {
    
    try {
        const {id} = req.params
        const query = {_id: id}

        
        if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.activeChurch._id
        }
        

        const welfareDisbursement = await WelfareDisbursements.findOneAndUpdate(query, req.body, {
            new: true,
            runValidators: true
        })

        if(!welfareDisbursement) {
            return res.status(404).json({message: "Welfare disbursement not found"})
        }       

        return res.status(200).json({message: "Welfare disbursement updated successfully", welfareDisbursement})
    } catch (error) {
        return res.status(400).json({message: "Welfare disbursement could not be updated", error: error.message})
    }
}


const deleteWelfareDisbursement = async (req, res) => {
    
    try {
        const {id} = req.params
        const query = {_id: id}

        if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.activeChurch._id
        }

        const welfareDisbursement = await WelfareDisbursements.findOneAndDelete(query)

        if(!welfareDisbursement) {
            return res.status(404).json({message: "Welfare disbursement not found"})
        }

        return res.status(200).json({message: "Welfare disbursement deleted successfully", welfareDisbursement})

    } catch (error) {
        return res.status(400).json({message: "Welfare disbursement could not be deleted", error: error.message})
    }
}




export {createWelfareDisbursement, getAllWelfareDisbursement, updateWelfareDisbursement, deleteWelfareDisbursement }