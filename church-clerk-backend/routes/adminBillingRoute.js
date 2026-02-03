import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import requireSuperAdmin from "../middleware/requireSuperAdmin.js";

import {
  createPlan,
  deletePlan,
  getPlans,
  getSubscriptions,
  updatePlan
} from "../controller/adminBillingController.js";

const router = express.Router();

router.use(protect);
router.use(requireSuperAdmin);

router.post("/plans", createPlan);
router.get("/plans", getPlans);
router.put("/plans/:id", updatePlan);
router.delete("/plans/:id", deletePlan);

router.get("/subscriptions", getSubscriptions);

export default router;
