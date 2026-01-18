import express from "express";
const router = express.Router();
import {getAllCells, getSingleCell, createCell, updateCell, deleteCell} from "../../controller/ministryController/cellController.js"
import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.get("/get-cells", protect, authorizeRoles("superadmin", "admin", "financialofficer"), getAllCells);
router.get("/get-cell/:id", protect, authorizeRoles("superadmin", "admin"), getSingleCell); 
router.post("/create-cell", protect, authorizeRoles("superadmin", "admin"), createCell);
router.put("/update-cell/:id", protect, authorizeRoles("superadmin", "admin"), updateCell);
router.delete("/delete-cell/:id", protect, authorizeRoles("superadmin", "admin"), deleteCell);


export default router
