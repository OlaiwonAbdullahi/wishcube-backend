"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const romanNumerals_1 = require("../utils/romanNumerals");
const cardSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
}, { timestamps: true });
cardSchema.pre("save", async function () {
    if (!this.cardYear) {
        this.cardYear = (0, romanNumerals_1.getCurrentYearRoman)();
    }
    if (!this.recipientNameColor) {
        this.recipientNameColor = this.accentColor;
    }
});
exports.default = mongoose_1.default.model("Card", cardSchema);
