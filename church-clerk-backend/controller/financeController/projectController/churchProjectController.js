import ChurchProject from "../../../models/financeModel/projectModel/churchProjectModel.js";
import ProjectContribution from "../../../models/financeModel/projectModel/projectContributionModel.js";
import ProjectExpenses from "../../../models/financeModel/projectModel/projectExpenseModel.js";
import Pledge from "../../../models/financeModel/pledgeModel/pledgeModel.js";
import PledgePayment from "../../../models/financeModel/pledgeModel/pledgePaymentModel.js";


// A deadline counts as missed only once the deadline day itself has fully passed.
const isPastDeadline = (deadline) => {
  if (!deadline) return false;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
};

// Status is always derived from money raised — never set by users.
const deriveFundraiserStatus = (raised, target, deadlineDate) => {
  const r = Number(raised || 0);
  const t = Number(target || 0);
  if (t > 0 && r >= t) return "Completed";
  if (isPastDeadline(deadlineDate)) return "Overdue";
  if (r <= 0) return "Not Started";
  return "In Progress";
};

const derivePledgeStatus = (totalPaid, amount, deadline) => {
  const paid = Number(totalPaid || 0);
  const target = Number(amount || 0);
  if (target > 0 && paid >= target) return "Completed";
  if (isPastDeadline(deadline)) return "Overdue";
  if (paid <= 0) return "Not Started";
  return "In Progress";
};


const createChurchProjects = async (req, res) => {

    try {
          const {
                name,
                description,
                targetAmount,
                startDate,
                deadlineDate
                } = req.body;

                if (!name || !description || !targetAmount) {
                return res.status(400).json({ message: "name, description and targetAmount are required." });
                }


                const churchProject = await ChurchProject.create({
                name,
                description,
                targetAmount,
                startDate: startDate ? new Date(startDate) : new Date(),
                deadlineDate: deadlineDate ? new Date(deadlineDate) : undefined,
                church: req.activeChurch._id,
                createdBy: req.user._id
                });
        
                return res.status(201).json({
                message: "Fundraising created successfully",
                churchProject
                });
    } catch (error) {
        return res.status(400).json({message: "Fundraising could not be created", error: error.message})
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
                    query.church = req.activeChurch._id;
                }

                // Date range filter
                if (dateFrom || dateTo) {
                    const dateFilter = {};
                    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
                    if (dateTo) {
                        const end = new Date(dateTo);
                        end.setHours(23, 59, 59, 999);
                        dateFilter.$lte = end;
                    }
                    query.startDate = dateFilter;
                }
            
            
                // FETCH CHURCH PROJECTS
                const churchProject = await ChurchProject.find(query)
                .select("name description targetAmount status church createdBy createdAt startDate deadlineDate")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
                    .lean();
            

                        
                        // FETCH ALL contribution & EXPENSES ONCE
                        const [contributions, expenses, linkedPledges] = await Promise.all([
                          ProjectContribution.find(query).lean(),
                          ProjectExpenses.find(query).lean(),
                          Pledge.find({ churchProject: { $in: churchProject.map((p) => p._id) }, ...(query.church && { church: query.church }) })
                            .select("_id churchProject").lean()
                        ]);

                        // Pledge payments count toward amount raised
                        const pledgeIds = linkedPledges.map((p) => p._id);
                        const pledgePayments = pledgeIds.length
                          ? await PledgePayment.find({ pledge: { $in: pledgeIds }, ...(query.church && { church: query.church }) }).select("pledge amount").lean()
                          : [];
                        const pledgeToProject = new Map(linkedPledges.map((p) => [p._id.toString(), p.churchProject?.toString()]));

                        // CALCULATE TOTALS PER churchProject (raised = instant-pay contributions + pledge payments)
                        const projectWithTotals = churchProject.map((biz) => {
                          const instantPay = contributions
                            .filter(i => i.churchProject?.toString() === biz._id.toString())
                            .reduce((sum, i) => sum + i.amount, 0);

                          const pledgePaid = pledgePayments
                            .filter(p => pledgeToProject.get(p.pledge?.toString()) === biz._id.toString())
                            .reduce((sum, p) => sum + Number(p.amount || 0), 0);

                          const totalContributions = instantPay + pledgePaid;

                          const totalExpenses = expenses
                            .filter(e => e.churchProject?.toString() === biz._id.toString())
                            .reduce((sum, e) => sum + e.amount, 0);

                          return {
                            ...biz,
                            status: deriveFundraiserStatus(totalContributions, biz.targetAmount, biz.deadlineDate),
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
                    message: "No fundraising record found.",
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
                console.log("fundraising fetched successfully")
                return res.status(200).json({
                    message: "Fundraising fetched successfully",
                    pagination,
                     count: projectWithTotals.length,
                    ChurchProject: projectWithTotals
                });
    } catch (error) {
        return res.status(400).json({message: "Fundraising could not be fetched", error: error.message})
    }
}


const getSingleChurchProjects = async (req, res) => {

    try {
        const { id } = req.params;
        const query = { _id: id };

        if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.activeChurch._id;
        }

        const churchProject = await ChurchProject.findOne(query)
            .select("name description targetAmount status church createdBy createdAt startDate deadlineDate")
            .lean();

        if (!churchProject) {
            return res.status(404).json({ message: "Fundraiser not found" });
        }

        const subQuery = {};
        if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            subQuery.church = req.activeChurch._id;
        }

        const [contributions, expenses, linkedPledges] = await Promise.all([
            ProjectContribution.find({ ...subQuery, churchProject: id }).lean(),
            ProjectExpenses.find({ ...subQuery, churchProject: id }).lean(),
            Pledge.find({ ...subQuery, churchProject: id }).select("_id").lean()
        ]);

        const pledgeIds = linkedPledges.map((p) => p._id);
        const pledgePayments = pledgeIds.length
            ? await PledgePayment.find({ ...subQuery, pledge: { $in: pledgeIds } }).select("amount").lean()
            : [];

        const totalContributions =
            (Array.isArray(contributions) ? contributions : []).reduce((sum, r) => sum + Number(r?.amount || 0), 0) +
            pledgePayments.reduce((sum, p) => sum + Number(p?.amount || 0), 0);
        const totalExpenses = (Array.isArray(expenses) ? expenses : []).reduce((sum, r) => sum + Number(r?.amount || 0), 0);

        return res.status(200).json({
            message: "Fundraising fetched successfully",
            churchProject: {
                ...churchProject,
                status: deriveFundraiserStatus(totalContributions, churchProject.targetAmount, churchProject.deadlineDate),
                totalContributions,
                totalExpenses,
                balance: totalContributions - totalExpenses
            }
        });
    } catch (error) {
        return res.status(400).json({ message: "Fundraising could not be fetched", error: error.message });
    }
}


const updateChurchProjects = async (req, res) => {
    
    try {
         const {id} = req.params
                const query = {_id: id}
        
                if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.activeChurch._id
                }

                // Status is auto-derived from money raised — never user-set
                delete req.body.status;

                const churchProject = await ChurchProject.findOneAndUpdate(query, req.body, {new: true, runValidators: true})
        
                if(!churchProject) {
                    return res.status(404).json({message: "Fundraiser not found"})
                }
        
                return res.status(200).json({message: "Fundraising updated successfully", churchProject})
        
    } catch (error) {
        return res.status(400).json({message: "Fundraising could not be updated", error: error.message})   
    }
}


const deleteChurchProjects = async (req, res) => {
    
    try {
        const {id} = req.params
                const query = {_id: id}
        
                if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                    query.church = req.activeChurch._id
                }
        
                const churchProject = await ChurchProject.findOneAndDelete(query)
        
                if(!churchProject) {
                    return res.status(404).json({message: "Fundraiser not found"})
                }
        
                return res.status(200).json({message: "Fundraising deleted successfully", churchProject})
        
    } catch (error) {
        return res.status(400).json({message: "Fundraising could not be deleted", error: error.message})
    }
}



const getChurchProjectsKPI = async (req, res) => {
  try {
    const query = { church: req.activeChurch._id };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const pctChange = (current, previous) => {
      const c = Number(current || 0);
      const p = Number(previous || 0);
      if (!p) return c ? 100 : 0;
      return ((c - p) / p) * 100;
    };

    const allProjects = await ChurchProject.find(query).select("_id targetAmount createdAt deadlineDate").lean();
    const allIds = allProjects.map((p) => p._id);

    const [contributions, expenses, linkedPledges, totalProjects, totalProjectsPrev] = await Promise.all([
      ProjectContribution.find({ church: query.church, churchProject: { $in: allIds } }).select("churchProject amount createdAt").lean(),
      ProjectExpenses.find({ church: query.church, churchProject: { $in: allIds } }).select("churchProject amount createdAt").lean(),
      Pledge.find({ church: query.church, churchProject: { $in: allIds } }).select("_id churchProject").lean(),
      ChurchProject.countDocuments(query),
      ChurchProject.countDocuments({ ...query, createdAt: { $lt: startOfMonth } })
    ]);

    const pledgeIds = linkedPledges.map((p) => p._id);
    const pledgePayments = pledgeIds.length
      ? await PledgePayment.find({ church: query.church, pledge: { $in: pledgeIds } }).select("pledge amount createdAt").lean()
      : [];
    const pledgeToProject = new Map(linkedPledges.map((p) => [p._id.toString(), p.churchProject?.toString()]));

    // Raised per project = instant-pay contributions + pledge payments (used for auto status)
    const raisedByProject = new Map();
    for (const c of contributions) {
      const k = c.churchProject?.toString();
      raisedByProject.set(k, (raisedByProject.get(k) || 0) + Number(c.amount || 0));
    }
    for (const p of pledgePayments) {
      const k = pledgeToProject.get(p.pledge?.toString());
      if (!k) continue;
      raisedByProject.set(k, (raisedByProject.get(k) || 0) + Number(p.amount || 0));
    }

    // "Active" = derived status is not Completed
    const activeIdSet = new Set(
      allProjects
        .filter((p) => deriveFundraiserStatus(raisedByProject.get(p._id.toString()) || 0, p.targetAmount, p.deadlineDate) !== "Completed")
        .map((p) => p._id.toString())
    );

    const inRange = (rows, before) => rows.filter((r) => {
      const d = new Date(r.createdAt);
      return Number.isNaN(d.getTime()) ? false : d < before;
    });

    const sumFor = (rows, getProjectId, before) => rows
      .filter((r) => activeIdSet.has(getProjectId(r)) && (!before || new Date(r.createdAt) < before))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const raisedRows = [
      ...contributions.map((c) => ({ projectId: c.churchProject?.toString(), amount: c.amount, createdAt: c.createdAt })),
      ...pledgePayments.map((p) => ({ projectId: pledgeToProject.get(p.pledge?.toString()), amount: p.amount, createdAt: p.createdAt }))
    ];

    const totalRaised = raisedRows
      .filter((r) => r.projectId && activeIdSet.has(r.projectId))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalRaisedPrev = raisedRows
      .filter((r) => r.projectId && activeIdSet.has(r.projectId) && new Date(r.createdAt) < startOfMonth)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const totalTarget = allProjects
      .filter((p) => activeIdSet.has(p._id.toString()))
      .reduce((sum, p) => sum + Number(p.targetAmount || 0), 0);
    const totalTargetPrev = allProjects
      .filter((p) => activeIdSet.has(p._id.toString()) && new Date(p.createdAt) < startOfMonth)
      .reduce((sum, p) => sum + Number(p.targetAmount || 0), 0);

    const totalSpent = sumFor(expenses, (e) => e.churchProject?.toString());
    const totalSpentPrev = sumFor(inRange(expenses, startOfMonth), (e) => e.churchProject?.toString());

    const change = {
      totalProjects: pctChange(totalProjects, totalProjectsPrev),
      totalRaised: pctChange(totalRaised, totalRaisedPrev),
      totalTarget: pctChange(totalTarget, totalTargetPrev),
      totalSpent: pctChange(totalSpent, totalSpentPrev)
    };

    const diff = {
      totalProjects: totalProjects - totalProjectsPrev
    };

    return res.status(200).json({
      message: "Fundraising KPI fetched successfully",
      kpi: { change, diff }
    });
  } catch (error) {
    return res.status(400).json({
      message: "Could not fetch Fundraising KPI",
      error: error.message
    });
  }
};

// Merged contributions (instant pay) + pledges for a fundraiser — one list, tagged by kind
const getChurchProjectTransactions = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 10, search = "", dateFrom, dateTo, kind } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const churchFilter = {};
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      churchFilter.church = req.activeChurch._id;
    }

    const project = await ChurchProject.findOne({ _id: projectId, ...churchFilter }).select("_id").lean();
    if (!project) {
      return res.status(404).json({ message: "Fundraiser not found" });
    }

    const q = String(search || "").trim();
    const range = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }

    const wantContribution = !kind || kind === "contribution";
    const wantPledge = !kind || kind === "pledge";

    let contributions = [];
    let pledges = [];

    if (wantContribution) {
      const cQuery = { churchProject: projectId, ...churchFilter };
      if (q) cQuery.contributorName = { $regex: q, $options: "i" };
      if (dateFrom || dateTo) cQuery.date = range;
      contributions = await ProjectContribution.find(cQuery)
        .select("contributorName date amount notes createdBy referenceId createdAt")
        .populate("createdBy", "fullName")
        .lean();
    }

    if (wantPledge) {
      const pQuery = { churchProject: projectId, ...churchFilter };
      if (q) {
        pQuery.$or = [
          { name: { $regex: q, $options: "i" } },
          { phoneNumber: { $regex: q, $options: "i" } }
        ];
      }
      if (dateFrom || dateTo) pQuery.pledgeDate = range;
      pledges = await Pledge.find(pQuery)
        .select("name phoneNumber serviceType amount pledgeDate deadline note status createdBy referenceId createdAt")
        .populate("createdBy", "fullName")
        .lean();
    }

    // Auto status + paid totals for pledges
    const pledgeIds = pledges.map((p) => p._id);
    const paidAggs = pledgeIds.length
      ? await PledgePayment.aggregate([
          { $match: { pledge: { $in: pledgeIds } } },
          { $group: { _id: "$pledge", total: { $sum: "$amount" } } }
        ])
      : [];
    const paidMap = new Map(paidAggs.map((a) => [a._id.toString(), Number(a.total || 0)]));

    const rows = [
      ...contributions.map((c) => ({
        ...c,
        kind: "contribution",
        displayName: c.contributorName,
        displayDate: c.date
      })),
      ...pledges.map((p) => {
        const totalPaid = paidMap.get(p._id.toString()) || 0;
        return {
          ...p,
          kind: "pledge",
          displayName: p.name,
          displayDate: p.pledgeDate,
          status: derivePledgeStatus(totalPaid, p.amount, p.deadline),
          totalPaid,
          remainingBalance: Number(p.amount || 0) - totalPaid
        };
      })
    ].sort((a, b) => {
      const da = new Date(a.displayDate || a.createdAt || 0).getTime();
      const db = new Date(b.displayDate || b.createdAt || 0).getTime();
      if (db !== da) return db - da;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    const totalResult = rows.length;
    const totalPages = Math.ceil(totalResult / limitNum);
    const pageRows = rows.slice(skip, skip + limitNum);

    return res.status(200).json({
      message: "Fundraising transactions fetched successfully",
      pagination: {
        totalResult,
        totalPages,
        currentPage: pageNum,
        hasPrev: pageNum > 1,
        hasNext: pageNum < totalPages,
        prevPage: pageNum > 1 ? pageNum - 1 : null,
        nextPage: pageNum < totalPages ? pageNum + 1 : null,
      },
      count: pageRows.length,
      transactions: pageRows
    });
  } catch (error) {
    return res.status(400).json({ message: "Fundraising transactions could not be fetched", error: error.message });
  }
};

export {createChurchProjects, getAllChurchProjects, getSingleChurchProjects, updateChurchProjects, deleteChurchProjects, getChurchProjectsKPI, getChurchProjectTransactions }