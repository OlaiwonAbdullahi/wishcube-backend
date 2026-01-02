import mongoose, {
  Schema,
  Model,
  CallbackWithoutResultAndOptionalError,
} from "mongoose";
import { IEvent, ILocation, IInvitation } from "../types";
import { generateShareableLink } from "../utils/helpers";

const locationSchema = new Schema<ILocation>(
  {
    type: {
      type: String,
      enum: ["physical", "virtual"],
      required: true,
    },
    address: String,
    link: String,
  },
  { _id: false }
);

const invitationSchema = new Schema<IInvitation>(
  {
    email: {
      type: String,
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["sent", "opened", "bounced"],
      default: "sent",
    },
  },
  { _id: false }
);

const eventSchema = new Schema<IEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    eventType: {
      type: String,
      required: [true, "Event type is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
    },
    time: {
      type: String,
      required: [true, "Event time is required"],
    },
    location: {
      type: locationSchema,
      required: true,
    },
    coverImage: String,
    isPublic: {
      type: Boolean,
      default: true,
    },
    maxAttendees: {
      type: Number,
      min: 1,
    },
    invitations: {
      type: [invitationSchema],
      default: [],
    },
    shareableLink: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate shareable link before saving
eventSchema.pre("save", function (next: CallbackWithoutResultAndOptionalError) {
  if (!this.shareableLink) {
    this.shareableLink = generateShareableLink();
  }
  next();
});

// Index for shareable link
eventSchema.index({ shareableLink: 1 });

const Event: Model<IEvent> = mongoose.model<IEvent>("Event", eventSchema);

export default Event;
