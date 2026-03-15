"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Card_1 = __importDefault(require("../model/Card"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const cloudinary_1 = require("../config/cloudinary");
const aiMessage_1 = require("../utils/aiMessage");
const errorHandler_1 = require("../utils/errorHandler");
const router = express_1.default.Router();
// @desc    Get all cards for a user
// @route   GET /api/cards
// @access  Private
router.get("/", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status } = req.query;
    const query = { userId: req.user?._id };
    if (status)
        query.status = status;
    const cards = await Card_1.default.find(query).sort("-createdAt");
    res.status(200).json({
        success: true,
        total: cards.length,
        cards,
    });
}));
// @desc    Create a new card
// @route   POST /api/cards
// @access  Private
router.post("/", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const card = await Card_1.default.create({ ...req.body, userId: req.user?._id });
    res.status(201).json({
        success: true,
        card,
    });
}));
// @desc    Get single card by ID
// @route   GET /api/cards/:id
// @access  Private
router.get("/:id", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const card = await Card_1.default.findOne({
        _id: req.params.id,
        userId: req.user?._id,
    });
    if (!card) {
        throw new errorHandler_1.AppError("Card not found", 404);
    }
    res.status(200).json({
        success: true,
        card,
    });
}));
// @desc    Update a card
// @route   PUT /api/cards/:id
// @access  Private
router.put("/:id", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const card = await Card_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.user?._id }, req.body, { new: true, runValidators: true });
    if (!card) {
        throw new errorHandler_1.AppError("Card not found", 404);
    }
    res.status(200).json({
        success: true,
        card,
    });
}));
// @desc    Delete a card
// @route   DELETE /api/cards/:id
// @access  Private
router.delete("/:id", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const card = await Card_1.default.findOne({
        _id: req.params.id,
        userId: req.user?._id,
    });
    if (!card) {
        throw new errorHandler_1.AppError("Card not found", 404);
    }
    if (card.backgroundImagePublicId) {
        await (0, cloudinary_1.deleteFile)(card.backgroundImagePublicId).catch(console.error);
    }
    await card.deleteOne();
    res.status(200).json({
        success: true,
        message: "Card deleted",
    });
}));
// @desc    Upload background image for a card
// @route   POST /api/cards/:id/background
// @access  Private
router.post("/:id/background", authMiddleware_1.protect, cloudinary_1.uploadImage.single("image"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw new errorHandler_1.AppError("No image uploaded", 400);
    }
    const card = await Card_1.default.findOne({
        _id: req.params.id,
        userId: req.user?._id,
    });
    if (!card) {
        throw new errorHandler_1.AppError("Card not found", 404);
    }
    // Delete old background if exists
    if (card.backgroundImagePublicId) {
        await (0, cloudinary_1.deleteFile)(card.backgroundImagePublicId).catch(console.error);
    }
    // Upload to Cloudinary
    const result = await (0, cloudinary_1.uploadToCloudinary)(req.file.buffer, "cards");
    card.backgroundImageUrl = result.secure_url;
    card.backgroundImagePublicId = result.public_id;
    await card.save();
    res.status(200).json({
        success: true,
        backgroundImageUrl: card.backgroundImageUrl,
        card,
    });
}));
// @desc    Remove background image from a card
// @route   DELETE /api/cards/:id/background
// @access  Private
router.delete("/:id/background", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const card = await Card_1.default.findOne({
        _id: req.params.id,
        userId: req.user?._id,
    });
    if (!card) {
        throw new errorHandler_1.AppError("Card not found", 404);
    }
    if (card.backgroundImagePublicId) {
        await (0, cloudinary_1.deleteFile)(card.backgroundImagePublicId).catch(console.error);
    }
    card.backgroundImageUrl = null;
    card.backgroundImagePublicId = null;
    await card.save();
    res.status(200).json({
        success: true,
        message: "Background removed",
        card,
    });
}));
// @desc    Generate AI messages for a card
// @route   POST /api/cards/ai/generate
// @access  Private
router.post("/ai/generate", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { recipientName, senderName, occasion, relationship, language, tone, } = req.body;
    if (!recipientName || !occasion) {
        throw new errorHandler_1.AppError("recipientName and occasion are required", 400);
    }
    const [suggestion1, suggestion2, suggestion3] = await Promise.all([
        (0, aiMessage_1.generateCardMessage)({
            recipientName,
            senderName,
            occasion,
            relationship,
            language,
            tone,
            variant: 1,
        }),
        (0, aiMessage_1.generateCardMessage)({
            recipientName,
            senderName,
            occasion,
            relationship,
            language,
            tone,
            variant: 2,
        }),
        (0, aiMessage_1.generateCardMessage)({
            recipientName,
            senderName,
            occasion,
            relationship,
            language,
            tone,
            variant: 3,
        }),
    ]);
    res.status(200).json({
        success: true,
        suggestions: [suggestion1, suggestion2, suggestion3],
    });
}));
// @desc    Mark card as completed
// @route   POST /api/cards/:id/complete
// @access  Private
router.post("/:id/complete", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const card = await Card_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.user?._id }, { status: "completed", $inc: { downloadCount: 1 } }, { new: true });
    if (!card) {
        throw new errorHandler_1.AppError("Card not found", 404);
    }
    res.status(200).json({
        success: true,
        card,
    });
}));
// @desc    Track card download
// @route   POST /api/cards/:id/track-download
// @access  Private
router.post("/:id/track-download", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const card = await Card_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.user?._id }, { $inc: { downloadCount: 1 } }, { new: true });
    if (!card) {
        throw new errorHandler_1.AppError("Card not found", 404);
    }
    res.status(200).json({
        success: true,
        downloadCount: card.downloadCount,
    });
}));
exports.default = router;
