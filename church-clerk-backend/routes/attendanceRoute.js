import express from "express";
const router = express.Router();
import {getAllAttendances, createAttendance, updateAttendance, deleteAttendance,
    createVisitor, getSingleVisitor, getAllVisitors, updateVisitor, deleteVisitor
} from "../controller/attendanceController.js"
import authorizeRoles from "../middleware/roleMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";


router.get("/attendances", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllAttendances);
router.post("/attendances", protect, authorizeRoles("superadmin", "churchadmin"), createAttendance);
router.put("/attendances/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateAttendance);
router.delete("/attendances/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteAttendance);

router.post("/visitors", protect, authorizeRoles("superadmin", "churchadmin"), createVisitor);
router.put("/visitors/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateVisitor);
router.delete("/visitors/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteVisitor);
router.get("/visitors/:id", protect, authorizeRoles("superadmin", "churchadmin"), getSingleVisitor);
router.get("/visitors", protect, authorizeRoles("superadmin", "churchadmin", "financialofficer"), getAllVisitors);


export default router