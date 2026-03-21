import express from "express"
const router = express.Router()
import {
  getAllMembers,
  getSingleMember,
  createMember,
  updateMember,
  deleteMember,
  getAllMembersKPI,
  downloadMembersImportTemplate,
  previewMembersImport,
  importMembersCsv
} from "../controller/memberController.js"
import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";
import {blockMemberCreationIfOverdue} from "../middleware/blockMemberCreationMiddleware.js"
import { uploadMemoryFile } from "../middleware/uploadMemoryFile.js";

const uploadMemberCsv = (req, res, next) => {
  uploadMemoryFile.single("file")(req, res, (err) => {
    if (!err) return next();

    const code = err?.code;
    const message =
      code === "LIMIT_FILE_SIZE"
        ? "File is too large. Maximum size is 50MB."
        : err?.message || "File upload failed";

    return res.status(400).json({ message, code });
  });
};


router.get(
  "/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"),
  requirePermission("members", "read"),
  getAllMembers
);
router.get(
  "/members/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("members", "read"),
  getSingleMember
); 
router.post(
  "/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  blockMemberCreationIfOverdue,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("members", "create"),
  createMember
);

router.get(
  "/members/import/template",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("members", "read"),
  downloadMembersImportTemplate
);

router.post(
  "/members/import/preview",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("members", "create"),
  uploadMemberCsv,
  previewMembersImport
);

router.post(
  "/members/import",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  blockMemberCreationIfOverdue,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("members", "create"),
  uploadMemberCsv,
  importMembersCsv
);
router.put(
  "/members/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("members", "update"),
  updateMember
);
router.delete(
  "/members/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("members", "delete"),
  deleteMember
);
router.get(
  "/members/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  requirePermission("members", "read"),
  getAllMembersKPI
);

export default router
