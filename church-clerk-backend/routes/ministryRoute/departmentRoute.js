import express from "express";
const router = express.Router();
import {getAllDepartments, getSingleDepartment, createDepartment, updateDepartment, deleteDepartment} from "../../controller/ministryController/departmentController.js"    
import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.get("/departments", protect, authorizeRoles("superadmin", "churchadmin", "admin", "financialofficer"), getAllDepartments);
router.get("/departments/:id", protect, authorizeRoles("superadmin", "churchadmin", "admin"), getSingleDepartment); 
router.post("/departments", protect, authorizeRoles("superadmin", "churchadmin", "admin"), createDepartment);
router.put("/departments/:id", protect, authorizeRoles("superadmin", "churchadmin", "admin"), updateDepartment);
router.delete("/departments/:id", protect, authorizeRoles("superadmin", "churchadmin", "admin"), deleteDepartment);

export default router
