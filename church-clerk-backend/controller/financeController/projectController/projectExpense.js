import ProjectExpenses from "../../../models/financeModel/projectModel/projectExpenseModel.js";
import ChurchProject from "../../../models/financeModel/projectModel/churchProjectModel.js";
import { uploadReceiptImage, destroyReceiptImage, receiptImageDownloadUrl, validateReceiptImage } from "../../../services/receiptService.js";


const createProjectExpenses = async (req, res) => {
    
    try {
            const { projectId } = req.params;

          const {
                spentOn,
                category,
                date,
                amount,
                description
                } = req.body;
                

                const query = { _id: projectId };
                if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                query.church = req.activeChurch._id;
                }

                const churchProject = await ChurchProject.findOne(query);
                if (!churchProject) {
                return res.status(404).json({ message: "churchProject not found" });
                }

                if (!spentOn || !date || !amount) {
                return res.status(400).json({ message: "spentOn, date and amount are required." });
                }

                let receipt;
                if (req.file) {
                const fileError = validateReceiptImage(req.file);
                if (fileError) {
                return res.status(400).json({ message: fileError });
                }
                receipt = await uploadReceiptImage(req.file, `church-clerk/church-projects/${projectId}/expenses`);
                }
        

                const projectExpenses = await ProjectExpenses.create({
                churchProject: projectId,
                spentOn,
                category,
                date,
                amount,
                description,
                ...(receipt ? { receipt } : {}),
                church: churchProject.church,
                createdBy: req.user._id
                });
                
                console.log("Project expenses added successfully")
                return res.status(201).json({
                message: "Project expenses added successfully",
                projectExpenses
                });
    } catch (error) {
        console.log("Project expenses could not be added", error)
        return res.status(400).json({message: "Project expenses could not be added", error: error.message})
    }
}



const getAllProjectExpenses = async (req, res) => {
    
    try {
           const { page = 1, limit = 10, search = "", dateFrom, dateTo, category } = req.query;
                                                
                const pageNum = Math.max(1, parseInt(page, 10) || 1);
                const limitNum = Math.max(1, parseInt(limit, 10) || 10);
                const skip = (pageNum - 1) * limitNum;
            
                // MAIN QUERY
                const {projectId} = req.params 
                const query = {churchProject: projectId};
            
                // Restrict by church for non-admins
                if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.activeChurch._id;
                }
            
                const churchProject = await ChurchProject.findById(projectId);
                if (!churchProject) {
                    return res.status(404).json({ message: "church Project not found" });
                }
               
                //search by spentOn or recordedBy (createdBy.fullName)
               if(search) {
                    const User = (await import("../../../models/userModel.js")).default;
                    const matchingUsers = await User.find({ fullName: { $regex: search, $options: "i" } }, "_id").lean();
                    const userIds = matchingUsers.map(u => u._id);
                    const orClauses = [{ spentOn: { $regex: search, $options: "i" } }];
                    if (userIds.length) orClauses.push({ createdBy: { $in: userIds } });
                    query.$or = orClauses;
                }

                // Filter by category
                if (category) {
                    query.category = String(category).trim();
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
                const projectExpenses = await ProjectExpenses.find(query)
                .select("spentOn category date amount description receipt createdBy referenceId createdAt")
                .populate("createdBy", "fullName")
                .populate("churchProject", "name")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
            
                    
                // COUNT TOTAL GENERAL EXPENSES
                const totalProjectExpenses = await ProjectExpenses.countDocuments(query);
            
                    // PAGINATION DETAILS
                const totalPages = Math.ceil(totalProjectExpenses / limitNum);
                const pagination = {
                    totalResult: totalProjectExpenses,
                    totalPages,
                    currentPage: pageNum,
                    hasPrev: pageNum > 1,
                    hasNext: pageNum < totalPages,
                    prevPage: pageNum > 1 ? pageNum - 1 : null,
                    nextPage: pageNum < totalPages ? pageNum + 1 : null,
                };
            
                // IF NO RESULTS
                if (!projectExpenses || projectExpenses.length === 0) {
                    return res.status(200).json({
                    message: "No Project expenses record found.",
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
                    projectExpenses: [],
                    });
                }
            
                
                // SUCCESS RESPONSE
                console.log("Project expenses fetched successfully")
                return res.status(200).json({
                    message: "Project expenses fetched successfully",
                    pagination,
                    count: projectExpenses.length,
                    projectExpenses,
                });
    } catch (error) {
        return res.status(400).json({message: "Project expenses could not be fetched", error: error.message})
    }
}


const updateProjectExpenses = async (req, res) => {
    
    try {
         const { expensesId, projectId } = req.params;


         const query = {_id: expensesId, churchProject: projectId}
        
                if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.activeChurch._id
                }
        
                const churchProject = await ChurchProject.findById(projectId)
                if(!churchProject) {
                    return res.status(404).json({message: "churchProject not found"})
                }

                const { removeReceipt, receipt: _receiptBody, church: _church, createdBy: _createdBy, churchProject: _cp, ...restBody } = req.body || {};
                const updatePayload = { ...restBody };

                let newReceipt;
                if (req.file) {
                const fileError = validateReceiptImage(req.file);
                if (fileError) {
                return res.status(400).json({ message: fileError });
                }
                newReceipt = await uploadReceiptImage(req.file, `church-clerk/church-projects/${projectId}/expenses`);
                updatePayload.receipt = newReceipt;
                } else if (String(removeReceipt || "") === "true") {
                updatePayload.receipt = null;
                }

                const previous = await ProjectExpenses.findOne(query).select("receipt");

                const projectExpenses = await ProjectExpenses.findOneAndUpdate(query, updatePayload, {new: true, runValidators: true})
        
                if(!projectExpenses) {
                    if (newReceipt) await destroyReceiptImage(newReceipt);
                    return res.status(404).json({message: "Project expenses not found"})
                }

                if ((newReceipt || String(removeReceipt || "") === "true") && previous?.receipt?.publicId) {
                await destroyReceiptImage(previous.receipt);
                }
        
                return res.status(200).json({message: "Project expenses updated successfully", projectExpenses})
        
    } catch (error) {
        return res.status(400).json({message: "Project expenses could not be updated", error: error.message})   
    }
}


const deleteProjectExpenses = async (req, res) => {
    
    try {
        const { expensesId, projectId } = req.params;

const query = {
  _id: expensesId,
  churchProject: projectId
};

if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
  query.church = req.activeChurch._id;
}

const churchProject = await ChurchProject.findById(projectId);
if (!churchProject) {
  return res.status(404).json({ message: "churchProject not found" });
}

const projectExpenses = await ProjectExpenses.findOneAndDelete(query);

if (!projectExpenses) {
  return res.status(404).json({ message: "Project expenses not found" });
}

if (projectExpenses?.receipt?.publicId) {
  await destroyReceiptImage(projectExpenses.receipt);
}

return res.status(200).json({ message: "Project expenses deleted successfully", projectExpenses });

    } catch (error) {
        return res.status(400).json({message: "Project expenses could not be deleted", error: error.message})
    }
}
                


const downloadProjectExpenseReceipt = async (req, res) => {
    try {
        const { expensesId, projectId } = req.params;
        const query = { _id: expensesId, churchProject: projectId };

        if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.activeChurch._id;
        }

        const expense = await ProjectExpenses.findOne(query).select("receipt").lean();
        if (!expense?.receipt?.publicId) {
            return res.status(404).json({ message: "Receipt not found" });
        }

        return res.redirect(receiptImageDownloadUrl(expense.receipt));
    } catch (error) {
        return res.status(400).json({ message: "Receipt could not be downloaded", error: error.message });
    }
};



export { createProjectExpenses, getAllProjectExpenses, updateProjectExpenses, deleteProjectExpenses, downloadProjectExpenseReceipt } 