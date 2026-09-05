import ChurchProject from "../../../models/financeModel/projectModel/churchProjectModel.js";
import ProjectContribution from "../../../models/financeModel/projectModel/projectContributionModel.js";
import ProjectExpenses from "../../../models/financeModel/projectModel/projectExpenseModel.js";

const getProjectContributionExpensesKPI = async (req, res) => {
  try {
    const { projectId } = req.params;

    // BASE QUERY
    const query = { churchProject: projectId };

    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    // CHECK PROJECT EXISTS
    const churchProject = await ChurchProject.findOne({
      _id: projectId,
      ...(query.church && { church: query.church })
    }).select("name description targetAmount status").lean();

    if (!churchProject) {
      return res.status(404).json({ message: "Church project not found" });
    }

    // FETCH CONTRIBUTIONS & EXPENSES
    const [contributions, expenses] = await Promise.all([
      ProjectContribution.find(query).lean(),
      ProjectExpenses.find(query).lean()
    ]);

    // TOTALS (ALL TIME)
    const totalContributions = contributions.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = totalContributions - totalExpenses;

    // Month-over-month change/diff
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const contributionsLastMonth = contributions
      .filter((c) => { const d = new Date(c.date); return d >= startOfLastMonth && d <= endOfLastMonth; })
      .reduce((sum, c) => sum + c.amount, 0);
    const expensesLastMonth = expenses
      .filter((e) => { const d = new Date(e.date); return d >= startOfLastMonth && d <= endOfLastMonth; })
      .reduce((sum, e) => sum + e.amount, 0);
    const contributionsThisMonth = contributions
      .filter((c) => new Date(c.date) >= startOfMonth)
      .reduce((sum, c) => sum + c.amount, 0);
    const expensesThisMonth = expenses
      .filter((e) => new Date(e.date) >= startOfMonth)
      .reduce((sum, e) => sum + e.amount, 0);

    const pctChange = (current, previous) => {
      const c = Number(current || 0);
      const p = Number(previous || 0);
      if (!p) return c ? 100 : 0;
      return ((c - p) / p) * 100;
    };


    
    // PROGRESS PERCENTAGE
    const progressPercentageValue = churchProject.targetAmount > 0
      ? Math.min(
          Math.round((totalContributions / churchProject.targetAmount) * 100),
          100
        )
      : 0;

      const progressPercentage = `${progressPercentageValue}%`;

    // Balance change/diff (net this month vs net last month)
    const netThisMonth = contributionsThisMonth - expensesThisMonth;
    const netLastMonth = contributionsLastMonth - expensesLastMonth;

    // AUTO-COMPLETE PROJECT STATUS
    if (
      churchProject.status === "Active" &&
      totalContributions >= churchProject.targetAmount
    ) {
      await ChurchProject.findByIdAndUpdate(projectId, {
        status: "Completed"
      });

      churchProject.status = "Completed"; // reflect immediately in response
    }


    return res.status(200).json({
      message: "Project KPI fetched successfully",
      churchProject: {
        ...churchProject,
        totalContributions,
        totalExpenses,
        balance,
        progressPercentage,
        change: {
          totalContributions: pctChange(contributionsThisMonth, contributionsLastMonth),
          totalExpenses: pctChange(expensesThisMonth, expensesLastMonth),
          targetAmount: progressPercentageValue,
          balance: pctChange(netThisMonth, netLastMonth),
        },
        diff: {
          totalContributions: contributionsThisMonth - contributionsLastMonth,
          totalExpenses: expensesThisMonth - expensesLastMonth,
          balance: netThisMonth - netLastMonth,
        },
      }
    });

  } catch (error) {
    return res.status(400).json({
      message: "Project KPI could not be fetched",
      error: error.message
    });
  }
};


export default getProjectContributionExpensesKPI