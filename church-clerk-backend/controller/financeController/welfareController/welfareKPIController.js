import WelfareDisbursements from "../../../models/financeModel/welfareModel/welfareDisbursementModel.js"
import WelfareContributions from "../../../models/financeModel/welfareModel/welfareContributionModel.js"


const getWelfareKPI = async (req, res) => {
  try {
    const now = new Date();

    // ---- Date ranges ----
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

    // ---- Query ----
    const query = {};
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    const pctChange = (current, previous) => {
      const c = Number(current || 0);
      const p = Number(previous || 0);
      if (!p) return c ? 100 : 0;
      return ((c - p) / p) * 100;
    };

    // ---- Aggregations ----
    const [
      disbursementsMonth,
      contributionsMonth,
      disbursementsYear,
      contributionsYear,
      disbursementsLastMonth,
      contributionsLastMonth,
      disbursementsLastYear,
      contributionsLastYear
    ] = await Promise.all([
      WelfareDisbursements.aggregate([
        { $match: { ...query, date: { $gte: startOfMonth } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),
      WelfareContributions.aggregate([
        { $match: { ...query, date: { $gte: startOfMonth } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),
      WelfareDisbursements.aggregate([
        { $match: { ...query, date: { $gte: startOfYear } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),
      WelfareContributions.aggregate([
        { $match: { ...query, date: { $gte: startOfYear } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),
      WelfareDisbursements.aggregate([
        { $match: { ...query, date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),
      WelfareContributions.aggregate([
        { $match: { ...query, date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),
      WelfareDisbursements.aggregate([
        { $match: { ...query, date: { $gte: startOfLastYear, $lte: endOfLastYear } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),
      WelfareContributions.aggregate([
        { $match: { ...query, date: { $gte: startOfLastYear, $lte: endOfLastYear } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ])
    ]);

    const thisMonthContribution = contributionsMonth[0]?.totalAmount || 0;
    const thisMonthDisbursement = disbursementsMonth[0]?.totalAmount || 0;
    const thisYearContribution = contributionsYear[0]?.totalAmount || 0;
    const thisYearDisbursement = disbursementsYear[0]?.totalAmount || 0;
    const lastMonthContribution = contributionsLastMonth[0]?.totalAmount || 0;
    const lastMonthDisbursement = disbursementsLastMonth[0]?.totalAmount || 0;
    const lastYearContribution = contributionsLastYear[0]?.totalAmount || 0;
    const lastYearDisbursement = disbursementsLastYear[0]?.totalAmount || 0;

    const change = {
      thisMonthContribution: pctChange(thisMonthContribution, lastMonthContribution),
      thisMonthDisbursement: pctChange(thisMonthDisbursement, lastMonthDisbursement),
      thisYearContribution: pctChange(thisYearContribution, lastYearContribution),
      thisYearDisbursement: pctChange(thisYearDisbursement, lastYearDisbursement)
    };

    return res.status(200).json({
      message: "welfare KPI fetched successfully",
      data: {
        thisMonthContribution,
        thisMonthDisbursement,
        thisYearContribution,
        thisYearDisbursement,
        change
      }
    });

  } catch (error) {
    return res.status(400).json({
      message: "welfare KPI could not be fetched",
      error: error.message
    });
  }
};

export default getWelfareKPI