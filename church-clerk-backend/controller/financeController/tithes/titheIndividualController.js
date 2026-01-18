import TitheIndividual from '../../../models/financeModel/tithesModel/titheIndividualModel.js'
import Member from '../../../models/memberModel.js'

const createTitheIndividual = async (req, res) => {
    
    try {
            const searchMember = (req.body.searchMember || "").trim()
            const {amount, paymentMethod, date} = req.body      
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
                   })
        
                  if (!member) {
                    return res.status(404).json({ message: "Member not found" });
                  }
        
        
            const titheIndividual =  await TitheIndividual.create({ 
              amount,
              paymentMethod,
              date,
              member: member._id,
            church: req.user.church,
            createdBy: req.user._id
            });
        
                  return res.status(200).json({ message: "titheIndividual created successfully", titheIndividual });
    } catch (error) {
        return res.status(400).json({message: "titheIndividual could not be created", error: error.message})
    }
}



const getAllTitheIndividual = async (req, res) => {
    
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
      
          // FETCH ATTENDANCES
          const titheIndividuals = await TitheIndividual.find(query)
          .populate("member", "firstName lastName")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();
      
          // COUNT TOTAL ATTENDANCES
          const totaltitheIndividuals = await TitheIndividual.countDocuments(query);
      
            // PAGINATION DETAILS
          const totalPages = Math.ceil(totaltitheIndividuals / limitNum);
          const pagination = {
            totalResult: totaltitheIndividuals,
            totalPages,
            currentPage: pageNum,
            hasPrev: pageNum > 1,
            hasNext: pageNum < totalPages,
            prevPage: pageNum > 1 ? pageNum - 1 : null,
            nextPage: pageNum < totalPages ? pageNum + 1 : null,
          };
      
          // IF NO RESULTS
          if (!titheIndividuals || titheIndividuals.length === 0) {
            return res.status(200).json({
              message: "No titheIndividuals record found.",
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
              titheIndividuals: [],
            });
          }
      
          
          // SUCCESS RESPONSE
          return res.status(200).json({
            message: "titheIndividuals fetched successfully",
            pagination,
            count: titheIndividuals.length,
            titheIndividuals
          })
    } catch (error) {
        return res.status(400).json({message: "titheIndividuals could not be fetched", error: error.message})
    }
}


const updateTitheIndividual = async (req, res) => {
    
    try {
         const {id} = req.params;
      const query = {_id: id}

      if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
          query.church = req.user.church
      }

      const titheIndividuals = await TitheIndividual.findOneAndUpdate(query, req.body, {
          new: true,
          runValidators: true
      })

      if(!titheIndividuals) {
          return res.status(404).json({message: "titheIndividuals not found"})
      }

      return res.status(200).json({message: "titheIndividuals updated successfully", titheIndividuals})
    } catch (error) {
        return res.status(400).json({message: "titheIndividuals could not be updated", error: error.message})
    }
}


const deleteTitheIndividual = async (req, res) => {
    
    try {
        const {id} = req.params;
            const query = {_id: id}
    
            if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                query.church = req.user.church
            }
            
            const titheIndividuals = await TitheIndividual.findOneAndDelete(query)
    
            if(!titheIndividuals) {
                return res.status(404).json({message: "titheIndividuals not found"})
            }
    
            return res.status(200).json({message: "titheIndividuals deleted successfully", titheIndividuals})
    } catch (error) {
        return res.status(400).json({message: "titheIndividuals could not be deleted", error: error.message})
    }
}



//get TitheIndividual KPI

const getTitheIndividualKPI = async (req, res) => {
  try {
    const now = new Date();

    // ---- Date ranges ----

    // Start of week (Monday)
    const startOfWeek = new Date(now);
    const day = now.getDay() || 7;
    startOfWeek.setDate(now.getDate() - day + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Start of last month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    startOfLastMonth.setHours(0, 0, 0, 0);

    // End of last month
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    endOfLastMonth.setHours(23, 59, 59, 999);

    // Start of year
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    // ---- Query (matches your pattern) ----
    const query = {};

    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.user.church;
    }

    // ---- Aggregations ----
    const [week, month, lastMonth, year, membersPaid] = await Promise.all([
      // This week
      TitheIndividual.aggregate([
        { $match: { ...query, date: { $gte: startOfWeek } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      // This month
      TitheIndividual.aggregate([
        { $match: { ...query, date: { $gte: startOfMonth } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      // Last month
      TitheIndividual.aggregate([
        {
          $match: {
            ...query,
            date: { $gte: startOfLastMonth, $lte: endOfLastMonth }
          }
        },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      // This year
      TitheIndividual.aggregate([
        { $match: { ...query, date: { $gte: startOfYear } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      //members paid this month
      TitheIndividual.aggregate([
    { $match: {...query, member: { $ne: null }, date: { $gte: startOfMonth }}},
    { $group: { _id: "$member" } },
    { $count: "totalMembers" }])
    ]);

    return res.status(200).json({
      message: "TitheIndividual KPI fetched successfully",
      data: {
        thisWeek: week[0]?.totalAmount || 0,
        thisMonth: month[0]?.totalAmount || 0,
        lastMonth: lastMonth[0]?.totalAmount || 0,
        thisYear: year[0]?.totalAmount || 0,
        membersPaidThisMonth: membersPaid[0]?.totalMembers || 0

      }
    });

  } catch (error) {
    return res.status(400).json({
      message: "TitheIndividual KPI could not be fetched",
      error: error.message
    });
  }
};


export {createTitheIndividual, getAllTitheIndividual, updateTitheIndividual, deleteTitheIndividual, getTitheIndividualKPI}
