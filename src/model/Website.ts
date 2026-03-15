import mongoose, { Document, Schema } from "mongoose";

export interface IWebsite extends Document {
  userId: mongoose.Types.ObjectId;
  recipientName: string;
  occasion:
    | "Birthday"
    | "Anniversary"
    | "Congratulations"
    | "Appreciation"
    | "Wedding"
    | "Get Well"
    | "Professional Greeting"
    | "Holiday"
    | "Other";
  relationship:
    | "Friend"
    | "Partner"
    | "Parent"
    | "Sibling"
    | "Child"
    | "Colleague"
    | "Mentor"
    | "Other";
  language: "English" | "Yoruba" | "Igbo" | "Hausa" | "Pidgin" | "French";
  message: string;
  isAiGenerated: boolean;
  aiTone: "Heartfelt" | "Funny" | "Poetic" | "Professional" | "Playful";
  images: {
    url: string;
    publicId: string;
    order: number;
  }[];
  videoUrl: string | null;
  videoPublicId: string | null;
  voiceMessageUrl: string | null;
  voiceMessagePublicId: string | null;
  musicTrack: string | null;
  musicUrl: string | null;
  theme: string;
  font: string;
  primaryColor: string;
  countdownDate: Date | null;
  isPasswordProtected: boolean;
  password?: string | null;
  customSlug: string | null;
  expiresAt: Date | null;
  giftId: mongoose.Types.ObjectId | null;
  status: "draft" | "live" | "archived" | "expired";
  slug: string | null;
  publicUrl: string | null;
  views: number;
  viewedAt: Date | null;
  reaction: {
    emoji: string | null;
    reactedAt: Date | null;
  };
  recipientReply: {
    message: string | null;
    repliedAt: Date | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const websiteSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientName: { type: String, required: true, trim: true },
    occasion: {
      type: String,
      enum: [
        "Birthday",
        "Anniversary",
        "Congratulations",
        "Appreciation",
        "Wedding",
        "Get Well",
        "Professional Greeting",
        "Holiday",
        "Other",
      ],
      required: true,
    },
    relationship: {
      type: String,
      enum: [
        "Friend",
        "Partner",
        "Parent",
        "Sibling",
        "Child",
        "Colleague",
        "Mentor",
        "Other",
      ],
      default: "Friend",
    },
    language: {
      type: String,
      enum: ["English", "Yoruba", "Igbo", "Hausa", "Pidgin", "French"],
      default: "English",
    },
    message: { type: String, default: "" },
    isAiGenerated: { type: Boolean, default: false },
    aiTone: {
      type: String,
      enum: ["Heartfelt", "Funny", "Poetic", "Professional", "Playful"],
      default: "Heartfelt",
    },
    images: [
      {
        url: String,
        publicId: String,
        order: { type: Number, default: 0 },
      },
    ],
    videoUrl: { type: String, default: null },
    videoPublicId: { type: String, default: null },
    voiceMessageUrl: { type: String, default: null },
    voiceMessagePublicId: { type: String, default: null },
    musicTrack: { type: String, default: null },
    musicUrl: { type: String, default: null },
    theme: { type: String, default: "classic" },
    font: { type: String, default: "Inter" },
    primaryColor: { type: String, default: "#6C63FF" },
    countdownDate: { type: Date, default: null },
    isPasswordProtected: { type: Boolean, default: false },
    password: { type: String, default: null },
    customSlug: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    giftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gift",
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "live", "archived", "expired"],
      default: "draft",
    },
    slug: { type: String, unique: true, sparse: true },
    publicUrl: { type: String, default: null },
    views: { type: Number, default: 0 },
    viewedAt: { type: Date, default: null },
    reaction: {
      emoji: { type: String, default: null },
      reactedAt: { type: Date, default: null },
    },
    recipientReply: {
      message: { type: String, default: null },
      repliedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IWebsite>("Website", websiteSchema);
