import Offering from "../models/financeModel/offeringModel.js";
import GeneralExpenses from "../models/generalExpenseModel.js";
import Expense from "../models/financeModel/incomeExpenseModel/expenseModel.js";
import Income from "../models/financeModel/incomeExpenseModel/incomeModel.js";
import SpecialFund from "../models/financeModel/specialFundModel.js";
import TitheAggregate from "../models/financeModel/tithesModel/titheAggregateModel.js";
import TitheIndividual from "../models/financeModel/tithesModel/titheIndividualModel.js";
import WelfareContributions from "../models/financeModel/welfareModel/welfareContributionModel.js";
import WelfareDisbursements from "../models/financeModel/welfareModel/welfareDisbursementModel.js";
import PledgePayment from "../models/financeModel/pledgeModel/pledgePaymentModel.js";
import ProjectContribution from "../models/financeModel/projectModel/projectContributionModel.js";
import ProjectExpense from "../models/financeModel/projectModel/projectExpenseModel.js";
import BusinessIncome from "../models/financeModel/businessModel/businessIncomeModel.js";
import BusinessExpenses from "../models/financeModel/businessModel/businessExpensesModel.js";
import AnnouncementWalletTransaction from "../models/announcementWalletTransactionModel.js";
import BillingHistory from "../models/billingModel/billingHistoryModel.js";

export async function isCurrencyLockedForChurch(churchId) {
  if (!churchId) return false;

  const queries = [
    Offering.exists({ church: churchId }),
    GeneralExpenses.exists({ church: churchId }),
    Expense.exists({ church: churchId }),
    Income.exists({ church: churchId }),
    SpecialFund.exists({ church: churchId }),
    TitheAggregate.exists({ church: churchId }),
    TitheIndividual.exists({ church: churchId }),
    WelfareContributions.exists({ church: churchId }),
    WelfareDisbursements.exists({ church: churchId }),
    PledgePayment.exists({ church: churchId }),
    ProjectContribution.exists({ church: churchId }),
    ProjectExpense.exists({ church: churchId }),
    BusinessIncome.exists({ church: churchId }),
    BusinessExpenses.exists({ church: churchId }),
    AnnouncementWalletTransaction.exists({ church: churchId }),
    BillingHistory.exists({ church: churchId })
  ];

  const results = await Promise.all(
    queries.map((q) =>
      Promise.resolve(q).catch(() => null)
    )
  );

  return results.some(Boolean);
}
