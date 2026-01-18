import WelfareDisbursements from "../../../models/financeModel/welfareModel/welfareDisbursementModel.js"
import WelfareContributions from "../../../models/financeModel/welfareModel/welfareContributionModel.js"


const getWelfareKPI = async (req, res) => {
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
    const [disbursementsMonth, contributionsMonth, disbursementsYear, contributionsYear] = await Promise.all([
      

      // This month
      WelfareDisbursements.aggregate([
        { $match: { ...query, date: { $gte: startOfMonth } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      WelfareContributions.aggregate([
        { $match: { ...query, date: { $gte: startOfMonth } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      // This year
      WelfareDisbursements.aggregate([
        { $match: { ...query, date: { $gte: startOfYear } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ]),

      WelfareContributions.aggregate([
        { $match: { ...query, date: { $gte: startOfYear } } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
      ])

    ]);

    return res.status(200).json({
      message: "welfare KPI fetched successfully",
      data: {
        thisMonthDisbursement: disbursementsMonth[0]?.totalAmount || 0,
        thisMonthContribution: contributionsMonth[0]?.totalAmount || 0,
        thisYearDisbursement: disbursementsYear[0]?.totalAmount || 0,
        thisYearContribution: contributionsYear[0]?.totalAmount || 0

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