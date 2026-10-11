import express from "express";
const router = express.Router();
import {getAllGroups, getSingleGroup, createGroup, updateGroup, deleteGroup, searchMembersToAddToGroup, addMemberToGroup, getGroupMembers,updateMemberRole, removeMemberFromGroup, addMeeting, updateMeeting, deleteMeeting, getMeetings, getOrganisationKPI } from "../../controller/organisationController/groupController.js"

import {
  createGroupIndividualAttendance,
  getAllGroupIndividualAttendances,
  getSingleGroupIndividualAttendance,
  updateGroupIndividualAttendance,
  deleteGroupIndividualAttendance,
  getGroupCheckInLinkStatus,
  generateGroupCheckInLink,
  revokeGroupCheckInLink
} from "../../controller/organisationController/groupIndividualAttendanceController.js";
import  {createGroupOffering, updateGroupOffering, deleteGroupOffering, getAllGroupOfferings} from "../../controller/organisationController/groupOfferingController.js"
import { createOrgContribution, getOrgContributions, updateOrgContribution, deleteOrgContribution } from "../../controller/organisationController/organisationContributionController.js";
import { createScopedExpense, getScopedExpenses, updateScopedExpense, deleteScopedExpense, downloadScopedExpenseReceipt } from "../../controller/scopedExpensesController.js";
import { backdatingGuard, conditionalImmutableGuard } from "../../middleware/financialGovernance.js";
import { uploadReceiptFile } from "../../middleware/uploadReceiptFile.js";

import { protect } from "../../middleware/authMiddleware.js";
import { setActiveChurch } from "../../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { attachPermissions } from "../../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";
import { deletionGuard } from "../../services/recordDependencyService.js";


router.get(
  "/groups",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("organisation", "read"),
  getAllGroups
);
router.get(
  "/groups/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "view"),
  getSingleGroup
); 
router.post(
  "/groups",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "create"),
  createGroup
);
router.put(
  "/groups/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "update"),
  updateGroup
);
router.delete(
  "/groups/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "delete"),
  deletionGuard("group"),
  deleteGroup
);


router.post(
  "/groups/:id/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "update"),
  addMemberToGroup
);
router.get(
  "/groups/:id/members/search",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "read"),
  searchMembersToAddToGroup
);
router.get(
  "/groups/:id/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "read"),
  getGroupMembers
);
router.put(
  "/groups/:id/members/:memberId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "update"),
  updateMemberRole
);
router.delete(
  "/groups/:id/members/:memberId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "update"),
  removeMemberFromGroup
);


router.post(
  "/groups/:id/meetings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "create"),
  addMeeting
);
router.get(
  "/groups/:id/meetings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "read"),
  getMeetings
);
router.put(
  "/groups/:id/meetings/:meetingId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "update"),
  updateMeeting
);
router.delete(
  "/groups/:id/meetings/:meetingId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "delete"),
  deleteMeeting
);


router.get(
  "/groups/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "read"),
  getOrganisationKPI
);

router.post(
  "/groups/:groupId/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "create"),
  createGroupIndividualAttendance
);
router.get(
  "/groups/:groupId/individual-attendances",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "read"),
  getAllGroupIndividualAttendances
);
router.get(
  "/groups/:groupId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "read"),
  getSingleGroupIndividualAttendance
);
router.put(
  "/groups/:groupId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "update"),
  updateGroupIndividualAttendance
);
router.delete(
  "/groups/:groupId/individual-attendances/:attendanceId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "delete"),
  deletionGuard("groupIndividualAttendance", "attendanceId"),
  deleteGroupIndividualAttendance
);

router.get(
  "/groups/:groupId/individual-attendances/:attendanceId/checkin-link",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  getGroupCheckInLinkStatus
);
router.post(
  "/groups/:groupId/individual-attendances/:attendanceId/checkin-link/generate",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "update"),
  generateGroupCheckInLink
);
router.delete(
  "/groups/:groupId/individual-attendances/:attendanceId/checkin-link/revoke",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "update"),
  revokeGroupCheckInLink
);


router.post(
  "/groups/:groupId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "create"),
  backdatingGuard({ dateField: "date", module: "groupOffering", entityType: "groupOffering" }),
  createGroupOffering
);
router.get(
  "/groups/:groupId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "read"),
  getAllGroupOfferings
);
router.put(
  "/groups/:groupId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "update"),
  conditionalImmutableGuard(),
  updateGroupOffering
);


router.post(
  "/groups/:groupId/contributions",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "create"),
  createOrgContribution
);
router.get(
  "/groups/:groupId/contributions",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "read"),
  getOrgContributions
);
router.put(
  "/groups/:groupId/contributions/:contributionId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "update"),
  updateOrgContribution
);
router.delete(
  "/groups/:groupId/contributions/:contributionId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "delete"),
  deleteOrgContribution
);

router.post(
  "/groups/:groupId/expenses",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "create"),
  uploadReceiptFile,
  backdatingGuard({ dateField: "date", module: "expenses", entityType: "generalExpense" }),
  createScopedExpense("group")
);
router.get(
  "/groups/:groupId/expenses",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "read"),
  getScopedExpenses("group")
);
router.put(
  "/groups/:groupId/expenses/:expenseId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "update"),
  uploadReceiptFile,
  conditionalImmutableGuard(),
  updateScopedExpense("group")
);
router.get(
  "/groups/:groupId/expenses/:expenseId/receipt/download",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"),
  requirePermission("organisation", "read"),
  downloadScopedExpenseReceipt("group")
);
router.delete(
  "/groups/:groupId/expenses/:expenseId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer", "secretary", "leader", "admin", "associateadmin"),
  requirePermission("organisation", "delete"),
  conditionalImmutableGuard(),
  deleteScopedExpense("group")
);

export default router
