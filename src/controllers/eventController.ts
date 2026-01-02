import { Response } from "express";
import { validationResult } from "express-validator";
import Event from "../models/Event";
import RSVP from "../models/RSVP";
import { AuthRequest } from "../types";
import { getPagination, formatPaginatedResponse } from "../utils/helpers";
import { sendEventInvitation } from "../services/emailService";
import { env } from "../config/env";

// Create Event
export const createEvent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const {
      title,
      description,
      eventType,
      date,
      time,
      location,
      coverImage,
      isPublic,
      maxAttendees,
    } = req.body;

    const event = await Event.create({
      userId: req.user!._id,
      title,
      description,
      eventType,
      date,
      time,
      location,
      coverImage,
      isPublic,
      maxAttendees,
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully.",
      data: event,
    });
  } catch (error) {
    console.error("Create event error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create event." });
  }
};

// Get My Events
export const getMyEvents = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { skip } = getPagination(page, limit);

    const [events, total] = await Promise.all([
      Event.find({ userId: req.user!._id })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Event.countDocuments({ userId: req.user!._id }),
    ]);

    res.json({
      success: true,
      ...formatPaginatedResponse(events, total, page, limit),
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch events." });
  }
};

// Get Event by ID
export const getEventById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      userId: req.user!._id,
    });

    if (!event) {
      res.status(404).json({ success: false, message: "Event not found." });
      return;
    }

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch event." });
  }
};

// Update Event
export const updateEvent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      description,
      eventType,
      date,
      time,
      location,
      coverImage,
      isPublic,
      maxAttendees,
    } = req.body;

    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      {
        title,
        description,
        eventType,
        date,
        time,
        location,
        coverImage,
        isPublic,
        maxAttendees,
      },
      { new: true, runValidators: true }
    );

    if (!event) {
      res.status(404).json({ success: false, message: "Event not found." });
      return;
    }

    res.json({
      success: true,
      message: "Event updated successfully.",
      data: event,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update event." });
  }
};

// Delete Event
export const deleteEvent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!._id,
    });

    if (!event) {
      res.status(404).json({ success: false, message: "Event not found." });
      return;
    }

    // Delete associated RSVPs
    await RSVP.deleteMany({ eventId: event._id });

    res.json({ success: true, message: "Event deleted successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to delete event." });
  }
};

// Send Invitations
export const sendInvitations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      res
        .status(400)
        .json({ success: false, message: "Emails array is required." });
      return;
    }

    const event = await Event.findOne({
      _id: req.params.id,
      userId: req.user!._id,
    });

    if (!event) {
      res.status(404).json({ success: false, message: "Event not found." });
      return;
    }

    const eventLink = `${env.appUrl}/events/${event.shareableLink}`;
    const hostName = `${req.user!.firstName} ${req.user!.lastName}`;

    // Send emails and track invitations
    const newInvitations = [];
    for (const email of emails) {
      // Check if already invited
      const alreadyInvited = event.invitations.some(
        (inv) => inv.email === email
      );
      if (!alreadyInvited) {
        try {
          await sendEventInvitation(email, event.title, eventLink, hostName);
          newInvitations.push({
            email,
            sentAt: new Date(),
            status: "sent" as const,
          });
        } catch (error) {
          console.error(`Failed to send to ${email}:`, error);
        }
      }
    }

    event.invitations.push(...newInvitations);
    await event.save();

    res.json({
      success: true,
      message: `${newInvitations.length} invitations sent.`,
      data: {
        sentCount: newInvitations.length,
        totalInvitations: event.invitations.length,
      },
    });
  } catch (error) {
    console.error("Send invitations error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to send invitations." });
  }
};

// Get Event by Share Link (Public)
export const getEventByShareLink = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { link } = req.params;

    const event = await Event.findOne({ shareableLink: link }).populate(
      "userId",
      "firstName lastName avatar"
    );

    if (!event) {
      res.status(404).json({ success: false, message: "Event not found." });
      return;
    }

    // Get RSVP counts
    const [accepted, declined, maybe] = await Promise.all([
      RSVP.countDocuments({ eventId: event._id, status: "accepted" }),
      RSVP.countDocuments({ eventId: event._id, status: "declined" }),
      RSVP.countDocuments({ eventId: event._id, status: "maybe" }),
    ]);

    // Calculate total attendees including plus ones
    const attendeesData = await RSVP.find({
      eventId: event._id,
      status: "accepted",
    });
    const totalAttendees = attendeesData.reduce(
      (sum, rsvp) => sum + 1 + rsvp.plusOnes,
      0
    );

    res.json({
      success: true,
      data: {
        event,
        rsvpStats: {
          accepted,
          declined,
          maybe,
          totalAttendees,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch event." });
  }
};

// Get Event Dashboard
export const getEventDashboard = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      userId: req.user!._id,
    });

    if (!event) {
      res.status(404).json({ success: false, message: "Event not found." });
      return;
    }

    // Get all RSVPs with stats
    const rsvps = await RSVP.find({ eventId: event._id }).sort({
      respondedAt: -1,
    });

    const stats = {
      pending: rsvps.filter((r) => r.status === "pending").length,
      accepted: rsvps.filter((r) => r.status === "accepted").length,
      declined: rsvps.filter((r) => r.status === "declined").length,
      maybe: rsvps.filter((r) => r.status === "maybe").length,
    };

    // Calculate total attendees including plus ones
    const acceptedRsvps = rsvps.filter((r) => r.status === "accepted");
    const totalAttendees = acceptedRsvps.reduce(
      (sum, rsvp) => sum + 1 + rsvp.plusOnes,
      0
    );

    res.json({
      success: true,
      data: {
        event,
        stats: {
          ...stats,
          totalInvitations: event.invitations.length,
          totalRsvps: rsvps.length,
          totalAttendees,
          capacityReached: event.maxAttendees
            ? totalAttendees >= event.maxAttendees
            : false,
        },
        rsvps,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch dashboard." });
  }
};
