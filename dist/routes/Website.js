"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const slugify_1 = __importDefault(require("slugify"));
const uuid_1 = require("uuid");
const Website_1 = __importDefault(require("../model/Website"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const cloudinary_1 = require("../config/cloudinary");
const errorHandler_1 = require("../utils/errorHandler");
const router = express_1.default.Router();
// Helper: Generate unique slug
const generateSlug = async (recipientName, occasion, custom = null) => {
    const base = custom
        ? (0, slugify_1.default)(custom, { lower: true, strict: true })
        : (0, slugify_1.default)(`${recipientName}-${occasion}-${(0, uuid_1.v4)().slice(0, 6)}`, {
            lower: true,
            strict: true,
        });
    const exists = await Website_1.default.findOne({ slug: base });
    return exists ? `${base}-${(0, uuid_1.v4)().slice(0, 4)}` : base;
};
// @desc    Get all websites for a user
// @route   GET /api/websites
// @access  Private
router.get("/", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status } = req.query;
    const query = { userId: req.user?._id };
    if (status)
        query.status = status;
    const websites = await Website_1.default.find(query)
        .sort("-createdAt")
        .populate("giftId");
    res.status(200).json({
        success: true,
        message: "Websites retrieved successfully",
        data: {
            total: websites.length,
            websites,
        },
    });
}));
// @desc    Create a new website
// @route   POST /api/websites
// @access  Private
router.post("/", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const website = await Website_1.default.create({
        ...req.body,
        userId: req.user?._id,
    });
    res.status(201).json({
        success: true,
        message: "Website created successfully",
        data: { website },
    });
}));
// @desc    Get single website
// @route   GET /api/websites/:id
// @access  Private
router.get("/:id", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const website = await Website_1.default.findOne({
        _id: req.params.id,
        userId: req.user?._id,
    }).populate("giftId");
    if (!website) {
        throw new errorHandler_1.AppError("Website not found", 404);
    }
    res.status(200).json({
        success: true,
        message: "Website retrieved successfully",
        data: { website },
    });
}));
// @desc    Update website
// @route   PUT /api/websites/:id
// @access  Private
router.put("/:id", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const website = await Website_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.user?._id }, req.body, { new: true, runValidators: true });
    if (!website) {
        throw new errorHandler_1.AppError("Website not found", 404);
    }
    res.status(200).json({
        success: true,
        message: "Website updated successfully",
        data: { website },
    });
}));
// @desc    Delete website
// @route   DELETE /api/websites/:id
// @access  Private
router.delete("/:id", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const website = await Website_1.default.findOne({
        _id: req.params.id,
        userId: req.user?._id,
    });
    if (!website) {
        throw new errorHandler_1.AppError("Website not found", 404);
    }
    // Cleanup media
    for (const img of website.images) {
        if (img.publicId)
            await (0, cloudinary_1.deleteFile)(img.publicId).catch(console.error);
    }
    if (website.videoPublicId)
        await (0, cloudinary_1.deleteFile)(website.videoPublicId).catch(console.error);
    if (website.voiceMessagePublicId)
        await (0, cloudinary_1.deleteFile)(website.voiceMessagePublicId).catch(console.error);
    await website.deleteOne();
    res.status(200).json({
        success: true,
        message: "Website deleted successfully",
        data: null,
    });
}));
// @desc    Publish website
// @route   POST /api/websites/:id/publish
// @access  Private
router.post("/:id/publish", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const website = await Website_1.default.findOne({
        _id: req.params.id,
        userId: req.user?._id,
    });
    if (!website) {
        throw new errorHandler_1.AppError("Website not found", 404);
    }
    const slug = await generateSlug(website.recipientName, website.occasion, req.body.customSlug);
    const publicUrl = `${process.env.CLIENT_URL}/w/${slug}`;
    const expiresAt = req.body.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    website.slug = slug;
    website.publicUrl = publicUrl;
    website.status = "live";
    website.expiresAt = expiresAt;
    if (req.body.customSlug)
        website.customSlug = req.body.customSlug;
    await website.save();
    res.status(200).json({
        success: true,
        message: "Website published successfully",
        data: {
            website,
            shareUrl: publicUrl,
        },
    });
}));
// @desc    Get live website (public)
// @route   GET /api/websites/live/:slug
// @access  Public
router.get("/live/:slug", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const website = await Website_1.default.findOne({
        slug: req.params.slug,
        status: "live",
    }).populate({
        path: "giftId",
        select: "-recipientBankDetails -payoutReference -redeemToken",
    });
    if (!website) {
        throw new errorHandler_1.AppError("Page not found or has expired", 404);
    }
    if (website.expiresAt && new Date() > website.expiresAt) {
        website.status = "expired";
        await website.save();
        throw new errorHandler_1.AppError("This page has expired", 410);
    }
    res.status(200).json({
        success: true,
        message: "Live website retrieved successfully",
        data: { website },
    });
}));
// @desc    Submit a reply to a website
// @route   POST /api/websites/live/:slug/reply
// @access  Public
router.post("/live/:slug/reply", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { message } = req.body;
    if (!message) {
        throw new errorHandler_1.AppError("Message is required", 400);
    }
    const website = await Website_1.default.findOne({
        slug: req.params.slug,
        status: "live",
    });
    if (!website) {
        throw new errorHandler_1.AppError("Website not found", 404);
    }
    website.recipientReply = {
        message,
        repliedAt: new Date(),
    };
    await website.save();
    res.status(200).json({
        success: true,
        message: "Reply submitted successfully",
        data: {
            recipientReply: website.recipientReply,
        },
    });
}));
// @desc    Submit a reaction to a website
// @route   POST /api/websites/live/:slug/react
// @access  Public
router.post("/live/:slug/react", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { emoji } = req.body;
    if (!emoji) {
        throw new errorHandler_1.AppError("Emoji is required", 400);
    }
    const website = await Website_1.default.findOne({
        slug: req.params.slug,
        status: "live",
    });
    if (!website) {
        throw new errorHandler_1.AppError("Website not found", 404);
    }
    website.reaction = {
        emoji,
        reactedAt: new Date(),
    };
    await website.save();
    res.status(200).json({
        success: true,
        message: "Reaction submitted successfully",
        data: {
            reaction: website.reaction,
        },
    });
}));
exports.default = router;
