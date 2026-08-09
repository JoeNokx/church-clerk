import express from "express";
const router = express.Router();

import { globalSearch } from "../controller/globalSearchController.js";
import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { attachPermissions } from "../middleware/attachPermissionsMiddleware.js";

router.get("/", protect, setActiveChurch, attachPermissions, globalSearch);

export default router;
