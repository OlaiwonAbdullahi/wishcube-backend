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
            html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F3F3F3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border:2px solid #191A23;border-bottom:5px solid #191A23;box-shadow:4px 4px 0 rgba(25,26,35,.15);max-width:560px;width:100%;">
        <tr>
          <td style="background:#191A23;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">WishCube</p>
            <div style="display:inline-block;background:#E6D1FF;border:2px solid #fff;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;margin-bottom:14px;">🎁</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Payment Confirmed!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">Your gift is ready to be sent</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;background:#ffffff;">
            <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${sender.name},</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
              Your payment for the gift was successful. The gift is now active and ready to be redeemed by the recipient.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${process.env.CLIENT_URL}/dashboard/gifts"
                  style="display:inline-block;background:#191A23;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:14px 36px;border:2px solid #191A23;border-bottom:4px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.2);">
                  View My Gifts &rarr;
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background:#F3F3F3;border-top:2px solid #191A23;text-align:center;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;">&copy; ${new Date().getFullYear()} WishCube. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
        const { fullName, phone, address, city, state } = deliveryAddress;
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
            deliveryAddress: { fullName, phone, address, city, state },
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
                html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F3F3F3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border:2px solid #191A23;border-bottom:5px solid #191A23;box-shadow:4px 4px 0 rgba(25,26,35,.15);max-width:560px;width:100%;">
        <tr>
          <td style="background:#191A23;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">WishCube Marketplace</p>
            <div style="display:inline-block;background:#D1FAE5;border:2px solid #fff;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;margin-bottom:14px;">📦</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">New Order!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">You have a new product to fulfill</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;background:#ffffff;">
            <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${vendor.ownerName},</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
              Good news! A customer just redeemed a gift for one of your products.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;border:2px solid #191A23;margin-bottom:28px;">
              <tr>
                <td style="padding:24px;">
                  <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#191A23;">Order Details</p>
                  <p style="margin:0 0 5px;font-size:15px;color:#191A23;"><strong>Product:</strong> ${gift.productSnapshot?.name}</p>
                  <p style="margin:0 0 5px;font-size:14px;color:#52525b;"><strong>Deliver to:</strong> ${fullName}</p>
                  <p style="margin:0 0 5px;font-size:14px;color:#52525b;"><strong>Address:</strong> ${address}, ${city}, ${state}</p>
                  <p style="margin:0;font-size:14px;color:#52525b;"><strong>Phone:</strong> ${phone}</p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${process.env.CLIENT_URL}/vendor/orders/${order._id}"
                  style="display:inline-block;background:#191A23;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:14px 36px;border:2px solid #191A23;border-bottom:4px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.2);">
                  Process Order &rarr;
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background:#F3F3F3;border-top:2px solid #191A23;text-align:center;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;">&copy; ${new Date().getFullYear()} WishCube. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
            }).catch(console.error);
        }
        // Notify sender
        const sender = (await User_1.default.findById(gift.senderId).select("email name"));
        if (sender) {
            (0, email_1.sendEmail)({
                to: sender.email,
                subject: "Your gift has been redeemed 🎁",
                html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F3F3F3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border:2px solid #191A23;border-bottom:5px solid #191A23;box-shadow:4px 4px 0 rgba(25,26,35,.15);max-width:560px;width:100%;">
        <tr>
          <td style="background:#191A23;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">WishCube</p>
            <div style="display:inline-block;background:#E6D1FF;border:2px solid #fff;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;margin-bottom:14px;">🎁</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Gift Redeemed!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">The recipient has claimed your gift</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;background:#ffffff;">
            <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${sender.name},</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
              Your gift of <strong>${gift.productSnapshot?.name}</strong> has been redeemed. The vendor has been notified to begin delivery. We'll keep you updated on the progress!
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${process.env.CLIENT_URL}/dashboard/gifts"
                  style="display:inline-block;background:#191A23;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:14px 36px;border:2px solid #191A23;border-bottom:4px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.2);">
                  View Gift Status &rarr;
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background:#F3F3F3;border-top:2px solid #191A23;text-align:center;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;">&copy; ${new Date().getFullYear()} WishCube. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
exports.default = router;
