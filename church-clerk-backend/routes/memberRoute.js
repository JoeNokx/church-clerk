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


router.get("/members", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"), getAllMembers);
router.get("/members/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin"), getSingleMember); 
router.post(
  "/members",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  blockMemberCreationIfOverdue,
  authorizeRoles("superadmin", "supportadmin", "churchadmin"),
  createMember
);

router.get(
  "/members/import/template",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "churchadmin"),
  downloadMembersImportTemplate
);

router.post(
  "/members/import/preview",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "churchadmin"),
  uploadMemberCsv,
  previewMembersImport
);

router.post(
  "/members/import",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  blockMemberCreationIfOverdue,
  authorizeRoles("superadmin", "churchadmin"),
  uploadMemberCsv,
  importMembersCsv
);
router.put("/members/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateMember);
router.delete("/members/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteMember);
router.get(
  "/members/stats/kpi",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "churchadmin", "financialofficer"),
  getAllMembersKPI
);

export default router
