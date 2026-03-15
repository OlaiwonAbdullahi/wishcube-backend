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
const websiteSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
        type: mongoose_1.default.Schema.Types.ObjectId,
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
}, { timestamps: true });
exports.default = mongoose_1.default.model("Website", websiteSchema);
