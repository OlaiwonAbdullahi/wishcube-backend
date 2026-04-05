"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const errorHandler_1 = require("../utils/errorHandler");
const authMiddleware_1 = require("../middleware/authMiddleware");
const paystack_1 = require("../utils/paystack");
const User_1 = __importDefault(require("../model/User"));
const email_1 = require("../utils/email");
const emailTemplates_1 = require("../utils/emailTemplates");
const router = express_1.default.Router();
const PLANS = {
    pro: {
        name: "Pro Plan",
        amount: 10000 * 100,
        tier: "pro",
    },
    premium: {
        name: "Premium Plan",
        amount: 50000 * 100,
        tier: "premium",
    },
};
// @desc    Initialize subscription payment
// @route   POST /api/subscriptions/initialize
// @access  Private
router.post("/initialize", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { planType, callbackUrl } = req.body;
    if (!planType || !PLANS[planType]) {
        return next(new errorHandler_1.AppError("Please provide a valid plan type (pro or premium)", 400));
    }
    const selectedPlan = PLANS[planType];
    const user = req.user;
    const finalCallbackUrl = callbackUrl || `${process.env.CLIENT_URL}/dashboard/pricing/verify`;
    const paymentData = await (0, paystack_1.initializePaystackPayment)({
        email: user.email,
        amount: selectedPlan.amount,
        callbackUrl: finalCallbackUrl,
        metadata: {
            userId: user._id,
            planType: selectedPlan.tier,
            type: "subscription_upgrade",
        },
    });
    res.status(200).json({
        success: true,
        data: paymentData,
    });
}));
// @desc    Verify subscription payment and upgrade user
// @route   GET /api/subscriptions/verify/:reference
// @access  Private
router.get("/verify/:reference", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { reference } = req.params;
    if (!reference) {
        return next(new errorHandler_1.AppError("Please provide a payment reference", 400));
    }
    const paymentData = await (0, paystack_1.verifyPaystackPayment)(reference);
    if (paymentData.status !== "success") {
        return next(new errorHandler_1.AppError("Payment verification failed", 400));
    }
    const { userId, planType, type } = paymentData.metadata;
    if (type !== "subscription_upgrade" ||
        userId !== req.user._id.toString()) {
        return next(new errorHandler_1.AppError("Invalid payment metadata", 400));
    }
    const user = await User_1.default.findById(userId);
    if (!user) {
        return next(new errorHandler_1.AppError("User not found", 404));
    }
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    user.subscriptionTier = planType;
    user.subscriptionStatus = "active";
    user.subscriptionExpiry = expiryDate;
    if (paymentData.customer && paymentData.customer.customer_code) {
        user.paystackCustomerCode = paymentData.customer.customer_code;
    }
    await user.save();
    try {
        await (0, email_1.sendEmail)({
            to: user.email,
            subject: `Your WishCube ${planType.charAt(0).toUpperCase() + planType.slice(1)} Subscription is Active! 🚀`,
            html: (0, emailTemplates_1.subscriptionActiveTemplate)(user.name, planType, expiryDate.toLocaleDateString(), `${process.env.CLIENT_URL}/dashboard`),
        });
    }
    catch (emailError) {
        console.error("Subscription email failed to send:", emailError);
    }
    res.status(200).json({
        success: true,
        message: `Successfully upgraded to ${planType} plan`,
        data: {
            tier: user.subscriptionTier,
            status: user.subscriptionStatus,
            expiry: user.subscriptionExpiry,
        },
    });
}));
// @desc    Get current user subscription status
// @route   GET /api/subscriptions/status
// @access  Private
router.get("/status", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const user = await User_1.default.findById(req.user._id);
    if (!user) {
        return next(new errorHandler_1.AppError("User not found", 404));
    }
    res.status(200).json({
        success: true,
        data: {
            tier: user.subscriptionTier,
            status: user.subscriptionStatus,
            expiry: user.subscriptionExpiry,
        },
    });
}));
exports.default = router;
