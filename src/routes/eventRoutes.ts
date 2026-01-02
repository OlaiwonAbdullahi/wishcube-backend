import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  createEvent,
  getMyEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  sendInvitations,
  getEventByShareLink,
  getEventDashboard,
} from "../controllers/eventController";
import {
  submitRSVP,
  updateRSVP,
  getEventRSVPs,
  getRSVPStatus,
} from "../controllers/rsvpController";
import {
  createEventValidator,
  submitRSVPValidator,
  paginationValidator,
} from "../utils/validators";

const router = Router();

// Public routes
router.get("/share/:link", getEventByShareLink);
router.post("/:eventId/rsvp", submitRSVPValidator, submitRSVP);
router.put("/:eventId/rsvp", updateRSVP);
router.get("/:eventId/rsvp/:email", getRSVPStatus);

// Protected routes
router.use(auth);

router.post("/", createEventValidator, createEvent);
router.get("/", paginationValidator, getMyEvents);
router.get("/:id", getEventById);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);
router.post("/:id/invite", sendInvitations);
router.get("/:id/dashboard", getEventDashboard);
router.get("/:eventId/rsvps", getEventRSVPs);

export default router;
