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
const email_1 = require("../utils/email");
const emailTemplates_1 = require("../utils/emailTemplates");
const errorHandler_1 = require("../utils/errorHandler");
const Gift_1 = __importDefault(require("../model/Gift"));
const Order_1 = __importDefault(require("../model/Order"));
const router = express_1.default.Router();
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
router.get("/", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status } = req.query;
    const query = { userId: req.user?._id };
    if (status)
        query.status = status;
    const websites = await Website_1.default.find(query)
        .sort("-createdAt")
        .populate("giftIds");
    res.status(200).json({
        success: true,
        message: "Websites retrieved successfully",
        data: {
            total: websites.length,
            websites,
        },
    });
}));
router.post("/", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const user = req.user;
    if (user.subscriptionTier === "free") {
        const activeCount = await Website_1.default.countDocuments({
            userId: user._id,
            status: "live",
        });
        if (activeCount >= 1) {
            return next(new errorHandler_1.AppError("Free users are limited to 1 live website. Please upgrade to Pro to create more.", 403));
        }
        if (req.body.isPasswordProtected) {
            return next(new errorHandler_1.AppError("Password protection is a Pro feature.", 403));
        }
        if (req.body.customSlug) {
            return next(new errorHandler_1.AppError("Custom slugs are a Pro feature.", 403));
        }
    }
    const website = await Website_1.default.create({
        ...req.body,
        userId: req.user?._id,
    });
    if (req.body.giftIds && Array.isArray(req.body.giftIds)) {
        await Gift_1.default.updateMany({ _id: { $in: req.body.giftIds }, senderId: req.user?._id }, { websiteId: website._id });
    }
    res.status(201).json({
        success: true,
        message: "Website created successfully",
        data: { website },
    });
}));
router.get("/:id", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const website = await Website_1.default.findOne({
        _id: req.params.id,
        userId: req.user?._id,
    }).populate("giftIds");
    if (!website) {
        throw new errorHandler_1.AppError("Website not found", 404);
    }
    res.status(200).json({
        success: true,
        message: "Website retrieved successfully",
        data: { website },
    });
}));
router.put("/:id", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const user = req.user;
    if (user.subscriptionTier === "free") {
        if (req.body.isPasswordProtected) {
            return next(new errorHandler_1.AppError("Password protection is a Pro feature.", 403));
        }
        if (req.body.customSlug) {
            return next(new errorHandler_1.AppError("Custom slugs are a Pro feature.", 403));
        }
    }
    const website = await Website_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.user?._id }, req.body, { new: true, runValidators: true });
    if (!website) {
        throw new errorHandler_1.AppError("Website not found", 404);
    }
    await Gift_1.default.updateMany({ websiteId: website._id, _id: { $nin: req.body.giftIds || [] } }, { websiteId: null });
    if (req.body.giftIds && Array.isArray(req.body.giftIds)) {
        await Gift_1.default.updateMany({ _id: { $in: req.body.giftIds }, senderId: req.user?._id }, { websiteId: website._id });
    }
    res.status(200).json({
        success: true,
        message: "Website updated successfully",
        data: { website },
    });
}));
router.delete("/:id", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const website = await Website_1.default.findOne({
        _id: req.params.id,
        userId: req.user?._id,
    });
    if (!website) {
        throw new errorHandler_1.AppError("Website not found", 404);
    }
    for (const img of website.images) {
        if (img.publicId)
            await (0, cloudinary_1.deleteFile)(img.publicId).catch(console.error);
    }
    if (website.videoPublicId)
        await (0, cloudinary_1.deleteFile)(website.videoPublicId).catch(console.error);
    if (website.voiceMessagePublicId)
        await (0, cloudinary_1.deleteFile)(website.voiceMessagePublicId).catch(console.error);
    await Gift_1.default.updateMany({ websiteId: website._id }, { websiteId: null });
    await website.deleteOne();
    res.status(200).json({
        success: true,
        message: "Website deleted successfully",
        data: null,
    });
}));
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
    if (req.body.recipientEmail !== undefined)
        website.recipientEmail = req.body.recipientEmail;
    await website.save();
    if (website.recipientEmail) {
        const senderName = req.user?.name || "Someone";
        const occasionText = website.occasion ? ` for ${website.occasion}` : "";
        (0, email_1.sendEmail)({
            to: website.recipientEmail,
            subject: `${senderName} has sent you a WishCube! 🎁`,
            html: (0, emailTemplates_1.websitePublishedTemplate)(website.recipientName, senderName, occasionText, publicUrl),
        }).catch((err) => console.error("Website publish notification email error:", err));
    }
    res.status(200).json({
        success: true,
        message: "Website published successfully",
        data: {
            website,
            shareUrl: publicUrl,
        },
    });
}));
router.get("/live/:slug", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const website = await Website_1.default.findOne({
        slug: req.params.slug,
        status: "live",
    }).populate({
        path: "giftIds",
        select: "type amount amountPaid currency productSnapshot giftMessage status escrowStatus redeemToken expiresAt deliveryAddress",
    });
    if (!website) {
        throw new errorHandler_1.AppError("Page not found or has expired", 404);
    }
    if (website.expiresAt && new Date() > website.expiresAt) {
        website.status = "expired";
        await website.save();
        throw new errorHandler_1.AppError("This page has expired", 410);
    }
    // Attach order info for physical gifts
    const giftsWithOrders = await Promise.all(website.giftIds.map(async (gift) => {
        const giftObj = gift.toObject();
        if (gift.type === "physical" && gift.status === "redeemed") {
            const order = await Order_1.default.findOne({ giftId: gift._id }).select("_id status");
            if (order) {
                giftObj.orderId = order._id;
                giftObj.orderStatus = order.status;
            }
        }
        return giftObj;
    }));
    const websiteData = website.toObject();
    websiteData.giftIds = giftsWithOrders;
    res.status(200).json({
        success: true,
        message: "Live website retrieved successfully",
        data: { website: websiteData },
    });
}));
router.post("/live/:slug/reply", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { message } = req.body;
    if (!message) {
        throw new errorHandler_1.AppError("Message is required", 400);
    }
    const website = await Website_1.default.findOne({
        slug: req.params.slug,
        status: "live",
    }).populate("userId", "name email");
    if (!website) {
        throw new errorHandler_1.AppError("Website not found", 404);
    }
    website.recipientReply = {
        message,
        repliedAt: new Date(),
    };
    await website.save();
    const sender = website.userId;
    if (sender?.email) {
        const repliedAt = new Date().toLocaleString("en-NG", {
            timeZone: "Africa/Lagos",
            dateStyle: "long",
            timeStyle: "short",
        });
        (0, email_1.sendEmail)({
            to: sender.email,
            subject: `${website.recipientName} replied to your greeting! 💌`,
            html: (0, emailTemplates_1.websiteReplyTemplate)(website.recipientName, sender.name, website.occasion, message, repliedAt, `${process.env.CLIENT_URL}/dashboard`),
        }).catch((err) => console.error("Website reply notification email error:", err));
    }
    res.status(200).json({
        success: true,
        message: "Reply submitted successfully",
        data: { recipientReply: website.recipientReply },
    });
}));
router.post("/live/:slug/react", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { emoji } = req.body;
    if (!emoji) {
        throw new errorHandler_1.AppError("Emoji is required", 400);
    }
    const website = await Website_1.default.findOne({
        slug: req.params.slug,
        status: "live",
    }).populate("userId", "name email");
    if (!website) {
        throw new errorHandler_1.AppError("Website not found", 404);
    }
    website.reaction = {
        emoji,
        reactedAt: new Date(),
    };
    await website.save();
    const sender = website.userId;
    if (sender?.email) {
        (0, email_1.sendEmail)({
            to: sender.email,
            subject: `${website.recipientName} reacted to your greeting! ${emoji}`,
            html: (0, emailTemplates_1.websiteReactionTemplate)(website.recipientName, sender.name, website.occasion, emoji, new Date().toLocaleString("en-NG", {
                timeZone: "Africa/Lagos",
                dateStyle: "long",
                timeStyle: "short",
            }), `${process.env.CLIENT_URL}/dashboard/websites`),
        }).catch((err) => console.error("React notification email error:", err));
    }
    res.status(200).json({
        success: true,
        message: "Reaction submitted successfully",
        data: { reaction: website.reaction },
    });
}));
exports.default = router;
