import TitheIndividual from '../../../models/financeModel/tithesModel/titheIndividualModel.js'
import Member from '../../../models/memberModel.js'
import { generateReferenceId } from '../../../utils/generateReferenceId.js'

const searchMembersForTithe = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    if (!search) {
      return res.status(200).json({ message: "No search term provided", members: [] });
    }

    const regex = { $regex: search, $options: "i" };

    const members = await Member.find({
      church: req.activeChurch._id,
      $or: [
        { firstName: regex },
        { lastName: regex },
        { phoneNumber: regex },
        { email: regex },
        { city: regex },
        { memberId: regex }
      ]
    })
      .select("firstName lastName phoneNumber email city")
      .limit(20)
      .lean();

    return res.status(200).json({ message: "Members fetched successfully", members });
  } catch (error) {
    return res.status(400).json({ message: "Members could not be fetched", error: error.message });
  }
};

const createTitheIndividual = async (req, res) => {
    
    try {
            const searchMember = (req.body.searchMember || "").trim();
            const memberId = (req.body.memberId || "").trim();
            const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];
            const {amount, paymentMethod, date} = req.body;

            if (!amount || !paymentMethod || !date) {
              return res.status(400).json({ message: "amount, paymentMethod and date are required" });
            }

            if (memberIds.length > 0) {
              const members = await Member.find({
                _id: { $in: memberIds },
                church: req.activeChurch._id
              }).select("_id").lean();

              if (!members || members.length === 0) {
                return res.status(404).json({ message: "Members not found" });
              }

              const docs = await Promise.all(
                members.map(async (m) => ({
                  amount,
                  paymentMethod,
                  date,
                  member: m._id,
                  church: req.activeChurch._id,
                  createdBy: req.user._id,
                  referenceId: await generateReferenceId("TTH")
                }))
              );

              const titheIndividuals = await TitheIndividual.insertMany(docs);

              return res.status(200).json({
                message: "titheIndividuals created successfully",
                count: titheIndividuals.length,
                titheIndividuals
              });
            }

            if (memberId) {
              const member = await Member.findOne({ _id: memberId, church: req.activeChurch._id }).select("_id");

              if (!member) {
                return res.status(404).json({ message: "Member not found" });
              }

              const titheIndividual =  await TitheIndividual.create({ 
                amount,
                paymentMethod,
                date,
                member: member._id,
                church: req.activeChurch._id,
                createdBy: req.user._id
              });

              return res.status(200).json({ message: "titheIndividual created successfully", titheIndividual });
            }

            if (!searchMember) {
              return res.status(400).json({ message: "Please provide memberId, memberIds, or searchMember." });
            }

            //search member by name, email or phone
            const member = await Member.findOne({
              church: req.activeChurch._id,
              $or: [
                { firstName: { $regex: searchMember, $options: "i" } },
                { lastName: { $regex: searchMember, $options: "i" } },
                { email: { $regex: searchMember, $options: "i" } },
                { phoneNumber: { $regex: searchMember, $options: "i" } }
              ]
            }).select("_id");

            if (!member) {
              return res.status(404).json({ message: "Member not found" });
            }

            const titheIndividual =  await TitheIndividual.create({ 
              amount,
              paymentMethod,
              date,
              member: member._id,
              church: req.activeChurch._id,
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
      
          query.church = req.activeChurch._id;
      
      
    // Search by member name or recordedBy (createdBy.fullName)
    if (search) {
      const User = (await import('../../../models/userModel.js')).default;
      const [members, users] = await Promise.all([
        Member.find({
          church: req.activeChurch._id,
          $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } }
          ]
        }).select("_id"),
        User.find({ fullName: { $regex: search, $options: "i" } }, "_id").lean()
      ]);

      const memberIds = members.map(m => m._id);
      const userIds = users.map(u => u._id);

      const orClauses = [
        { member: { $in: memberIds.length ? memberIds : [null] } }
      ];
      if (userIds.length) orClauses.push({ createdBy: { $in: userIds } });
      query.$or = orClauses;
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
          .populate("createdBy", "fullName")
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
      const query = { _id: id, church: req.activeChurch._id }

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
            const query = { _id: id, church: req.activeChurch._id }
            
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

    // Last year
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

    // ---- Query (matches your pattern) ----
    const query = { church: req.activeChurch._id };

    const pctChange = (current, previous) => {
      const c = Number(current || 0);
      const p = Number(previous || 0);
      if (!p) return c ? 100 : 0;
      return ((c - p) / p) * 100;
    };

    // ---- Aggregations ----
    const [week, month, lastMonth, year, lastYear, membersPaid, lastMonthMembersPaid] = await Promise.all([
      TitheIndividual.aggregate([
        { $match: { ...query, date: { $gte: startOfWeek } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),
      TitheIndividual.aggregate([
        { $match: { ...query, date: { $gte: startOfMonth } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),
      TitheIndividual.aggregate([
        { $match: { ...query, date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),
      TitheIndividual.aggregate([
        { $match: { ...query, date: { $gte: startOfYear } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),
      TitheIndividual.aggregate([
        { $match: { ...query, date: { $gte: startOfLastYear, $lte: endOfLastYear } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),
      TitheIndividual.aggregate([
        { $match: { ...query, member: { $ne: null }, date: { $gte: startOfMonth } } },
        { $group: { _id: "$member" } },
        { $count: "totalMembers" }
      ]),
      TitheIndividual.aggregate([
        { $match: { ...query, member: { $ne: null }, date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: "$member" } },
        { $count: "totalMembers" }
      ])
    ]);

    const thisMonth = month[0]?.totalAmount || 0;
    const lastMonthVal = lastMonth[0]?.totalAmount || 0;
    const thisYear = year[0]?.totalAmount || 0;
    const lastYearVal = lastYear[0]?.totalAmount || 0;
    const membersPaidThisMonth = membersPaid[0]?.totalMembers || 0;
    const membersPaidLastMonth = lastMonthMembersPaid[0]?.totalMembers || 0;

    const change = {
      thisMonth: pctChange(thisMonth, lastMonthVal),
      thisYear: pctChange(thisYear, lastYearVal),
      membersPaidThisMonth: pctChange(membersPaidThisMonth, membersPaidLastMonth)
    };

    const diff = {
      membersPaidThisMonth: membersPaidThisMonth - membersPaidLastMonth
    };

    return res.status(200).json({
      message: "TitheIndividual KPI fetched successfully",
      data: {
        thisWeek: week[0]?.totalAmount || 0,
        thisMonth,
        lastMonth: lastMonthVal,
        thisYear,
        membersPaidThisMonth,
        change,
        diff
      }
    });

  } catch (error) {
    return res.status(400).json({
      message: "TitheIndividual KPI could not be fetched",
      error: error.message
    });
  }
};


export {searchMembersForTithe, createTitheIndividual, getAllTitheIndividual, updateTitheIndividual, deleteTitheIndividual, getTitheIndividualKPI}
