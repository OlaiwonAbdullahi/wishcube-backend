"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const Gift_1 = __importDefault(require("../model/Gift"));
const Website_1 = __importDefault(require("../model/Website"));
const Order_1 = __importDefault(require("../model/Order"));
const Product_1 = __importDefault(require("../model/Product"));
const Vendor_1 = __importDefault(require("../model/Vendor"));
const User_1 = __importDefault(require("../model/User"));
const WalletTransaction_1 = __importDefault(require("../model/WalletTransaction"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const email_1 = require("../utils/email");
const emailTemplates_1 = require("../utils/emailTemplates");
const paystack_1 = require("../utils/paystack");
const errorHandler_1 = require("../utils/errorHandler");
const GIFT_EXPIRY_DAYS = 30;
const COMMISSION_RATE = 0.1;
const router = express_1.default.Router();
// @desc    Purchase a gift
// @route   POST /api/gifts
// @access  Private
router.post("/", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { websiteId, type, amount, productId, giftMessage, paymentMethod } = req.body;
    if (!type || !paymentMethod) {
        throw new errorHandler_1.AppError("type and paymentMethod are required", 400);
    }
    if (websiteId) {
        const website = await Website_1.default.findOne({
            _id: websiteId,
            userId: req.user?._id,
        });
        if (!website) {
            throw new errorHandler_1.AppError("Website not found", 404);
        }
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
    if (paymentMethod === "wallet") {
        const user = await User_1.default.findById(req.user?._id);
        if (!user || user.walletBalance < amountPaid) {
            throw new errorHandler_1.AppError("Insufficient wallet balance", 400);
        }
        const balanceBefore = user.walletBalance;
        const balanceAfter = balanceBefore - amountPaid;
        await WalletTransaction_1.default.create({
            user: user._id,
            type: "debit",
            amount: amountPaid,
            balanceBefore,
            balanceAfter,
            reference: `WLT-GFT-${(0, uuid_1.v4)().split("-")[0].toUpperCase()}`,
            description: `Gift purchase: ${type === "physical" ? productSnapshot.name : "Digital gift"}`,
            status: "success",
        });
        user.walletBalance = balanceAfter;
        await user.save();
    }
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
        expiresAt,
        escrowStatus: "holding",
        status: "pending",
    });
    if (websiteId) {
        await Website_1.default.findByIdAndUpdate(websiteId, {
            $addToSet: { giftIds: gift._id },
        });
    }
    let paystackData = null;
    if (paymentMethod === "paystack") {
        paystackData = await (0, paystack_1.initializePaystackPayment)({
            email: req.user.email,
            amount: amountPaid * 100,
            metadata: { giftId: gift._id.toString(), type: "gift" },
            callbackUrl: `${process.env.CLIENT_URL}/payment/verify`,
        });
        gift.paymentReference = paystackData.reference;
        gift.status = "pending";
        gift.escrowStatus = "holding";
        await gift.save();
    }
    res.status(201).json({
        success: true,
        message: "Gift created successfully",
        data: {
            gift,
            ...(paystackData && {
                paymentUrl: paystackData.authorization_url,
                reference: paystackData.reference,
            }),
        },
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
    const gift = await Gift_1.default.findOne({ paymentReference: reference }).populate("senderId", "email name");
    if (!gift) {
        throw new errorHandler_1.AppError("Gift not found", 404);
    }
    if (gift.status === "pending" && gift.isPaid) {
        return res.status(200).json({
            success: true,
            message: "Payment already verified",
            data: { gift },
        });
    }
    gift.status = "pending";
    gift.escrowStatus = "holding";
    gift.isPaid = true;
    await gift.save();
    const sender = gift.senderId;
    if (sender?.email) {
        (0, email_1.sendEmail)({
            to: sender.email,
            subject: "Gift Purchase Successful! 🎁",
            html: (0, emailTemplates_1.giftSuccessTemplate)(sender.name, `${process.env.CLIENT_URL}/dashboard/gifts`),
        }).catch((err) => console.error("Gift success email error:", err));
    }
    res.status(200).json({
        success: true,
        message: "Payment verified, gift is active",
        data: { gift },
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
        message: "Sent gifts retrieved successfully",
        data: {
            total: gifts.length,
            gifts,
        },
    });
}));
// @desc    Get unattached gifts (purchased but not linked to any website)
// @route   GET /api/gifts/unattached
// @access  Private
router.get("/unattached", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const gifts = await Gift_1.default.find({
        senderId: req.user?._id,
        websiteId: null,
        status: "pending",
    })
        .sort("-createdAt")
        .populate("productId", "name images");
    res.status(200).json({
        success: true,
        message: "Unattached gifts retrieved successfully",
        data: {
            total: gifts.length,
            gifts,
        },
    });
}));
// @desc    Redeem a gift (Recipient)
// @route   POST /api/gifts/redeem/:token
// @access  Public
router.post("/redeem/:token", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { bankDetails, deliveryAddress } = req.body;
    const gift = await Gift_1.default.findOne({
        redeemToken: req.params.token,
        status: "pending",
    });
    if (!gift) {
        throw new errorHandler_1.AppError("Invalid or already redeemed gift", 400);
    }
    if (gift.type === "digital") {
        if (!bankDetails) {
            throw new errorHandler_1.AppError("Bank details are required for digital gifts", 400);
        }
        gift.recipientBankDetails = bankDetails;
        try {
            // Initiate automated payout
            const payout = await (0, paystack_1.initiateTransfer)({
                accountName: bankDetails.accountName,
                accountNumber: bankDetails.accountNumber,
                bankCode: bankDetails.bankCode,
                amount: gift.amountPaid * 100, // Convert to kobo
                reason: `WishCube Digital Gift Redemption: ${gift._id}`,
                reference: `WISHCUBE-GIFT-PAYOUT-${(0, uuid_1.v4)().split("-")[0].toUpperCase()}`,
            });
            gift.payoutStatus = "processing";
            gift.payoutReference = payout.reference;
            gift.escrowStatus = "released";
        }
        catch (error) {
            console.error("Payout initiation failed:", error);
            gift.payoutStatus = "failed";
        }
        gift.status = "redeemed";
        gift.redeemedAt = new Date();
        await gift.save();
        return res.status(200).json({
            success: true,
            message: gift.payoutStatus === "processing"
                ? "Gift redeemed! Payout has been initiated successfully."
                : "Gift redeemed, but payout initiation failed. Our team will process it manually.",
            data: { gift },
        });
    }
    else {
        if (!deliveryAddress) {
            throw new errorHandler_1.AppError("Delivery address is required for physical gifts", 400);
        }
        gift.deliveryAddress = deliveryAddress;
        const { fullName, phone, email, address, city, state } = deliveryAddress;
        const commissionAmount = gift.amountPaid * COMMISSION_RATE;
        const vendorEarnings = gift.amountPaid - commissionAmount;
        const order = await Order_1.default.create({
            giftId: gift._id,
            vendorId: gift.productSnapshot?.vendorId,
            productId: gift.productId,
            senderId: gift.senderId,
            productSnapshot: {
                name: gift.productSnapshot?.name,
                price: gift.productSnapshot?.price,
                imageUrl: gift.productSnapshot?.imageUrl,
            },
            deliveryAddress: { fullName, phone, email, address, city, state },
            totalAmount: gift.amountPaid,
            commissionAmount,
            vendorEarnings,
            autoConfirmAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            statusHistory: [
                { status: "processing", note: "Order created after gift redemption" },
            ],
        });
        await Product_1.default.findByIdAndUpdate(gift.productId, { $inc: { stock: -1 } });
        const vendor = await Vendor_1.default.findById(gift.productSnapshot?.vendorId);
        if (vendor?.email) {
            (0, email_1.sendEmail)({
                to: vendor.email,
                subject: `New order received! 📦`,
                html: (0, emailTemplates_1.vendorOrderNotificationTemplate)(vendor.ownerName, gift.productSnapshot?.name || "Product", fullName, `${address}, ${city}, ${state}`, phone, `${process.env.CLIENT_URL}/vendor/orders/${order._id}`),
            }).catch(console.error);
        }
        // Notify sender
        const sender = (await User_1.default.findById(gift.senderId).select("email name"));
        if (sender) {
            (0, email_1.sendEmail)({
                to: sender.email,
                subject: "Your gift has been redeemed 🎁",
                html: (0, emailTemplates_1.giftRedeemedSenderTemplate)(sender.name, gift.productSnapshot?.name || "Product", `${process.env.CLIENT_URL}/dashboard/gifts`),
            }).catch(console.error);
        }
        gift.status = "redeemed";
        gift.redeemedAt = new Date();
        await gift.save();
        return res.status(200).json({
            success: true,
            message: "Gift redeemed! Order has been placed.",
            data: { gift, order },
        });
    }
}));
// @desc    Track an order
// @route   GET /api/gifts/track/:orderId
// @access  Public
router.get("/track/:orderId", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token } = req.query;
    if (!token) {
        throw new errorHandler_1.AppError("Redeem token is required for tracking", 400);
    }
    const gift = await Gift_1.default.findOne({ redeemToken: token });
    if (!gift) {
        throw new errorHandler_1.AppError("Invalid gift token", 404);
    }
    const order = await Order_1.default.findOne({
        _id: req.params.orderId,
        giftId: gift._id,
    });
    if (!order) {
        throw new errorHandler_1.AppError("Order not found or unauthorized", 404);
    }
    res.status(200).json({
        success: true,
        message: "Tracking info retrieved",
        data: {
            status: order.status,
            statusHistory: order.statusHistory,
            productSnapshot: order.productSnapshot,
            trackingNumber: order.trackingNumber,
        },
    });
}));
// @desc    Confirm delivery (Recipient)
// @route   POST /api/gifts/confirm-delivery/:orderId
// @access  Public
router.post("/confirm-delivery/:orderId", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token, code } = req.body;
    if (!token || !code) {
        throw new errorHandler_1.AppError("Token and delivery code are required", 400);
    }
    const gift = await Gift_1.default.findOne({ redeemToken: token });
    if (!gift) {
        throw new errorHandler_1.AppError("Invalid gift token", 404);
    }
    const order = await Order_1.default.findOne({
        _id: req.params.orderId,
        giftId: gift._id,
    });
    if (!order) {
        throw new errorHandler_1.AppError("Order not found or unauthorized", 404);
    }
    if (order.status === "delivered") {
        throw new errorHandler_1.AppError("Order already delivered", 400);
    }
    if (order.deliveryCode !== code) {
        throw new errorHandler_1.AppError("Invalid delivery confirmation code", 400);
    }
    order.status = "delivered";
    order.isDeliveredByReceiver = true;
    order.statusHistory.push({
        status: "delivered",
        updatedAt: new Date(),
        note: "Delivery confirmed by recipient using code.",
    });
    // Handle escrow release if needed (WishCube logic)
    gift.escrowStatus = "released";
    await gift.save();
    await order.save();
    res.status(200).json({
        success: true,
        message: "Delivery confirmed successfully! Fund released to vendor.",
        data: { order },
    });
}));
exports.default = router;
