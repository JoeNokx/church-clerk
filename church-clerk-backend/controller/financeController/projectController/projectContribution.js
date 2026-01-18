import ProjectContribution from "../../../models/financeModel/projectModel/projectContributionModel.js";
import ChurchProject from "../../../models/financeModel/projectModel/churchProjectModel.js";


const createProjectContributions = async (req, res) => {
    
    try {
            const { projectId } = req.params;

          const {
                contributorName,
                date,
                amount,
                note
                } = req.body;
                

                const query = { _id: projectId };
                if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                query.church = req.user.church;
                }

                const churchProject = await ChurchProject.findOne(query);
                if (!churchProject) {
                return res.status(404).json({ message: "church Project not found" });
                }

                if (!contributorName || !date || !amount) {
                return res.status(400).json({ message: "contributorName, date and amount are required." });
                }
        

                const projectContribution = await ProjectContribution.create({
                churchProject: projectId,
                contributorName,
                date,
                amount,
                note,
                church: churchProject.church,
                createdBy: req.user._id
                });
                
                console.log("Project contribution added successfully")
                return res.status(201).json({
                message: "Project contribution added successfully",
                projectContribution
                });
    } catch (error) {
        console.log("Project contribution could not be added", error)
        return res.status(400).json({message: "Project contribution could not be added", error: error.message})
    }
}



const getAllProjectContributions = async (req, res) => {
    
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
                    return res.status(404).json({ message: "churchProject not found" });
                }
               
                //search by contributorName
                if(search) {
                    query.$or = [
                        { contributorName: { $regex: search, $options: "i" } }
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
                const projectContribution = await ProjectContribution.find(query)
                .select("contributorName date amount note createdBy")
                .populate("createdBy", "fullName")
                .populate("churchProject", "name")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
            
                    
                // COUNT TOTAL GENERAL EXPENSES
                const totalProjectContribution = await ProjectContribution.countDocuments(query);
            
                    // PAGINATION DETAILS
                const totalPages = Math.ceil(totalProjectContribution / limitNum);
                const pagination = {
                    totalResult: totalProjectContribution,
                    totalPages,
                    currentPage: pageNum,
                    hasPrev: pageNum > 1,
                    hasNext: pageNum < totalPages,
                    prevPage: pageNum > 1 ? pageNum - 1 : null,
                    nextPage: pageNum < totalPages ? pageNum + 1 : null,
                };
            
                // IF NO RESULTS
                if (!projectContribution || projectContribution.length === 0) {
                    return res.status(200).json({
                    message: "No Project contribution record found.",
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
                    projectContribution: [],
                    });
                }
            
                
                // SUCCESS RESPONSE
                console.log("Project contribution fetched successfully")
                return res.status(200).json({
                    message: "Project contribution fetched successfully",
                    pagination,
                    count: projectContribution.length,
                    projectContribution
                });
    } catch (error) {
        return res.status(400).json({message: "Project contribution could not be fetched", error: error.message})
    }
}


const updateProjectContributions = async (req, res) => {
    
    try {
         const { projectId, contributionId } = req.params;


         const query = {_id: contributionId, churchProject: projectId}
        
                if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.user.church
                }
        
                const churchProject = await ChurchProject.findById(projectId)
                if(!churchProject) {
                    return res.status(404).json({message: "churchProject not found"})
                }

                const projectContribution = await ProjectContribution.findOneAndUpdate(query, req.body, {new: true, runValidators: true})
        
                if(!projectContribution) {
                    return res.status(404).json({message: "Project contribution not found"})
                }
        
                return res.status(200).json({message: "Project contribution updated successfully", projectContribution})
        
    } catch (error) {
        return res.status(400).json({message: "Project contribution could not be updated", error: error.message})   
    }
}


const deleteProjectContributions = async (req, res) => {
    
    try {
        const { projectId, contributionId } = req.params;

const query = {
  _id: contributionId,
  churchProject: projectId
};

if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
  query.church = req.user.church;
}

const churchProject = await ChurchProject.findById(projectId);
if (!churchProject) {
  return res.status(404).json({ message: "churchProject not found" });
}

const projectContribution = await ProjectContribution.findOneAndDelete(query);

if (!projectContribution) {
  return res.status(404).json({ message: "Project contribution not found" });
}

return res.status(200).json({ message: "Project contribution deleted successfully", projectContribution });

    } catch (error) {
        return res.status(400).json({message: "Project contribution could not be deleted", error: error.message})
    }
}
                


export {createProjectContributions, getAllProjectContributions, updateProjectContributions, deleteProjectContributions }
