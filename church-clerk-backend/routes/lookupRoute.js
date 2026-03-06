import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

import { listLookupValues, createLookupValue } from "../controller/lookupController.js";

const router = express.Router();

const allowedReadRoles = [
  "superadmin",
  "supportadmin",
  "churchadmin",
  "associateadmin",
  "secretary",
  "financialofficer",
  "leader"
];

const allowedWriteRoles = [
  "superadmin",
  "supportadmin",
  "churchadmin",
  "associateadmin",
  "secretary",
  "financialofficer",
  "leader"
];

router.get("/", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles(...allowedReadRoles), listLookupValues);
router.post("/", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles(...allowedWriteRoles), createLookupValue);

export default router;
