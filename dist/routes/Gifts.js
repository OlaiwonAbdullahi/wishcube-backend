"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const Gift_1 = __importDefault(require("../model/Gift"));
const Website_1 = __importDefault(require("../model/Website"));
const Product_1 = __importDefault(require("../model/Product"));
const User_1 = __importDefault(require("../model/User"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const paystack_1 = require("../utils/paystack");
const errorHandler_1 = require("../utils/errorHandler");
const GIFT_EXPIRY_DAYS = 30;
const COMMISSION_RATE = 0.1;
const router = express_1.default.Router();
// @desc    Attach a gift to a website
// @route   POST /api/gifts
// @access  Private
router.post("/", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { websiteId, type, amount, productId, giftMessage, paymentMethod } = req.body;
    if (!websiteId || !type || !paymentMethod) {
        throw new errorHandler_1.AppError("websiteId, type and paymentMethod are required", 400);
    }
    const website = await Website_1.default.findOne({
        _id: websiteId,
        userId: req.user?._id,
    });
    if (!website) {
        throw new errorHandler_1.AppError("Website not found", 404);
    }
    let amountPaid = 0;
    let productSnapshot = null;
    if (type === "digital") {
        if (!amount || amount < 100) {
            throw new errorHandler_1.AppError("Minimum digital gift amount is ₦100", 400);
        }
        amountPaid = amount;
    }
    if (type === "physical") {
        if (!productId) {
            throw new errorHandler_1.AppError("productId is required for physical gifts", 400);
        }
        const product = await Product_1.default.findById(productId).populate("vendorId");
        if (!product || !product.isAvailable || product.stock < 1) {
            throw new errorHandler_1.AppError("Product is unavailable or out of stock", 400);
        }
        amountPaid = product.price;
        const vendor = product.vendorId;
        productSnapshot = {
            name: product.name,
            price: product.price,
            imageUrl: product.images[0]?.url || null,
            vendorId: vendor._id,
            storeName: vendor.storeName,
        };
    }
    // Wallet payment check
    if (paymentMethod === "wallet") {
        const user = await User_1.default.findById(req.user?._id);
        if (!user || user.walletBalance < amountPaid) {
            throw new errorHandler_1.AppError("Insufficient wallet balance", 400);
        }
        user.walletBalance -= amountPaid;
        await user.save();
    }
    const redeemToken = (0, uuid_1.v4)();
    const expiresAt = new Date(Date.now() + GIFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const gift = await Gift_1.default.create({
        senderId: req.user?._id,
        websiteId,
        type,
        amount: type === "digital" ? amountPaid : null,
        productId: type === "physical" ? productId : null,
        productSnapshot,
        paymentMethod,
        amountPaid,
        giftMessage,
        redeemToken,
        expiresAt,
        escrowStatus: "holding",
        status: "pending",
    });
    await Website_1.default.findByIdAndUpdate(websiteId, { giftId: gift._id });
    let paystackData = null;
    if (paymentMethod === "paystack") {
        paystackData = await (0, paystack_1.initializePaystackPayment)({
            email: req.user.email,
            amount: amountPaid * 100,
            metadata: { giftId: gift._id.toString(), type: "gift" },
            callbackUrl: `${process.env.CLIENT_URL}/payment/verify`,
        });
        await Gift_1.default.findByIdAndUpdate(gift._id, {
            paymentReference: paystackData.reference,
        });
    }
    res.status(201).json({
        success: true,
        gift,
        ...(paystackData && {
            paymentUrl: paystackData.authorization_url,
            reference: paystackData.reference,
        }),
    });
}));
// @desc    Verify Paystack payment
// @route   POST /api/gifts/verify-payment
// @access  Private
router.post("/verify-payment", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { reference } = req.body;
    const verification = await (0, paystack_1.verifyPaystackPayment)(reference);
    if (verification.status !== "success") {
        throw new errorHandler_1.AppError("Payment verification failed", 400);
    }
    const gift = await Gift_1.default.findOne({ paymentReference: reference });
    if (!gift) {
        throw new errorHandler_1.AppError("Gift not found", 404);
    }
    gift.status = "pending";
    gift.escrowStatus = "holding";
    await gift.save();
    res.status(200).json({
        success: true,
        message: "Payment verified, gift is active",
        gift,
    });
}));
// @desc    Get sent gifts
// @route   GET /api/gifts/sent
// @access  Private
router.get("/sent", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const gifts = await Gift_1.default.find({ senderId: req.user?._id })
        .sort("-createdAt")
        .populate("websiteId", "recipientName occasion slug publicUrl")
        .populate("productId", "name images");
    res.status(200).json({
        success: true,
        total: gifts.length,
        gifts,
    });
}));
exports.default = router;
