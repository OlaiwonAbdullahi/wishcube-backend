import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Gift from "../model/Gift";
import Website from "../model/Website";
import Order from "../model/Order";
import Product from "../model/Product";
import Vendor from "../model/Vendor";
import User from "../model/User";
import WalletTransaction from "../model/WalletTransaction";
import { protect } from "../middleware/authMiddleware";
import { sendEmail } from "../utils/email";
import {
  initializePaystackPayment,
  verifyPaystackPayment,
} from "../utils/paystack";
import { asyncHandler, AppError } from "../utils/errorHandler";

const GIFT_EXPIRY_DAYS = 30;
const COMMISSION_RATE = 0.1;

const router = express.Router();

// @desc    Purchase a gift (can be attached later or immediately)
// @route   POST /api/gifts
// @access  Private
router.post(
  "/",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { websiteId, type, amount, productId, giftMessage, paymentMethod } =
      req.body;

    if (!type || !paymentMethod) {
      throw new AppError("type and paymentMethod are required", 400);
    }

    if (websiteId) {
      const website = await Website.findOne({
        _id: websiteId,
        userId: req.user?._id,
      });
      if (!website) {
        throw new AppError("Website not found", 404);
      }
    }

    let amountPaid = 0;
    let productSnapshot: any = null;

    if (type === "digital") {
      if (!amount || amount < 100) {
        throw new AppError("Minimum digital gift amount is ₦100", 400);
      }
      amountPaid = amount;
    }

    if (type === "physical") {
      if (!productId) {
        throw new AppError("productId is required for physical gifts", 400);
      }

      const product = await Product.findById(productId).populate("vendorId");
      if (!product || !product.isAvailable || product.stock < 1) {
        throw new AppError("Product is unavailable or out of stock", 400);
      }

      amountPaid = product.price;
      const vendor = product.vendorId as any;
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
      const user = await User.findById(req.user?._id);
      if (!user || (user as any).walletBalance < amountPaid) {
        throw new AppError("Insufficient wallet balance", 400);
      }

      const balanceBefore = (user as any).walletBalance;
      const balanceAfter = balanceBefore - amountPaid;

      // Create transaction record
      await WalletTransaction.create({
        user: user._id,
        type: "debit",
        amount: amountPaid,
        balanceBefore,
        balanceAfter,
        reference: `WLT-GFT-${uuidv4().split("-")[0].toUpperCase()}`,
        description: `Gift purchase: ${type === "physical" ? productSnapshot.name : "Digital gift"}`,
        status: "success",
      });

      (user as any).walletBalance = balanceAfter;
      await user.save();
    }

    const redeemToken = uuidv4();
    const expiresAt = new Date(
      Date.now() + GIFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const gift = await Gift.create({
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

    if (websiteId) {
      await Website.findByIdAndUpdate(websiteId, {
        $addToSet: { giftIds: gift._id },
      });
    }

    let paystackData: any = null;
    if (paymentMethod === "paystack") {
      paystackData = await initializePaystackPayment({
        email: (req.user as any).email,
        amount: amountPaid * 100,
        metadata: { giftId: gift._id.toString(), type: "gift" },
        callbackUrl: `${process.env.CLIENT_URL}/payment/verify`,
      });

      await Gift.findByIdAndUpdate(gift._id, {
        paymentReference: paystackData.reference,
      });
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
  }),
);

// @desc    Verify Paystack payment
// @route   POST /api/gifts/verify-payment
// @access  Private
router.post(
  "/verify-payment",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { reference } = req.body;
    const verification = await verifyPaystackPayment(reference);

    if (verification.status !== "success") {
      throw new AppError("Payment verification failed", 400);
    }

    const gift = await Gift.findOne({ paymentReference: reference });
    if (!gift) {
      throw new AppError("Gift not found", 404);
    }

    gift.status = "pending";
    gift.escrowStatus = "holding";
    await gift.save();

    res.status(200).json({
      success: true,
      message: "Payment verified, gift is active",
      data: { gift },
    });
  }),
);

// @desc    Get sent gifts
// @route   GET /api/gifts/sent
// @access  Private
router.get(
  "/sent",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const gifts = await Gift.find({ senderId: req.user?._id })
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
  }),
);

// @desc    Get unattached gifts (purchased but not linked to any website)
// @route   GET /api/gifts/unattached
// @access  Private
router.get(
  "/unattached",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const gifts = await Gift.find({
      senderId: req.user?._id,
      websiteId: null,
      status: "pending", // Only show paid/pending gifts
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
  }),
);

// @desc    Redeem a gift (Recipient)
// @route   POST /api/gifts/redeem/:token
// @access  Public
router.post(
  "/redeem/:token",
  asyncHandler(async (req: Request, res: Response) => {
    const { bankDetails, deliveryAddress } = req.body;

    const gift = await Gift.findOne({
      redeemToken: req.params.token,
      status: "pending",
    });

    if (!gift) {
      throw new AppError("Invalid or already redeemed gift", 400);
    }

    if (gift.type === "digital") {
      if (!bankDetails) {
        throw new AppError("Bank details are required for digital gifts", 400);
      }
      gift.recipientBankDetails = bankDetails;
    } else {
      if (!deliveryAddress) {
        throw new AppError(
          "Delivery address is required for physical gifts",
          400,
        );
      }
      gift.deliveryAddress = deliveryAddress;

      const { fullName, phone, address, city, state } = deliveryAddress;
      const commissionAmount = gift.amountPaid * COMMISSION_RATE;
      const vendorEarnings = gift.amountPaid - commissionAmount;

      // Create an Order for the vendor
      const order = await Order.create({
        giftId: gift._id,
        vendorId: gift.productSnapshot?.vendorId as any,
        productId: gift.productId as any,
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

      // Reduce product stock
      await Product.findByIdAndUpdate(gift.productId, { $inc: { stock: -1 } });

      // Notify vendor
      const vendor = (await Vendor.findById(
        gift.productSnapshot?.vendorId,
      ).populate("userId", "email name")) as any;
      if (vendor?.userId?.email) {
        sendEmail({
          to: vendor.userId.email,
          subject: `New order received! 📦`,
          html: `
            <h2>You have a new order!</h2>
            <p>Product: <strong>${gift.productSnapshot?.name}</strong></p>
            <p>Deliver to: ${fullName}, ${address}, ${city}, ${state}</p>
            <p>Phone: ${phone}</p>
            <a href="${process.env.CLIENT_URL}/vendor/orders/${
              (order as any)._id
            }">View Order</a>
          `,
        }).catch(console.error);
      }

      // Notify sender
      const sender = (await User.findById(gift.senderId).select(
        "email name",
      )) as any;
      if (sender) {
        sendEmail({
          to: sender.email,
          subject: "Your gift has been redeemed 🎁",
          html: `<p>Hi ${sender.name}, your gift of <strong>${gift.productSnapshot?.name}</strong> has been redeemed. The vendor has been notified to begin delivery.</p>`,
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

    gift.status = "redeemed";
    gift.redeemedAt = new Date();
    await gift.save();

    res.status(200).json({
      success: true,
      message: "Gift redeemed successfully",
      data: { gift },
    });
  }),
);

export default router;
