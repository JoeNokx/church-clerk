import express from "express";
const router = express.Router();

import { registerSystemAdmin, loginSystemAdmin, logoutSystemAdmin } from "../controller/adminAuthController.js";
import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

router.post("/login", loginSystemAdmin);
router.post("/logout", protect, authorizeRoles("superadmin", "supportadmin"), logoutSystemAdmin);
router.post("/register", protect, authorizeRoles("superadmin"), registerSystemAdmin);

export default router;
