import BusinessIncome from "../../../models/financeModel/businessModel/businessIncomeModel.js";
import BusinessExpenses from "../../../models/financeModel/businessModel/businessExpensesModel.js";
import BusinessVentures from "../../../models/financeModel/businessModel/businessVenturesModel.js";


const getIncomeExpensesKPI = async (req, res) => {

     try {
    const { businessId } = req.params;


    // BASE QUERY
    const query = { businessVentures: businessId };

    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    // CHECK BUSINESS EXISTS
    const business = await BusinessVentures.findOne({
      _id: businessId,
      ...(query.church && { church: query.church })
    }).lean();

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    
    // DATE RANGE: CURRENT MONTH
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    // FETCH INCOME & EXPENSES FOR THIS BUSINESS
    const [incomes, expenses] = await Promise.all([
      BusinessIncome.find(query).lean(),
      BusinessExpenses.find(query).lean()
    ]);

     // TOTALS (ALL TIME)
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalNet = totalIncome - totalExpenses;

    //number of transactions made in ALL time
    const incomeCount = incomes.length;
    const expensesCount = expenses.length;

     // TOTALS (THIS MONTH)
    const incomeThisMonth = incomes
      .filter(i => new Date(i.date) >= startOfMonth && new Date(i.date) <= endOfMonth)
      .reduce((sum, i) => sum + i.amount, 0);

    const expensesThisMonth = expenses
      .filter(e => new Date(e.date) >= startOfMonth && new Date(e.date) <= endOfMonth)
      .reduce((sum, e) => sum + e.amount, 0);


    return res.status(200).json({
      message: "Business KPI fetched successfully",
      business: {
        ...business,
        totalIncome,
        totalExpenses,
        totalNet,
         incomeThisMonth,
        expensesThisMonth,
         incomeCount,
         expensesCount
      }
    });

  } catch (error) {
    return res.status(400).json({
      message: "Business KPI could not be fetched",
      error: error.message
    });
  }
};


export default getIncomeExpensesKPI