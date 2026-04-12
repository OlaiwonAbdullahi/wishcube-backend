import express, { Request, Response } from "express";
import Order from "../model/Order";
import Gift from "../model/Gift";
import Vendor from "../model/Vendor";
import User from "../model/User";
import { protect, authorize } from "../middleware/authMiddleware";
import { asyncHandler, AppError } from "../utils/errorHandler";
import { sendEmail } from "../utils/email";
import {
  orderOutForDeliveryTemplate,
  deliveryConfirmedTemplate,
} from "../utils/emailTemplates";

const router = express.Router();

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private (Vendor only for specific statuses)
router.patch(
  "/:id/status",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { status, trackingNumber, note } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId).populate("giftId");
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    // Only vendor associated with the order can update these statuses
    if (order.vendorId.toString() !== req.user?._id.toString()) {
      throw new AppError("Not authorized to update this order", 403);
    }

    const allowedTransitions: Record<string, string[]> = {
      processing: ["out_for_delivery", "cancelled"],
      out_for_delivery: ["in_transit", "cancelled"],
      in_transit: ["awaiting_confirmation", "cancelled"],
      awaiting_confirmation: ["delivered", "disputed", "cancelled"],
    };

    // Vendor can only update to these specific statuses
    const vendorAllowedStatuses = [
      "out_for_delivery",
      "in_transit",
      "awaiting_confirmation",
    ];

    if (!vendorAllowedStatuses.includes(status)) {
      throw new AppError(
        `Vendors cannot manually set status to ${status}.`,
        400,
      );
    }

    const currentStatus = order.status;
    if (
      allowedTransitions[currentStatus] &&
      !allowedTransitions[currentStatus].includes(status)
    ) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${status}`,
        400,
      );
    }

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;

    // Generate and send OTP only on out_for_delivery transition
    if (status === "out_for_delivery" && currentStatus === "processing") {
      order.deliveryCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      order.otpExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      order.otpAttempts = 0;

      // Send OTP email
      const gift = order.giftId as any;
      if (gift) {
        const trackingUrl = `${process.env.CLIENT_URL}/w/track?orderId=${order._id}&token=${gift.redeemToken}`;
        await sendEmail({
          to: order.deliveryAddress.email,
          subject: "Your gift is out for delivery! 🚚",
          html: orderOutForDeliveryTemplate(
            order.deliveryAddress.fullName,
            order.productSnapshot.name,
            order.trackingNumber,
            order.deliveryCode!,
            trackingUrl,
          ),
        }).catch((err) => console.error("OTP email failed:", err));
      }
    }

    if (status === "awaiting_confirmation") {
      order.awaitingConfirmationAt = new Date();
    }

    order.statusHistory.push({
      status,
      updatedAt: new Date(),
      note: note || `Status updated to ${status} by vendor`,
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: { order },
    });
  }),
);

// @desc    OTP confirmation endpoint
// @route   POST /api/orders/:id/confirm
// @access  Public (with token) or Private
router.post(
  "/:id/confirm",
  asyncHandler(async (req: Request, res: Response) => {
    const { code, confirmedBy, token } = req.body;
    const orderId = req.params.id;

    if (!code || !confirmedBy) {
      throw new AppError("Code and confirmedBy are required", 400);
    }

    const order = await Order.findById(orderId).populate("giftId");
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (order.status === "delivered") {
      throw new AppError("Order already delivered", 400);
    }

    if (order.status === "disputed") {
      throw new AppError("Order is in dispute and cannot be confirmed", 400);
    }

    // Security check for public access
    if (confirmedBy === "recipient" && !req.user) {
      if (!token) {
        throw new AppError(
          "Redeem token is required for public confirmation",
          400,
        );
      }
      const gift = await Gift.findOne({
        redeemToken: token,
        _id: order.giftId,
      });
      if (!gift) {
        throw new AppError("Invalid redeem token", 403);
      }
    }

    // Recipient self-confirm fallback check
    if (confirmedBy === "recipient") {
      if (order.status !== "awaiting_confirmation") {
        throw new AppError(
          "Recipient can only self-confirm when status is awaiting_confirmation",
          400,
        );
      }
      const fortyEightHours = 48 * 60 * 60 * 1000;
      if (
        !order.awaitingConfirmationAt ||
        Date.now() - order.awaitingConfirmationAt.getTime() > fortyEightHours
      ) {
        throw new AppError(
          "Recipient self-confirmation window (48hrs) has passed",
          400,
        );
      }
    }

    // Check OTP expiry
    if (order.otpExpiresAt && Date.now() > order.otpExpiresAt.getTime()) {
      throw new AppError("OTP has expired", 400);
    }

    // Validate code
    if (order.deliveryCode !== code) {
      order.otpAttempts += 1;
      if (order.otpAttempts >= 3) {
        order.status = "disputed";
        order.statusHistory.push({
          status: "disputed",
          updatedAt: new Date(),
          note: "Max OTP attempts reached. Order moved to disputed status.",
        });
        await order.save();
        throw new AppError(
          "Maximum OTP attempts reached. Order is now disputed.",
          400,
        );
      }
      await order.save();
      throw new AppError("Invalid delivery code", 400);
    }

    // Success: Mark delivered
    order.status = "delivered";
    order.confirmedBy = confirmedBy;
    order.isDeliveredByReceiver = true;
    order.statusHistory.push({
      status: "delivered",
      updatedAt: new Date(),
      note: `Delivery confirmed by ${confirmedBy}`,
    });

    await order.save();

    // Trigger escrow release
    const gift = await Gift.findById(order.giftId);
    if (gift) {
      gift.escrowStatus = "released";
      await gift.save();

      // Notify both parties
      const vendor = await Vendor.findById(order.vendorId);
      const sender = await User.findById(order.senderId);

      // Notify recipient
      await sendEmail({
        to: order.deliveryAddress.email,
        subject: "Delivery Confirmed! 🎁",
        html: deliveryConfirmedTemplate(
          order.deliveryAddress.fullName,
          order.productSnapshot.name,
          "recipient",
        ),
      }).catch((err) => console.error("Recipient delivery email failed:", err));

      // Notify vendor
      if (vendor) {
        await sendEmail({
          to: vendor.email,
          subject: "Order Delivered & Funds Released! 💰",
          html: deliveryConfirmedTemplate(
            vendor.ownerName,
            order.productSnapshot.name,
            "vendor",
          ),
        }).catch((err) => console.error("Vendor delivery email failed:", err));
      }
    }

    res.status(200).json({
      success: true,
      message: "Delivery confirmed successfully",
      data: { order },
    });
  }),
);

export default router;
