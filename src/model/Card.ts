import mongoose, { Document, Schema } from "mongoose";

export interface ICard extends Document {
  userId: mongoose.Types.ObjectId;
  senderName: string;
  recipientName: string;
  relationship:
    | "Friend"
    | "Partner"
    | "Parent"
    | "Sibling"
    | "Child"
    | "Colleague"
    | "Mentor"
    | "Other";
  occasion:
    | "Birthday"
    | "Anniversary"
    | "Wedding"
    | "Graduation"
    | "Thank You"
    | "Congratulations"
    | "Holiday"
    | "Just Because";
  language: "English" | "Yoruba" | "Igbo" | "Hausa" | "Pidgin" | "French";
  message: string;
  isAiGenerated: boolean;
  aiTone: "Heartfelt" | "Funny" | "Poetic" | "Professional" | "Playful";
  theme: string;
  orientation: "portrait" | "landscape" | "square";
  backgroundImageUrl: string | null;
  backgroundImagePublicId: string | null;
  font: "serif" | "sans-serif" | "handwritten" | "script" | "monospace";
  textColor: string;
  textSize: "small" | "medium" | "large";
  status: "draft" | "completed";
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const cardSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: { type: String, required: true, trim: true },
    recipientName: { type: String, required: true, trim: true },
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
    occasion: {
      type: String,
      enum: [
        "Birthday",
        "Anniversary",
        "Wedding",
        "Graduation",
        "Thank You",
        "Congratulations",
        "Holiday",
        "Just Because",
      ],
      required: true,
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
    theme: { type: String, default: "classic" },
    orientation: {
      type: String,
      enum: ["portrait", "landscape", "square"],
      default: "portrait",
    },
    backgroundImageUrl: { type: String, default: null },
    backgroundImagePublicId: { type: String, default: null },
    font: {
      type: String,
      enum: ["serif", "sans-serif", "handwritten", "script", "monospace"],
      default: "serif",
    },
    textColor: { type: String, default: "#000000" },
    textSize: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["draft", "completed"],
      default: "draft",
    },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ICard>("Card", cardSchema);
