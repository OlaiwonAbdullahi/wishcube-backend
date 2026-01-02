import mongoose, { Schema, Model } from "mongoose";
import { IRSVP } from "../types";

const rsvpSchema = new Schema<IRSVP>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    guestEmail: {
      type: String,
      required: [true, "Guest email is required"],
      lowercase: true,
      trim: true,
    },
    guestName: {
      type: String,
      required: [true, "Guest name is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "maybe"],
      default: "pending",
    },
    plusOnes: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    dietaryRestrictions: String,
    message: String,
    respondedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Ensure unique RSVP per email per event
rsvpSchema.index({ eventId: 1, guestEmail: 1 }, { unique: true });

const RSVP: Model<IRSVP> = mongoose.model<IRSVP>("RSVP", rsvpSchema);

export default RSVP;
