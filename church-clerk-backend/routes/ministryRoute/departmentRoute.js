import express from "express";
const router = express.Router();
import {getAllDepartments, getSingleDepartment, createDepartment, updateDepartment, deleteDepartment} from "../../controller/ministryController/departmentController.js"    
import { protect } from "../../middleware/authMiddleware.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";


router.get("/get-departments", protect, authorizeRoles("superadmin", "admin", "financialofficer"), getAllDepartments);
router.get("/get-department/:id", protect, authorizeRoles("superadmin", "admin"), getSingleDepartment); 
router.post("/create-department", protect, authorizeRoles("superadmin", "admin"), createDepartment);
router.put("/update-department/:id", protect, authorizeRoles("superadmin", "admin"), updateDepartment);
router.delete("/delete-department/:id", protect, authorizeRoles("superadmin", "admin"), deleteDepartment);

export default router
