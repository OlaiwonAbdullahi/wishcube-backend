import express, { Request, Response, NextFunction } from "express";
import { asyncHandler, AppError } from "../utils/errorHandler";
import { protect } from "../middleware/authMiddleware";
import {
  initializePaystackPayment,
  verifyPaystackPayment,
} from "../utils/paystack";
import User from "../model/User";
import { sendEmail } from "../utils/email";
import { subscriptionActiveTemplate } from "../utils/emailTemplates";

const router = express.Router();

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
router.post(
  "/initialize",
  protect,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { planType, callbackUrl } = req.body;

    if (!planType || !PLANS[planType as keyof typeof PLANS]) {
      return next(
        new AppError("Please provide a valid plan type (pro or premium)", 400),
      );
    }

    const selectedPlan = PLANS[planType as keyof typeof PLANS];
    const user = req.user!;

    const finalCallbackUrl =
      callbackUrl || `${process.env.CLIENT_URL}/dashboard/pricing/verify`;

    const paymentData = await initializePaystackPayment({
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
  }),
);

// @desc    Verify subscription payment and upgrade user
// @route   GET /api/subscriptions/verify/:reference
// @access  Private
router.get(
  "/verify/:reference",
  protect,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { reference } = req.params;

    if (!reference) {
      return next(new AppError("Please provide a payment reference", 400));
    }

    const paymentData = await verifyPaystackPayment(reference);

    if (paymentData.status !== "success") {
      return next(new AppError("Payment verification failed", 400));
    }

    const { userId, planType, type } = paymentData.metadata;

    if (
      type !== "subscription_upgrade" ||
      userId !== req.user!._id.toString()
    ) {
      return next(new AppError("Invalid payment metadata", 400));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    user.subscriptionTier = planType as "pro" | "premium";
    user.subscriptionStatus = "active";
    user.subscriptionExpiry = expiryDate;

    if (paymentData.customer && paymentData.customer.customer_code) {
      user.paystackCustomerCode = paymentData.customer.customer_code;
    }

    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: `Your WishCube ${planType.charAt(0).toUpperCase() + planType.slice(1)} Subscription is Active! 🚀`,
        html: subscriptionActiveTemplate(
          user.name,
          planType,
          expiryDate.toLocaleDateString(),
          `${process.env.CLIENT_URL}/dashboard`,
        ),
      });
    } catch (emailError) {
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
  }),
);

// @desc    Get current user subscription status
// @route   GET /api/subscriptions/status
// @access  Private
router.get(
  "/status",
  protect,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user!._id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({
      success: true,
      data: {
        tier: user.subscriptionTier,
        status: user.subscriptionStatus,
        expiry: user.subscriptionExpiry,
      },
    });
  }),
);

export default router;
