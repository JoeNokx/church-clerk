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


    
    // PROGRESS PERCENTAGE
    const progressPercentageValue = churchProject.targetAmount > 0
      ? Math.min(
          Math.round((totalContributions / churchProject.targetAmount) * 100),
          100
        )
      : 0;

      const progressPercentage = `${progressPercentageValue}%`;

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
        progressPercentage
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