import express from "express";
const router = express.Router();

import { registerSystemAdmin, loginSystemAdmin, logoutSystemAdmin, getSystemAdminMe } from "../controller/adminAuthController.js";
import { protectAdmin } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

router.post("/login", loginSystemAdmin);
router.get("/me", protectAdmin, authorizeRoles("superadmin", "supportadmin"), getSystemAdminMe);
router.post("/logout", protectAdmin, authorizeRoles("superadmin", "supportadmin"), logoutSystemAdmin);
router.post("/register", protectAdmin, authorizeRoles("superadmin"), registerSystemAdmin);

export default router;
