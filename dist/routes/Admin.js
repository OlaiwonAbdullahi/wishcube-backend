"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Product_1 = __importDefault(require("../model/Product"));
const User_1 = __importDefault(require("../model/User"));
const Card_1 = __importDefault(require("../model/Card"));
const Website_1 = __importDefault(require("../model/Website"));
const Vendor_1 = __importDefault(require("../model/Vendor"));
const Order_1 = __importDefault(require("../model/Order"));
const Settings_1 = require("../model/Settings");
const authMiddleware_1 = require("../middleware/authMiddleware");
const errorHandler_1 = require("../utils/errorHandler");
const router = express_1.default.Router();
router.post("/digital-gifts", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("admin"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { name, price, description, images } = req.body;
    if (!name || !price) {
        throw new errorHandler_1.AppError("Name and price are required for digital gifts", 400);
    }
    const digitalGift = await Product_1.default.create({
        name,
        price,
        description,
        images: images || [],
        category: "Vouchers",
        isAvailable: true,
        // -1 is the "unlimited stock" sentinel: Infinity doesn't survive
        // JSON.stringify (it serializes to null), so a real number is needed.
        stock: -1,
    });
    res.status(201).json({
        success: true,
        message: "Digital gift created successfully",
        data: { digitalGift },
    });
}));
router.get("/digital-gifts", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("admin"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const digitalGifts = await Product_1.default.find({ category: "Vouchers" }).sort("-createdAt");
    res.status(200).json({
        success: true,
        message: "Digital gifts retrieved successfully",
        data: {
            total: digitalGifts.length,
            digitalGifts,
        },
    });
}));
router.delete("/digital-gifts/:id", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("admin"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const digitalGift = await Product_1.default.findOne({
        _id: req.params.id,
        category: "Vouchers",
    });
    if (!digitalGift) {
        throw new errorHandler_1.AppError("Digital gift not found", 404);
    }
    await digitalGift.deleteOne();
    res.status(200).json({
        success: true,
        message: "Digital gift deleted successfully",
        data: null,
    });
}));
// @desc    Platform-wide overview stats for the admin dashboard
// @route   GET /api/admin/overview
// @access  Private/Admin
router.get("/overview", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("admin"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const [totalUsers, totalCards, totalWebsites, totalVendors, activeVendors, totalOrders,] = await Promise.all([
        User_1.default.countDocuments(),
        Card_1.default.countDocuments(),
        Website_1.default.countDocuments(),
        Vendor_1.default.countDocuments(),
        Vendor_1.default.countDocuments({ status: "approved", isActive: true }),
        Order_1.default.countDocuments(),
    ]);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [newUsersThisWeek, newCardsThisWeek, newWebsitesThisWeek] = await Promise.all([
        User_1.default.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
        Card_1.default.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
        Website_1.default.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
    ]);
    // Daily counts for the last 7 days (oldest first) for simple charting.
    const dailySeries = [];
    for (let i = 6; i >= 0; i--) {
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        dayStart.setDate(dayStart.getDate() - i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const [users, cards, websites] = await Promise.all([
            User_1.default.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } }),
            Card_1.default.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } }),
            Website_1.default.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } }),
        ]);
        dailySeries.push({
            date: dayStart.toISOString().slice(0, 10),
            users,
            cards,
            websites,
        });
    }
    const [recentCards, recentWebsites] = await Promise.all([
        Card_1.default.find().sort("-createdAt").limit(5).populate("userId", "name"),
        Website_1.default.find().sort("-createdAt").limit(5).populate("userId", "name"),
    ]);
    const recentActivity = [
        ...recentCards.map((c) => ({
            type: "card",
            description: `${c.userId?.name || "Someone"} created a "${c.occasion}" card for ${c.recipientName}`,
            createdAt: c.createdAt,
        })),
        ...recentWebsites.map((w) => ({
            type: "website",
            description: `${w.userId?.name || "Someone"} created a "${w.occasion}" page for ${w.recipientName}`,
            createdAt: w.createdAt,
        })),
    ]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8);
    res.status(200).json({
        success: true,
        message: "Overview retrieved successfully",
        data: {
            totals: {
                totalUsers,
                totalCards,
                totalWebsites,
                totalVendors,
                activeVendors,
                totalOrders,
            },
            thisWeek: {
                newUsersThisWeek,
                newCardsThisWeek,
                newWebsitesThisWeek,
            },
            dailySeries,
            recentActivity,
        },
    });
}));
// @desc    Admin: list all cards on the platform
// @route   GET /api/admin/cards
// @access  Private/Admin
router.get("/cards", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("admin"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const cards = await Card_1.default.find()
        .sort("-createdAt")
        .limit(200)
        .populate("userId", "name email");
    res.status(200).json({
        success: true,
        message: "Cards retrieved successfully",
        data: { total: cards.length, cards },
    });
}));
// @desc    Admin: list all celebration websites on the platform
// @route   GET /api/admin/websites
// @access  Private/Admin
router.get("/websites", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("admin"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const websites = await Website_1.default.find()
        .sort("-createdAt")
        .limit(200)
        .populate("userId", "name email");
    res.status(200).json({
        success: true,
        message: "Websites retrieved successfully",
        data: { total: websites.length, websites },
    });
}));
// @desc    Admin: get platform settings
// @route   GET /api/admin/settings
// @access  Private/Admin
router.get("/settings", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("admin"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const settings = await (0, Settings_1.getOrCreateSettings)();
    res.status(200).json({
        success: true,
        message: "Settings retrieved successfully",
        data: { settings },
    });
}));
// @desc    Admin: update platform settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
router.put("/settings", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("admin"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { maintenanceMode, maintenanceMessage, supportEmail, allowNewVendorRegistrations, } = req.body;
    const settings = await (0, Settings_1.getOrCreateSettings)();
    if (maintenanceMode !== undefined)
        settings.maintenanceMode = maintenanceMode;
    if (maintenanceMessage !== undefined)
        settings.maintenanceMessage = maintenanceMessage;
    if (supportEmail !== undefined)
        settings.supportEmail = supportEmail;
    if (allowNewVendorRegistrations !== undefined)
        settings.allowNewVendorRegistrations = allowNewVendorRegistrations;
    await settings.save();
    res.status(200).json({
        success: true,
        message: "Settings updated successfully",
        data: { settings },
    });
}));
exports.default = router;
