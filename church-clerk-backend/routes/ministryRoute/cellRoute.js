import express from "express";
const router = express.Router();
import {getAllCells, getSingleCell, createCell, updateCell, deleteCell} from "../../controller/ministryController/cellController.js"
import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.get("/cells", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), getAllCells);
router.get("/cells/:id", protect, authorizeRoles("superadmin", "churchadmin", "admin"), getSingleCell); 
router.post("/cells", protect, authorizeRoles("superadmin", "churchadmin", "admin"), createCell);
router.put("/cells/:id", protect, authorizeRoles("superadmin", "churchadmin", "admin"), updateCell);
router.delete("/cells/:id", protect, authorizeRoles("superadmin", "churchadmin", "admin"), deleteCell);


export default router
