import mongoose, { Document, Schema } from "mongoose";

export interface IRsvpAttendee {
  name: string;
  email: string;
  response: "yes" | "no" | "maybe";
  plusOnes: number;
  message: string;
  respondedAt: Date;
}

export interface IRsvp extends Document {
  userId: mongoose.Types.ObjectId;
  occasion: "Birthday" | "Wedding" | "House Warming";
  message: string;
  images: {
    url: string;
    publicId: string;
    order: number;
  }[];
  font: string;
  color: string;
  publicUrl: string | null;
  views: number;
  createdAt: Date;
  venueName: string;
  venueAddress: string;
  occasionDate: Date;
  startTime: string;
  endTime: string;
  schedule: [
    {
      title: string;
      duration: string;
      description: string;
    },
  ];
  colorCode: String;
  heroTitle: String;
  heroParagraph: String;
  ScheduleTitle: String;
  accentColor: String;
  messageTitle: String;
  slug: String;
  status: "draft" | "live" | "archived" | "expired";
  attendees: IRsvpAttendee[];
}

const rsvpSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  occasion: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    default: "",
  },
  images: [
    {
      url: String,
      publicId: String,
    },
  ],
  font: {
    type: String,
  },
  color: {
    type: String,
  },
  publicUrl: {
    type: String,
  },
  views: {
    type: Number,
    default: 0,
  },
  venueName: {
    type: String,
  },
  venueAddress: {
    type: String,
  },
  occasionDate: {
    type: Date,
  },
  startTime: {
    type: String,
  },
  endTime: {
    type: String,
  },
  schedule: [
    {
      title: String,
      duration: String,
      description: String,
    },
  ],
  colorCode: {
    type: String,
  },
  heroTitle: {
    type: String,
  },
  heroParagraph: {
    type: String,
  },
  ScheduleTitle: {
    type: String,
  },
  accentColor: {
    type: String,
  },
  messageTitle: {
    type: String,
  },
  slug: {
    type: String,
  },
  status: {
    type: String,
    enum: ["draft", "live", "archived", "expired"],
    default: "draft",
  },
  attendees: [
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      response: { type: String, enum: ["yes", "no", "maybe"], required: true },
      plusOnes: { type: Number, default: 0, min: 0 },
      message: { type: String, default: "", trim: true },
      respondedAt: { type: Date, default: Date.now },
    },
  ],
});

export default mongoose.model<IRsvp>("Rsvp", rsvpSchema);
