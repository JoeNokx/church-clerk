import Pledge from "../../../models/financeModel/pledgeModel/pledgeModel.js"
import PledgePayment from "../../../models/financeModel/pledgeModel/pledgePaymentModel.js";


const createPledge = async (req, res) => {
    
    try {
            const {
                name,
                phoneNumber,
                serviceType,
                amount,
                pledgeDate,
                deadline,
                note,
                status 
                } = req.body;
                    
             
            

                  if (!name || !phoneNumber || !amount || !pledgeDate) {
                    return res.status(400).json({ message: "name, phoneNumber, amount and pledgeDate are required." }, { message: "Amount and date are required." });
                  }
        
                  const pledges = await Pledge.create({
                    church: req.activeChurch._id,
                    name,
                    phoneNumber,
                    serviceType,
                    amount,
                    pledgeDate,
                    deadline,
                    note,
                    status,
                    createdBy: req.user._id
                    });

      
        
                  return res.status(200).json({ message: "Pledge created successfully", pledges });
    } catch (error) {
        return res.status(400).json({message: "Pledge could not be created", error: error.message})
    }
}



const getAllPledge = async (req, res) => {
    
    try {
          const { page = 1, limit = 10, search = "", serviceType, status, dateFrom, dateTo } = req.query;
                
                    const pageNum = Math.max(1, parseInt(page, 10) || 1);
                    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
                    const skip = (pageNum - 1) * limitNum;
                
                    // MAIN QUERY
                    const query = {};
                
                    query.church = req.activeChurch._id;
                
                    // Filter by serviceType
                    if (serviceType) {
                      query.serviceType = serviceType;
                    }

                    // Filter by status
                    if (status) {
                      query.status = status;
                    }

                    // search by name
                    if (search) {
                      query.$or = [
                        { name: { $regex: search, $options: "i" } },
                        { phoneNumber: { $regex: search, $options: "i" } },
                      ];
                    }
                
                 // Filter by date range
                if (dateFrom || dateTo) {
                  query.pledgeDate = {};
                
                  // Filter from a starting date
                  if (dateFrom) {
                    const startDate = new Date(dateFrom);
                    startDate.setHours(0, 0, 0, 0); // Start of the day
                    query.pledgeDate.$gte = startDate;
                  }
                
                  // Filter up to an ending date
                  if (dateTo) {
                    const endDate = new Date(dateTo);
                    endDate.setHours(23, 59, 59, 999); // End of the day
                    query.pledgeDate.$lte = endDate;
                  }
                }
                
                    // FETCH ATTENDANCES
                    const pledges = await Pledge.find(query)
                    .select("name phoneNumber serviceType amount pledgeDate deadline status")
                      .sort({ createdAt: -1 })
                      .skip(skip)
                      .limit(limitNum)
                      .lean();
                
                    // COUNT TOTAL ATTENDANCES
                    const totalPledges = await Pledge.countDocuments(query);
                
                     // Compute totalPaid and remainingBalance for each pledge
    const pledgesWithBalance = await Promise.all(
      pledges.map(async (pledge) => {
        const payments = await PledgePayment.find({ pledge: pledge._id }).lean();
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const remainingBalance = pledge.amount - totalPaid;
        return {
          ...pledge,
          totalPaid,
          remainingBalance
        };
      })
    );
                     // PAGINATION DETAILS
                    const totalPages = Math.ceil(totalPledges / limitNum);
                    const pagination = {
                      totalResult: totalPledges,
                      totalPages,
                      currentPage: pageNum,
                      hasPrev: pageNum > 1,
                      hasNext: pageNum < totalPages,
                      prevPage: pageNum > 1 ? pageNum - 1 : null,
                      nextPage: pageNum < totalPages ? pageNum + 1 : null,
                    };
                
                    // IF NO RESULTS
                    if (!pledges || pledges.length === 0) {
                      return res.status(200).json({
                        message: "No Pledges record found.",
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
                        pledges: [],
                      });
                    }
                
                   
                    // SUCCESS RESPONSE
                    return res.status(200).json({
                      message: "Pledges fetched successfully",
                      pagination,
                      count: pledges.length,
                      pledges: pledgesWithBalance
                    })
    } catch (error) {
        return res.status(400).json({message: "Pledges could not be fetched", error: error.message})
    }
}

const getSinglePledge = async (req, res) => {
    
    try {
        const {id} = req.params;
        const query = { _id: id, church: req.activeChurch._id }

        const pledges = await Pledge.findOne(query)

        if(!pledges) {
            return res.status(404).json({message: "Pledge not found"})
        }

         // DAYS UNTIL DEADLINE (deadline is optional)
    let daysUntilDeadline = null;

    if (pledges.deadline) {
      const today = new Date();
      const deadline = new Date(pledges.deadline);

      // Remove time part to avoid off-by-one errors
      today.setHours(0, 0, 0, 0);
      deadline.setHours(0, 0, 0, 0);

      const diffTime = deadline - today;
      daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // To prevent negative values
      if (daysUntilDeadline < 0) daysUntilDeadline = 0;
    }


        return res.status(200).json({
          message: "Pledge found successfully",
          pledges,
          daysUntilDeadline

        })
    } catch (error) {
        return res.status(400).json({message: "Pledge could not be found", error: error.message})
    }
}


const updatePledge = async (req, res) => {
    
    try {
         const {id} = req.params;
                        const query = { _id: id, church: req.activeChurch._id }
                
                        const pledges = await Pledge.findOneAndUpdate(query, req.body, {
                            new: true,
                            runValidators: true
                        })
                
                        if(!pledges) {
                            return res.status(404).json({message: "Pledges not found"})
                        }
                
                        return res.status(200).json({message: "Pledges updated successfully", pledges})
    } catch (error) {
        return res.status(400).json({message: "Pledges could not be updated", error: error.message})
    }
}


const deletePledge = async (req, res) => {
    
    try {
        const {id} = req.params;
                        const query = { _id: id, church: req.activeChurch._id }
                        
                        const pledges = await Pledge.findOneAndDelete(query)
                
                        if(!pledges) {
                            return res.status(404).json({message: "Pledges not found"})
                        }
                
                        return res.status(200).json({message: "Pledges deleted successfully", pledges})
    } catch (error) {
        return res.status(400).json({message: "Pledges could not be deleted", error: error.message})
    }
}
export {createPledge, getAllPledge, getSinglePledge, updatePledge, deletePledge}
