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
  importMembersCsv,
  canCreateMember
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
   "/members/can-create",
   protect,
   setActiveChurch,
   readOnlyBranchGuard,
   attachPermissions,
   authorizeRoles("superadmin", "churchadmin"),
   requirePermission("members", "create"),
   canCreateMember
 );
router.get(
  "/members/:id",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  requirePermission("members", "view"),
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
  (req, res, next) => {
    if (req.body?.visitorId) {
      return requirePermission("visitors", "convert")(req, res, next);
    }
    return requirePermission("members", "create")(req, res, next);
  },
  createMember
);

router.get(
  "/members/import/template",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("members", "import"),
  downloadMembersImportTemplate
);

router.post(
  "/members/import/preview",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  attachPermissions,
  authorizeRoles("superadmin", "churchadmin"),
  requirePermission("members", "import"),
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
  requirePermission("members", "import"),
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
