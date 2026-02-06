import express from "express";
const router = express.Router();
import {getEvents, getEventStats, getUpcomingEvents, getOngoingEvents, getPastEvents} from "../controller/eventController/getAllEvents.js"

import createEvent from "../controller/eventController/createEvent.js"
import getSingleEvent from "../controller/eventController/getSingleEvent.js"
import updateEvent from "../controller/eventController/updateEvent.js"
import deleteEvent from "../controller/eventController/deleteEvent.js"

import {createEventAttendee, getEventAttendees, updateEventAttendee, deleteEventAttendee} from "../controller/eventController/eventAttendee.js"

import {
    createTotalEventAttendance,
    getAllTotalEventAttendances,
    updateTotalEventAttendance,
    deleteTotalEventAttendance
} from "../controller/eventController/totalEventAttendance.js"

import {
  uploadEventAttendanceFile,
  listEventAttendanceFiles,
  updateEventAttendanceFile,
  downloadEventAttendanceFile,
  deleteEventAttendanceFile
} from "../controller/eventController/eventAttendanceFiles.js";

import {
  createEventOffering,
  getEventOfferings,
  updateEventOffering,
  deleteEventOffering
} from "../controller/eventController/eventOfferingController.js";

import { uploadMemoryFile } from "../middleware/uploadMemoryFile.js";

import { protect } from "../middleware/authMiddleware.js";
import { setActiveChurch } from "../middleware/activeChurchMiddleware.js";
import { readOnlyBranchGuard } from "../middleware/readOnlyBranchesMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const uploadAttendanceFile = (req, res, next) => {
  uploadMemoryFile.single("file")(req, res, (err) => {
    if (!err) return next();

    const code = err?.code;
    const message =
      code === "LIMIT_FILE_SIZE"
        ? "File is too large. Maximum size is 50MB."
        : err?.message || "File upload failed";

    return res.status(400).json({ message, code });
  });
};

router.get("/events", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), getEvents);
router.get("/events/stats", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), getEventStats);

router.get("/events/upcoming", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), getUpcomingEvents);
router.get("/events/ongoing", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), getOngoingEvents);
router.get("/events/past", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), getPastEvents);

router.get("/events/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), getSingleEvent); 
router.post("/events", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createEvent);
router.put("/events/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateEvent);
router.delete("/events/:id", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteEvent);

router.post("/events/:eventId/attendees", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createEventAttendee);
router.get("/events/:eventId/attendees", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), getEventAttendees);
router.put("/events/:eventId/attendees/:attendeeId", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateEventAttendee);
router.delete("/events/:eventId/attendees/:attendeeId", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteEventAttendee);

router.post("/events/:eventId/attendances", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), createTotalEventAttendance);
router.get("/events/:eventId/attendances", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), getAllTotalEventAttendances);
router.put("/events/:eventId/attendances/:attendanceId", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), updateTotalEventAttendance);
router.delete("/events/:eventId/attendances/:attendanceId", protect, setActiveChurch, readOnlyBranchGuard, authorizeRoles("superadmin", "churchadmin"), deleteTotalEventAttendance);

router.post(
  "/events/:eventId/attendance-files",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "churchadmin"),
  uploadAttendanceFile,
  uploadEventAttendanceFile
);

router.get(
  "/events/:eventId/attendance-files",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "churchadmin"),
  listEventAttendanceFiles
);

router.get(
  "/events/:eventId/attendance-files/:fileId/download",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "churchadmin"),
  downloadEventAttendanceFile
);

router.put(
  "/events/:eventId/attendance-files/:fileId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "churchadmin"),
  updateEventAttendanceFile
);

router.delete(
  "/events/:eventId/attendance-files/:fileId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "churchadmin"),
  deleteEventAttendanceFile
);

router.post(
  "/events/:eventId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "churchadmin"),
  createEventOffering
);

router.get(
  "/events/:eventId/offerings",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "churchadmin"),
  getEventOfferings
);

router.put(
  "/events/:eventId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "churchadmin"),
  updateEventOffering
);

router.delete(
  "/events/:eventId/offerings/:offeringId",
  protect,
  setActiveChurch,
  readOnlyBranchGuard,
  authorizeRoles("superadmin", "churchadmin"),
  deleteEventOffering
);

export default router