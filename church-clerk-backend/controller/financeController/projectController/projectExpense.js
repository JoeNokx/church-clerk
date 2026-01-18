import ProjectExpenses from "../../../models/financeModel/projectModel/projectExpenseModel.js";
import ChurchProject from "../../../models/financeModel/projectModel/churchProjectModel.js";


const createProjectExpenses = async (req, res) => {
    
    try {
            const { projectId } = req.params;

          const {
                spentOn,
                date,
                amount,
                description
                } = req.body;
                

                const query = { _id: projectId };
                if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                query.church = req.user.church;
                }

                const churchProject = await ChurchProject.findOne(query);
                if (!churchProject) {
                return res.status(404).json({ message: "churchProject not found" });
                }

                if (!spentOn || !date || !amount) {
                return res.status(400).json({ message: "spentOn, date and amount are required." });
                }
        

                const projectExpenses = await ProjectExpenses.create({
                churchProject: projectId,
                spentOn,
                date,
                amount,
                description,
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
           const { page = 1, limit = 10, search = "", dateFrom, dateTo } = req.query;
                                                
                const pageNum = Math.max(1, parseInt(page, 10) || 1);
                const limitNum = Math.max(1, parseInt(limit, 10) || 10);
                const skip = (pageNum - 1) * limitNum;
            
                // MAIN QUERY
                const {projectId} = req.params 
                const query = {churchProject: projectId};
            
                // Restrict by church for non-admins
                if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.user.church;
                }
            
                const churchProject = await ChurchProject.findById(projectId);
                if (!churchProject) {
                    return res.status(404).json({ message: "church Project not found" });
                }
               
                if(search) {
                    query.$or = [
                        { spentOn: { $regex: search, $options: "i" } }
                    ];
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
                .select("spentOn date amount description createdBy")
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
                    query.church = req.user.church
                }
        
                const churchProject = await ChurchProject.findById(projectId)
                if(!churchProject) {
                    return res.status(404).json({message: "churchProject not found"})
                }

                const projectExpenses = await ProjectExpenses.findOneAndUpdate(query, req.body, {new: true, runValidators: true})
        
                if(!projectExpenses) {
                    return res.status(404).json({message: "Project expenses not found"})
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
  query.church = req.user.church;
}

const churchProject = await ChurchProject.findById(projectId);
if (!churchProject) {
  return res.status(404).json({ message: "churchProject not found" });
}

const projectExpenses = await ProjectExpenses.findOneAndDelete(query);

if (!projectExpenses) {
  return res.status(404).json({ message: "Project expenses not found" });
}

return res.status(200).json({ message: "Project expenses deleted successfully", projectExpenses });

    } catch (error) {
        return res.status(400).json({message: "Project expenses could not be deleted", error: error.message})
    }
}
                


export { createProjectExpenses, getAllProjectExpenses, updateProjectExpenses, deleteProjectExpenses } 