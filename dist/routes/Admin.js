"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Product_1 = __importDefault(require("../model/Product"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const errorHandler_1 = require("../utils/errorHandler");
const router = express_1.default.Router();
// @desc    Admin: Create a digital gift product
// @route   POST /api/admin/digital-gifts
// @access  Private/Admin
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
        category: "Vouchers", // Hardcode category to Vouchers
        isAvailable: true,
        stock: Infinity, // Digital gifts have unlimited stock
    });
    res.status(201).json({
        success: true,
        message: "Digital gift created successfully",
        data: { digitalGift },
    });
}));
// @desc    Admin: Get all digital gifts
// @route   GET /api/admin/digital-gifts
// @access  Private/Admin
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
// @desc    Admin: Delete a digital gift
// @route   DELETE /api/admin/digital-gifts/:id
// @access  Private/Admin
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
exports.default = router;
