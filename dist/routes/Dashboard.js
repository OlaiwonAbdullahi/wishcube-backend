"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Card_1 = __importDefault(require("../model/Card"));
const Website_1 = __importDefault(require("../model/Website"));
const Gift_1 = __importDefault(require("../model/Gift"));
const User_1 = __importDefault(require("../model/User"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const errorHandler_1 = require("../utils/errorHandler");
const router = express_1.default.Router();
// @desc    Get dashboard overview stats and recent works
// @route   GET /api/dashboard/overview
// @access  Private
router.get("/overview", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?._id;
    const [cardsCount, websitesCount, giftsCount, user] = await Promise.all([
        Card_1.default.countDocuments({ userId }),
        Website_1.default.countDocuments({ userId }),
        Gift_1.default.countDocuments({ senderId: userId }),
        User_1.default.findById(userId).select("walletBalance"),
    ]);
    const [recentWebsites, recentCards] = await Promise.all([
        Website_1.default.find({ userId })
            .sort({ createdAt: -1 })
            .limit(4)
            .select("recipientName occasion status slug publicUrl createdAt"),
        Card_1.default.find({ userId })
            .sort({ createdAt: -1 })
            .limit(4)
            .select("recipientName occasion status theme createdAt"),
    ]);
    res.status(200).json({
        success: true,
        message: "Dashboard overview retrieved successfully",
        data: {
            stats: {
                cardsCount,
                websitesCount,
                giftsCount,
                walletBalance: user?.walletBalance || 0,
            },
            recentWorks: {
                websites: recentWebsites,
                cards: recentCards,
            },
        },
    });
}));
exports.default = router;
