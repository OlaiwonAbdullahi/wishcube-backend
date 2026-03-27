import mongoose, { Document, Schema } from "mongoose";
import { getCurrentYearRoman } from "../utils/romanNumerals";

export interface ICard extends Document {
  userId: mongoose.Types.ObjectId;

  // ── Sender / Recipient ─────────────────────────────────────────────────────
  senderName: string;
  recipientName: string;
  recipientPhotoUrl: string | null; // NEW — photo shown on card
  recipientPhotoPublicId: string | null; // NEW — cloudinary public id

  // ── Occasion & Context ─────────────────────────────────────────────────────
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

  // ── Editorial / Volume Label ───────────────────────────────────────────────
  volumeNumber: number; // NEW — renders as Roman numeral e.g. III
  cardYear: string; // NEW — e.g. "MMXXIV", defaults to current year in Roman

  // ── Card Text Content ──────────────────────────────────────────────────────
  cardSubtitle: string; // NEW — small label above headline e.g. "A special message for"
  message: string;
  closingLine: string; // NEW — replaces hardcoded "Always" e.g. "With love", "Cheers"
  brandingText: string; // NEW — footer right label e.g. "Designed with Wishcube"

  // ── AI Settings ───────────────────────────────────────────────────────────
  isAiGenerated: boolean;
  aiTone: "Heartfelt" | "Funny" | "Poetic" | "Professional" | "Playful";

  // ── Visual / Background ───────────────────────────────────────────────────
  theme: string;
  orientation: "portrait" | "landscape" | "square";
  backgroundImageUrl: string | null;
  backgroundImagePublicId: string | null;
  backgroundColor: string; // NEW — card base background color

  // ── Global Typography ─────────────────────────────────────────────────────
  font: string;
  accentColor: string; // NEW — gold color used on name, labels, dividers

  // ── Message Text Styling ──────────────────────────────────────────────────
  textColor: string; // existing — applies to body text
  textSize: "small" | "medium" | "large";
  textBold: boolean; // NEW — bold toggle for message body
  textItalic: boolean; // NEW — italic toggle for message body
  textAlign: "left" | "center" | "right"; // NEW — message text alignment

  // ── Headline Styling ──────────────────────────────────────────────────────
  headlineColor: string; // NEW — color for "Happy Birthday," line
  headlineSizeOverride: "small" | "medium" | "large" | null; // NEW — override clamp default
  headlineBold: boolean; // NEW — bold toggle for headline
  recipientNameColor: string; // NEW — defaults to accentColor but overridable
  recipientNameItalic: boolean; // NEW — italic toggle for recipient name

  // ── Status & Meta ─────────────────────────────────────────────────────────
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

    // Sender / Recipient
    senderName: { type: String, required: true, trim: true },
    recipientName: { type: String, required: true, trim: true },
    recipientPhotoUrl: { type: String, default: null },
    recipientPhotoPublicId: { type: String, default: null },

    // Occasion & Context
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

    // Editorial Label
    volumeNumber: { type: Number, default: 1 },
    cardYear: { type: String, default: "" }, // empty = auto Roman numeral of current year

    // Card Text Content
    cardSubtitle: { type: String, default: "", trim: true },
    message: { type: String, default: "" },
    closingLine: { type: String, default: "Always", trim: true },
    brandingText: {
      type: String,
      default: "Designed with Wishcube",
      trim: true,
    },

    // AI Settings
    isAiGenerated: { type: Boolean, default: false },
    aiTone: {
      type: String,
      enum: ["Heartfelt", "Funny", "Poetic", "Professional", "Playful"],
      default: "Heartfelt",
    },

    // Visual / Background
    theme: { type: String, default: "classic" },
    orientation: {
      type: String,
      enum: ["portrait", "landscape", "square"],
      default: "portrait",
    },
    backgroundImageUrl: { type: String, default: null },
    backgroundImagePublicId: { type: String, default: null },
    backgroundColor: { type: String, default: "#1c1c1c" },

    // Global Typography
    font: { type: String, default: "Georgia" },
    accentColor: { type: String, default: "#C9A84C" },

    // Message Text Styling
    textColor: { type: String, default: "#FFFFFF" },
    textSize: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "medium",
    },
    textBold: { type: Boolean, default: false },
    textItalic: { type: Boolean, default: false },
    textAlign: {
      type: String,
      enum: ["left", "center", "right"],
      default: "left",
    },

    // Headline Styling
    headlineColor: { type: String, default: "#FFFFFF" },
    headlineSizeOverride: {
      type: String,
      enum: ["small", "medium", "large", null],
      default: null,
    },
    headlineBold: { type: Boolean, default: false },
    recipientNameColor: { type: String, default: "" }, // empty = falls back to accentColor
    recipientNameItalic: { type: Boolean, default: true },

    // Status & Meta
    status: { type: String, enum: ["draft", "completed"], default: "draft" },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Pre-save hook to handle defaults for NEW fields
cardSchema.pre<ICard>("save", async function () {
  // 1. If cardYear is empty, default to current year in Roman numerals
  if (!this.cardYear) {
    this.cardYear = getCurrentYearRoman();
  }

  // 2. If recipientNameColor is empty, it falls back to accentColor
  if (!this.recipientNameColor) {
    this.recipientNameColor = this.accentColor;
  }
});

export default mongoose.model<ICard>("Card", cardSchema);
