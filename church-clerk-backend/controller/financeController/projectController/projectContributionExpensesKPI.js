import ChurchProject from "../../../models/financeModel/projectModel/churchProjectModel.js";
import ProjectContribution from "../../../models/financeModel/projectModel/projectContributionModel.js";
import ProjectExpenses from "../../../models/financeModel/projectModel/projectExpenseModel.js";
import Pledge from "../../../models/financeModel/pledgeModel/pledgeModel.js";
import PledgePayment from "../../../models/financeModel/pledgeModel/pledgePaymentModel.js";

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
    }).select("name description targetAmount status startDate deadlineDate").lean();

    if (!churchProject) {
      return res.status(404).json({ message: "Church project not found" });
    }

    // FETCH CONTRIBUTIONS, EXPENSES & PLEDGE PAYMENTS (pledge payments count toward amount raised)
    const [contributions, expenses, linkedPledges] = await Promise.all([
      ProjectContribution.find(query).lean(),
      ProjectExpenses.find(query).lean(),
      Pledge.find({ churchProject: projectId, ...(query.church && { church: query.church }) }).select("_id").lean()
    ]);

    const pledgeIds = linkedPledges.map((p) => p._id);
    const pledgePayments = pledgeIds.length
      ? await PledgePayment.find({ pledge: { $in: pledgeIds }, ...(query.church && { church: query.church }) }).lean()
      : [];

    // TOTALS (ALL TIME) — raised = instant-pay contributions + pledge payments
    const totalInstantPay = contributions.reduce((sum, i) => sum + i.amount, 0);
    const totalPledgePayments = pledgePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalContributions = totalInstantPay + totalPledgePayments;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = totalContributions - totalExpenses;

    // Month-over-month change/diff
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const contributionRows = [
      ...contributions.map((c) => ({ date: c.date, amount: c.amount })),
      ...pledgePayments.map((p) => ({ date: p.paymentDate, amount: p.amount }))
    ];

    const contributionsLastMonth = contributionRows
      .filter((c) => { const d = new Date(c.date); return d >= startOfLastMonth && d <= endOfLastMonth; })
      .reduce((sum, c) => sum + c.amount, 0);
    const expensesLastMonth = expenses
      .filter((e) => { const d = new Date(e.date); return d >= startOfLastMonth && d <= endOfLastMonth; })
      .reduce((sum, e) => sum + e.amount, 0);
    const contributionsThisMonth = contributionRows
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

    // AUTO-DERIVED STATUS (never user-set): Completed -> target reached, Overdue -> past deadline,
    // Not Started -> no payments, In Progress -> payments started
    const target = Number(churchProject.targetAmount || 0);
    let pastDeadline = false;
    if (churchProject.deadlineDate) {
      const d = new Date(churchProject.deadlineDate);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        pastDeadline = d.getTime() < Date.now();
      }
    }
    const derivedStatus =
      target > 0 && totalContributions >= target ? "Completed"
      : pastDeadline ? "Overdue"
      : totalContributions <= 0 ? "Not Started"
      : "In Progress";
    churchProject.status = derivedStatus;


    return res.status(200).json({
      message: "Project KPI fetched successfully",
      churchProject: {
        ...churchProject,
        totalContributions,
        totalInstantPay,
        totalPledgePayments,
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