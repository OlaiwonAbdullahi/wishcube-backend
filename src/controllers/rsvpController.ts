import { Response } from "express";
import { validationResult } from "express-validator";
import RSVP from "../models/RSVP";
import Event from "../models/Event";
import { AuthRequest } from "../types";

// Submit RSVP
export const submitRSVP = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { eventId } = req.params;
    const {
      guestName,
      guestEmail,
      status,
      plusOnes,
      dietaryRestrictions,
      message,
    } = req.body;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: "Event not found." });
      return;
    }

    // Check capacity if accepting
    if (status === "accepted" && event.maxAttendees) {
      const currentAttendees = await RSVP.find({ eventId, status: "accepted" });
      const totalAttending = currentAttendees.reduce(
        (sum, r) => sum + 1 + r.plusOnes,
        0
      );
      const newTotal = totalAttending + 1 + (plusOnes || 0);

      if (newTotal > event.maxAttendees) {
        res.status(400).json({
          success: false,
          message: "Event has reached maximum capacity.",
        });
        return;
      }
    }

    // Check if already RSVP'd
    let rsvp = await RSVP.findOne({ eventId, guestEmail });

    if (rsvp) {
      // Update existing RSVP
      rsvp.guestName = guestName;
      rsvp.status = status;
      rsvp.plusOnes = plusOnes || 0;
      rsvp.dietaryRestrictions = dietaryRestrictions;
      rsvp.message = message;
      rsvp.respondedAt = new Date();
      await rsvp.save();
    } else {
      // Create new RSVP
      rsvp = await RSVP.create({
        eventId,
        guestName,
        guestEmail,
        status,
        plusOnes: plusOnes || 0,
        dietaryRestrictions,
        message,
        respondedAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: "RSVP submitted successfully.",
      data: rsvp,
    });
  } catch (error: any) {
    console.error("Submit RSVP error:", error);
    if (error.code === 11000) {
      res
        .status(400)
        .json({
          success: false,
          message: "You have already RSVP'd to this event.",
        });
      return;
    }
    res.status(500).json({ success: false, message: "Failed to submit RSVP." });
  }
};

// Update RSVP
export const updateRSVP = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { guestEmail, status, plusOnes, dietaryRestrictions, message } =
      req.body;

    const rsvp = await RSVP.findOne({ eventId, guestEmail });

    if (!rsvp) {
      res.status(404).json({ success: false, message: "RSVP not found." });
      return;
    }

    // Check capacity if changing to accepted
    if (status === "accepted" && rsvp.status !== "accepted") {
      const event = await Event.findById(eventId);
      if (event?.maxAttendees) {
        const currentAttendees = await RSVP.find({
          eventId,
          status: "accepted",
        });
        const totalAttending = currentAttendees.reduce(
          (sum, r) => sum + 1 + r.plusOnes,
          0
        );
        const newTotal = totalAttending + 1 + (plusOnes || 0);

        if (newTotal > event.maxAttendees) {
          res.status(400).json({
            success: false,
            message: "Event has reached maximum capacity.",
          });
          return;
        }
      }
    }

    rsvp.status = status;
    rsvp.plusOnes = plusOnes ?? rsvp.plusOnes;
    rsvp.dietaryRestrictions = dietaryRestrictions ?? rsvp.dietaryRestrictions;
    rsvp.message = message ?? rsvp.message;
    rsvp.respondedAt = new Date();
    await rsvp.save();

    res.json({
      success: true,
      message: "RSVP updated successfully.",
      data: rsvp,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update RSVP." });
  }
};

// Get Event RSVPs (Event owner only)
export const getEventRSVPs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;

    // Verify event ownership
    const event = await Event.findOne({ _id: eventId, userId: req.user!._id });
    if (!event) {
      res.status(404).json({ success: false, message: "Event not found." });
      return;
    }

    const query: any = { eventId };
    if (
      status &&
      ["pending", "accepted", "declined", "maybe"].includes(status as string)
    ) {
      query.status = status;
    }

    const rsvps = await RSVP.find(query).sort({ respondedAt: -1 });

    res.json({
      success: true,
      data: {
        rsvps,
        total: rsvps.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch RSVPs." });
  }
};

// Get RSVP Status (for a guest to check their own status)
export const getRSVPStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { eventId, email } = req.params;

    const rsvp = await RSVP.findOne({ eventId, guestEmail: email });

    if (!rsvp) {
      res.json({
        success: true,
        data: null,
        message: "No RSVP found for this email.",
      });
      return;
    }

    res.json({ success: true, data: rsvp });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch RSVP status." });
  }
};
