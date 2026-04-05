"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = __importDefault(require("../model/User"));
const WalletTransaction_1 = __importDefault(require("../model/WalletTransaction"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const paystack_1 = require("../utils/paystack");
const errorHandler_1 = require("../utils/errorHandler");
const email_1 = require("../utils/email");
const emailTemplates_1 = require("../utils/emailTemplates");
const router = express_1.default.Router();
// @desc    Get wallet balance
// @route   GET /api/wallet/balance
// @access  Private
router.get("/balance", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.default.findById(req.user?._id);
    res.status(200).json({
        success: true,
        message: "Wallet balance retrieved successfully",
        data: {
            walletBalance: user.walletBalance || 0,
        },
    });
}));
// @desc    Get wallet transaction history
// @route   GET /api/wallet/transactions
// @access  Private
router.get("/transactions", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const transactions = await WalletTransaction_1.default.find({ user: req.user?._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    const total = await WalletTransaction_1.default.countDocuments({
        user: req.user?._id,
    });
    res.status(200).json({
        success: true,
        message: "Transactions retrieved successfully",
        data: {
            transactions,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
            },
        },
    });
}));
// @desc    Initialize wallet funding
// @route   POST /api/wallet/fund
// @access  Private
router.post("/fund", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { amount } = req.body;
    if (!amount || amount < 100) {
        throw new errorHandler_1.AppError("Minimum funding amount is ₦100", 400);
    }
    const paystackData = await (0, paystack_1.initializePaystackPayment)({
        email: req.user.email,
        amount: amount * 100, // Paystack works in kobo
        metadata: {
            userId: (req.user?._id).toString(),
            type: "wallet_funding",
        },
        callbackUrl: `${process.env.CLIENT_URL}/dashboard/wallet/verify`,
    });
    res.status(200).json({
        success: true,
        message: "Funding initialized",
        data: {
            paymentUrl: paystackData.authorization_url,
            reference: paystackData.reference,
        },
    });
}));
// @desc    Verify wallet funding
// @route   POST /api/wallet/verify
// @access  Private
router.post("/verify", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { reference } = req.body;
    if (!reference) {
        throw new errorHandler_1.AppError("Payment reference is required", 400);
    }
    const verification = await (0, paystack_1.verifyPaystackPayment)(reference);
    if (verification.status !== "success") {
        throw new errorHandler_1.AppError("Payment verification failed", 400);
    }
    // Check if it's a wallet funding transaction
    if (verification.metadata?.type !== "wallet_funding") {
        throw new errorHandler_1.AppError("Invalid transaction type", 400);
    }
    const amount = verification.amount / 100; // Convert kobo to NGN
    const user = await User_1.default.findById(req.user?._id);
    if (!user) {
        throw new errorHandler_1.AppError("User not found", 404);
    }
    const balanceBefore = user.walletBalance || 0;
    const balanceAfter = balanceBefore + amount;
    // Create transaction record
    await WalletTransaction_1.default.create({
        user: user._id,
        type: "credit",
        amount,
        balanceBefore,
        balanceAfter,
        reference,
        description: "Wallet funding via Paystack",
        status: "success",
        metadata: { paystackData: verification },
    });
    user.walletBalance = balanceAfter;
    await user.save();
    const newBalance = user.walletBalance;
    const fundedAt = new Date().toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
        dateStyle: "long",
        timeStyle: "short",
    });
    // Send wallet funding confirmation email (non-blocking)
    (0, email_1.sendEmail)({
        to: user.email,
        subject: "Wallet Funded Successfully – WishCube",
        html: (0, emailTemplates_1.walletFundedTemplate)(user.name, amount, newBalance, reference, fundedAt, `${process.env.CLIENT_URL}/dashboard/wallet`),
    }).catch((err) => console.error("Wallet funding email error:", err));
    res.status(200).json({
        success: true,
        message: "Wallet funded successfully",
        data: {
            newBalance,
        },
    });
}));
exports.default = router;
