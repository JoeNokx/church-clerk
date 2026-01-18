import express from "express";
const router = express.Router();
import {getUpcomingEvents, getOngoingEvents, getPastEvents} from "../controller/eventController/getAllEvents.js"

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

import { protect } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";


router.get("/get-events/upcoming", protect, authorizeRoles("superadmin", "churchadmin"), getUpcomingEvents);
router.get("/get-events/ongoing", protect, authorizeRoles("superadmin", "churchadmin"), getOngoingEvents);
router.get("/get-events/past", protect, authorizeRoles("superadmin", "churchadmin"), getPastEvents);


router.get("/get-events/:id", protect, authorizeRoles("superadmin", "churchadmin"), getSingleEvent); 
router.post("/create-events", protect, authorizeRoles("superadmin", "churchadmin"), createEvent);
router.put("/update-events/:id", protect, authorizeRoles("superadmin", "churchadmin"), updateEvent);
router.delete("/delete-events/:id", protect, authorizeRoles("superadmin", "churchadmin"), deleteEvent);


router.post("/events/:eventId/attendees", protect, authorizeRoles("superadmin", "churchadmin"), createEventAttendee);
router.get("/events/:eventId/attendees", protect, authorizeRoles("superadmin", "churchadmin"), getEventAttendees);
router.put("/events/:eventId/attendees/:attendeeId", protect, authorizeRoles("superadmin", "churchadmin"), updateEventAttendee);
router.delete("/events/:eventId/attendees/:attendeeId", protect, authorizeRoles("superadmin", "churchadmin"), deleteEventAttendee);

router.post("/events/:eventId/attendances", protect, authorizeRoles("superadmin", "churchadmin"), createTotalEventAttendance);
router.get("/events/:eventId/attendances", protect, authorizeRoles("superadmin", "churchadmin"), getAllTotalEventAttendances);
router.put("/events/:eventId/attendances/:attendanceId", protect, authorizeRoles("superadmin", "churchadmin"), updateTotalEventAttendance);
router.delete("/events/:eventId/attendances/:attendanceId", protect, authorizeRoles("superadmin", "churchadmin"), deleteTotalEventAttendance);

export default router