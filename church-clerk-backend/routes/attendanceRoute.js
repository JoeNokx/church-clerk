import express from "express";
const router = express.Router();
import {getAllAttendances, createAttendance, updateAttendance, deleteAttendance,
    createVisitor, getSingleVisitor, getAllVisitors, updateVisitor, deleteVisitor
} from "../controller/attendanceController.js"
import authorizeRoles from "../middleware/roleMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";


router.get("/attendances", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"), getAllAttendances);
router.post("/attendances", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin"), createAttendance);
router.put("/attendances/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin"), updateAttendance);
router.delete("/attendances/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin"), deleteAttendance);

router.post("/visitors", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin"), createVisitor);
router.put("/visitors/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin"), updateVisitor);
router.delete("/visitors/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin"), deleteVisitor);
router.get("/visitors/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin"), getSingleVisitor);
router.get("/visitors", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "supportadmin", "churchadmin", "financialofficer"), getAllVisitors);


export default router