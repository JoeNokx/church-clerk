import express from "express";
const router = express.Router();
import {getAllAttendances, createAttendance, updateAttendance, deleteAttendance,
    createVisitor, getSingleVisitor, getAllVisitors, updateVisitor, deleteVisitor
} from "../controller/attendanceController.js"
import authorizeRoles from "../middleware/roleMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";


router.get("/get-attendances", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllAttendances);
router.post("/create-attendances", protect, authorizeRoles("superadmin", "churchadmin"), createAttendance);
router.put("/update-attendances/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateAttendance);
router.delete("/delete-attendances/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteAttendance);

router.post("/create-visitors", protect, authorizeRoles("superadmin", "churchadmin"), createVisitor);
router.put("/update-visitors/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateVisitor);
router.delete("/delete-visitors/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteVisitor);
router.get("/get-visitors/:id", protect, authorizeRoles("superadmin", "churchadmin"), getSingleVisitor);
router.get("/get-visitors", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllVisitors);


export default router