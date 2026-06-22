import TitheIndividual from "../../models/financeModel/tithesModel/titheIndividualModel.js";
import TitheAggregate from "../../models/financeModel/tithesModel/titheAggregateModel.js";
import Offering from "../../models/financeModel/offeringModel.js";
import Expense from "../../models/financeModel/incomeExpenseModel/expenseModel.js";
import Income from "../../models/financeModel/incomeExpenseModel/incomeModel.js";
import SpecialFund from "../../models/financeModel/specialFundModel.js";
import WelfareContribution from "../../models/financeModel/welfareModel/welfareContributionModel.js";
import WelfareDisbursement from "../../models/financeModel/welfareModel/welfareDisbursementModel.js";
import Pledge from "../../models/financeModel/pledgeModel/pledgeModel.js";
import PledgePayment from "../../models/financeModel/pledgeModel/pledgePaymentModel.js";
import BusinessExpense from "../../models/financeModel/businessModel/businessExpensesModel.js";
import BusinessIncome from "../../models/financeModel/businessModel/businessIncomeModel.js";
import ProjectContribution from "../../models/financeModel/projectModel/projectContributionModel.js";
import ProjectExpense from "../../models/financeModel/projectModel/projectExpenseModel.js";

const MODEL_MAP = {
  "tithes:titheIndividual": TitheIndividual,
  "tithes:titheAggregate": TitheAggregate,
  "offerings:offering": Offering,
  "expenses:expense": Expense,
  "expenses:income": Income,
  "special_funds:specialFund": SpecialFund,
  "welfare:welfareContribution": WelfareContribution,
  "welfare:welfareDisbursement": WelfareDisbursement,
  "pledges:pledge": Pledge,
  "pledges:pledgePayment": PledgePayment,
  "business:businessExpense": BusinessExpense,
  "business:businessIncome": BusinessIncome,
  "programs:projectContribution": ProjectContribution,
  "programs:projectExpense": ProjectExpense,
};

export function getModelForEntity(module, entityType) {
  const key = `${module}:${entityType}`;
  return MODEL_MAP[key] || null;
}
