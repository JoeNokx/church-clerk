import express from "express";
const router = express.Router();
import {createChurchProjects, getAllChurchProjects, updateChurchProjects, deleteChurchProjects } from "../../controller/financeController/projectController/churchProjectController.js";
import  {createProjectContributions, getAllProjectContributions, updateProjectContributions, deleteProjectContributions } from "../../controller/financeController/projectController/projectContribution.js"
import{ createProjectExpenses, getAllProjectExpenses, updateProjectExpenses, deleteProjectExpenses } from "../../controller/financeController/projectController/projectExpense.js"
import getProjectContributionExpensesKPI from "../../controller/financeController/projectController/projectContributionExpensesKPI.js"


import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";

router.post("/church-projects", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createChurchProjects);
router.get("/church-projects", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllChurchProjects);
router.put("/church-projects/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateChurchProjects);
router.delete("/church-projects/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteChurchProjects);

router.post("/church-projects/:projectId/contributions", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createProjectContributions);
router.get("/church-projects/:projectId/contributions", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllProjectContributions);
router.put("/church-projects/:projectId/contributions/:contributionId", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateProjectContributions);
router.delete("/church-projects/:projectId/contributions/:contributionId", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteProjectContributions);

router.post("/church-projects/:projectId/expenses", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createProjectExpenses);
router.get("/church-projects/:projectId/expenses", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllProjectExpenses);
router.put("/church-projects/:projectId/expenses/:expensesId", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateProjectExpenses);
router.delete("/church-projects/:projectId/expenses/:expensesId", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteProjectExpenses);


router.get("/church-projects/:projectId/contribution-expenses/kpi", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getProjectContributionExpensesKPI);




export default router
