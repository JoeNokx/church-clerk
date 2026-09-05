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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

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

    // TOTALS (LAST MONTH) for change/diff
    const incomeLastMonth = incomes
      .filter(i => { const d = new Date(i.date); return d >= startOfLastMonth && d <= endOfLastMonth; })
      .reduce((sum, i) => sum + i.amount, 0);

    const expensesLastMonth = expenses
      .filter(e => { const d = new Date(e.date); return d >= startOfLastMonth && d <= endOfLastMonth; })
      .reduce((sum, e) => sum + e.amount, 0);

    const pctChange = (current, previous) => {
      const c = Number(current || 0);
      const p = Number(previous || 0);
      if (!p) return c ? 100 : 0;
      return ((c - p) / p) * 100;
    };


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
         expensesCount,
         change: {
           totalIncome: pctChange(incomeThisMonth, incomeLastMonth),
           totalExpenses: pctChange(expensesThisMonth, expensesLastMonth),
           totalNet: pctChange(incomeThisMonth - expensesThisMonth, incomeLastMonth - expensesLastMonth),
         },
         diff: {
           totalIncome: incomeThisMonth - incomeLastMonth,
           totalExpenses: expensesThisMonth - expensesLastMonth,
           totalNet: (incomeThisMonth - expensesThisMonth) - (incomeLastMonth - expensesLastMonth),
         },
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