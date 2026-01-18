import ChurchProject from "../../../models/financeModel/projectModel/churchProjectModel.js";
import ProjectContribution from "../../../models/financeModel/projectModel/projectContributionModel.js";
import ProjectExpenses from "../../../models/financeModel/projectModel/projectExpenseModel.js";



const createChurchProjects = async (req, res) => {
    
    try {
          const {
                name,
                description,
                targetAmount,
                status
                } = req.body;
                
                if (!name || !description || !targetAmount) {
                return res.status(400).json({ message: "name, description and targetAmount are required." });
                }
        

                const churchProject = await ChurchProject.create({
                name,
                description,
                targetAmount,
                status,
                church: req.user.church,
                createdBy: req.user._id
                });
        
                return res.status(201).json({
                message: "church projects created successfully",
                churchProject
                });
    } catch (error) {
        return res.status(400).json({message: "church projects could not be created", error: error.message})
    }
}



const getAllChurchProjects = async (req, res) => {
    
    try {
           const { page = 1, limit = 10, serviceType, dateFrom, dateTo } = req.query;
                                                
                const pageNum = Math.max(1, parseInt(page, 10) || 1);
                const limitNum = Math.max(1, parseInt(limit, 10) || 10);
                const skip = (pageNum - 1) * limitNum;
            
                // MAIN QUERY
                const query = {};
            
                // Restrict by church for non-admins
                if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.user.church;
                }
            
            
                // FETCH CHURCH PROJECTS
                const churchProject = await ChurchProject.find(query)
                .select("name description targetAmount status church createdBy createdAt")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
                    .lean();
            

                        
                        // FETCH ALL contribution & EXPENSES ONCE
                        const [contributions, expenses] = await Promise.all([
                          ProjectContribution.find(query).lean(),
                          ProjectExpenses.find(query).lean()
                        ]);
                    
                        // CALCULATE TOTALS PER churchProject
                        const projectWithTotals = churchProject.map((biz) => {
                          const totalContributions = contributions
                            .filter(i => i.churchProject?.toString() === biz._id.toString())
                            .reduce((sum, i) => sum + i.amount, 0);
                    
                          const totalExpenses = expenses
                            .filter(e => e.churchProject?.toString() === biz._id.toString())
                            .reduce((sum, e) => sum + e.amount, 0);
                    
                          return {
                            ...biz,
                            totalContributions,
                            totalExpenses,
                            balance: totalContributions - totalExpenses
                          };
                        });
                                    
                    
                // COUNT TOTAL GENERAL EXPENSES
                const totalChurchProject = await ChurchProject.countDocuments(query);
            
                    // PAGINATION DETAILS
                const totalPages = Math.ceil(totalChurchProject / limitNum);
                const pagination = {
                    totalResult: totalChurchProject,
                    totalPages,
                    currentPage: pageNum,
                    hasPrev: pageNum > 1,
                    hasNext: pageNum < totalPages,
                    prevPage: pageNum > 1 ? pageNum - 1 : null,
                    nextPage: pageNum < totalPages ? pageNum + 1 : null,
                };
            
                // IF NO RESULTS
                if (!churchProject || churchProject.length === 0) {
                    return res.status(200).json({
                    message: "No church projects record found.",
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
                    churchProject: [],
                    });
                }
            
                
                // SUCCESS RESPONSE
                console.log("church projects fetched successfully")
                return res.status(200).json({
                    message: "church projects fetched successfully",
                    pagination,
                     count: projectWithTotals.length,
                    ChurchProject: projectWithTotals
                });
    } catch (error) {
        return res.status(400).json({message: "church projects could not be fetched", error: error.message})
    }
}


const updateChurchProjects = async (req, res) => {
    
    try {
         const {id} = req.params
                const query = {_id: id}
        
                if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.user.church
                }
        
                const churchProject = await ChurchProject.findOneAndUpdate(query, req.body, {new: true, runValidators: true})
        
                if(!churchProject) {
                    return res.status(404).json({message: "church projects not found"})
                }
        
                return res.status(200).json({message: "church projects updated successfully", churchProject})
        
    } catch (error) {
        return res.status(400).json({message: "church projects could not be updated", error: error.message})   
    }
}


const deleteChurchProjects = async (req, res) => {
    
    try {
        const {id} = req.params
                const query = {_id: id}
        
                if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.user.church
                }
        
                const churchProject = await ChurchProject.findOneAndDelete(query)
        
                if(!churchProject) {
                    return res.status(404).json({message: "church projects not found"})
                }
        
                return res.status(200).json({message: "church projects deleted successfully", churchProject})
        
    } catch (error) {
        return res.status(400).json({message: "church projects could not be deleted", error: error.message})
    }
}



export {createChurchProjects, getAllChurchProjects, updateChurchProjects, deleteChurchProjects }