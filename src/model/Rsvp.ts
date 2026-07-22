import mongoose, { Document, Schema } from "mongoose";

export type RsvpQuestionType = "short_text" | "multiple_choice" | "yes_no";

export interface IRsvpCustomQuestion {
  id: string;
  type: RsvpQuestionType;
  label: string;
  options: string[];
  required: boolean;
}

export interface IRsvpAnswer {
  questionId: string;
  question: string;
  value: string;
}

export interface IRsvpAttendee {
  name: string;
  email: string;
  response: "yes" | "no" | "maybe";
  plusOnes: number;
  message: string;
  answers: IRsvpAnswer[];
  respondedAt: Date;
}

export interface IRsvp extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  occasion: "Birthday" | "Wedding" | "House Warming";
  message: string;
  coverImage: {
    url: string;
    publicId: string;
  } | null;
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
  capacity: number | null;
  customQuestions: IRsvpCustomQuestion[];
  attendees: IRsvpAttendee[];
}

const rsvpSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    default: "",
    trim: true,
  },
  occasion: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    default: "",
  },
  coverImage: {
    type: new Schema(
      { url: String, publicId: String },
      { _id: false },
    ),
    default: null,
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
  capacity: {
    type: Number,
    default: null,
    min: 1,
  },
  customQuestions: [
    {
      id: { type: String, required: true },
      type: {
        type: String,
        enum: ["short_text", "multiple_choice", "yes_no"],
        required: true,
      },
      label: { type: String, required: true, trim: true },
      options: [{ type: String, trim: true }],
      required: { type: Boolean, default: false },
      _id: false,
    },
  ],
  attendees: [
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      response: { type: String, enum: ["yes", "no", "maybe"], required: true },
      plusOnes: { type: Number, default: 0, min: 0 },
      message: { type: String, default: "", trim: true },
      answers: [
        {
          questionId: { type: String, required: true },
          question: { type: String, required: true },
          value: { type: String, default: "" },
          _id: false,
        },
      ],
      respondedAt: { type: Date, default: Date.now },
    },
  ],
});

export default mongoose.model<IRsvp>("Rsvp", rsvpSchema);
