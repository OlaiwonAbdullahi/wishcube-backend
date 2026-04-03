"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const Rsvp_1 = __importDefault(require("../model/Rsvp"));
const errorHandler_1 = require("../utils/errorHandler");
const slugify_1 = __importDefault(require("slugify"));
const uuid_1 = require("uuid");
const router = express_1.default.Router();
const generateSlug = async (occasion) => {
    const base = (0, slugify_1.default)(`${occasion}-${(0, uuid_1.v4)().slice(0, 6)}`, {
        lower: true,
        strict: true,
    });
    const exists = await Rsvp_1.default.findOne({ slug: base });
    return exists ? `${base}-${(0, uuid_1.v4)().slice(0, 4)}` : base;
};
router.get("/", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status } = req.query;
    const query = { userId: req.user?._id };
    if (status)
        query.status = status;
    const rsvps = await Rsvp_1.default.find(query).sort("-createdAt");
    res.status(200).json({
        success: true,
        message: "RSVPs retrieved successfully",
        data: {
            total: rsvps.length,
            rsvps,
        },
    });
}));
router.post("/", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const rsvp = await Rsvp_1.default.create({
        ...req.body,
        userId: req.user?._id,
    });
    res.status(201).json({
        success: true,
        message: "Rsvps retrieved sucessfully",
        data: {
            rsvp,
        },
    });
}));
router.post("/:id/publish", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const rsvp = await Rsvp_1.default.findOne({
        _id: req.params.id,
        userId: req.user?._id,
    });
    if (!rsvp) {
        throw new errorHandler_1.AppError("Rsvp Page not Found", 404);
    }
    const slug = await generateSlug(rsvp.occasion);
    const publicUrl = `${process.env.CLIENT_URL || "https://app.usewishcube.com"}/r/${slug}`;
    rsvp.slug = slug;
    rsvp.publicUrl = publicUrl;
    rsvp.status = "live";
    await rsvp.save();
    res.status(200).json({
        success: true,
        message: "RSVP published successfully",
        data: {
            rsvp,
            shareUrl: publicUrl,
        },
    });
}));
router.get("/live/:slug", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const rsvp = await Rsvp_1.default.findOne({
        slug: req.params.slug,
        status: "live",
    });
    if (!rsvp) {
        throw new errorHandler_1.AppError("RSVP page not found or has expired", 404);
    }
    if (rsvp.occasionDate && new Date() > rsvp.occasionDate) {
        rsvp.status = "expired";
        await rsvp.save();
        throw new errorHandler_1.AppError("This RSVP page has expired", 410);
    }
    rsvp.views = (rsvp.views || 0) + 1;
    await rsvp.save();
    res.status(200).json({
        success: true,
        message: "RSVP retrieved successfully",
        data: {
            rsvp,
        },
    });
}));
router.put("/:id", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const rsvp = await Rsvp_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.user?._id }, req.body, { new: true, runValidators: true });
    if (!rsvp) {
        throw new errorHandler_1.AppError("RSVP not found", 404);
    }
    res.status(200).json({
        success: true,
        message: "RSVP updated successfully",
        data: {
            rsvp,
        },
    });
}));
router.delete("/:id", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const rsvp = await Rsvp_1.default.findOneAndDelete({
        _id: req.params.id,
        userId: req.user?._id,
    });
    if (!rsvp) {
        throw new errorHandler_1.AppError("RSVP not found", 404);
    }
    res.status(200).json({
        success: true,
        message: "RSVP deleted successfully",
        data: null,
    });
}));
exports.default = router;
