import express from "express";
const router = express.Router();
import {createChurchProjects, getAllChurchProjects, updateChurchProjects, deleteChurchProjects } from "../../controller/financeController/projectController/churchProjectController.js";
import  {createProjectContributions, getAllProjectContributions, updateProjectContributions, deleteProjectContributions } from "../../controller/financeController/projectController/projectContribution.js"
import{ createProjectExpenses, getAllProjectExpenses, updateProjectExpenses, deleteProjectExpenses } from "../../controller/financeController/projectController/projectExpense.js"
import getProjectContributionExpensesKPI from "../../controller/financeController/projectController/projectContributionExpensesKPI.js"


import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";

router.post("/create-church-projects", protect, authorizeRoles("superadmin", "churchadmin"), createChurchProjects);
router.get("/get-church-projects", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllChurchProjects);
router.put("/update-church-projects/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateChurchProjects);
router.delete("/delete-church-projects/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteChurchProjects);

router.post("/:projectId/create-project-contributions", protect, authorizeRoles("superadmin", "churchadmin"), createProjectContributions);
router.get("/:projectId/get-project-contributions", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllProjectContributions);
router.put("/:projectId/update-project-contributions/:contributionId", protect, authorizeRoles("superadmin", "churchadmin"), updateProjectContributions);
router.delete("/:projectId/delete-project-contributions/:contributionId", protect, authorizeRoles("superadmin", "churchadmin"), deleteProjectContributions);

router.post("/:projectId/create-project-expenses", protect, authorizeRoles("superadmin", "churchadmin"), createProjectExpenses);
router.get("/:projectId/get-project-expenses", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllProjectExpenses);
router.put("/:projectId/update-project-expenses/:expensesId", protect, authorizeRoles("superadmin", "churchadmin"), updateProjectExpenses);
router.delete("/:projectId/delete-project-expenses/:expensesId", protect, authorizeRoles("superadmin", "churchadmin"), deleteProjectExpenses);


router.get("/:projectId/get-project-contribution-expenses-kpi", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getProjectContributionExpensesKPI);




export default router
