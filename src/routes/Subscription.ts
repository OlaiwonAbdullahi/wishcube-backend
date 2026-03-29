import express, { Request, Response, NextFunction } from "express";
import { asyncHandler, AppError } from "../utils/errorHandler";
import { protect } from "../middleware/authMiddleware";
import {
  initializePaystackPayment,
  verifyPaystackPayment,
} from "../utils/paystack";
import User from "../model/User";
import { sendEmail } from "../utils/email";

const router = express.Router();

const PLANS = {
  pro: {
    name: "Pro Plan",
    amount: 10000 * 100, // 10,000 NGN in kobo
    tier: "pro",
  },
  premium: {
    name: "Premium Plan",
    amount: 50000 * 100, // 50,000 NGN in kobo
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

    // Use provided callbackUrl or fallback to default from environment
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

    // Upgrade user
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Set expiry to 30 days from now (simple monthly logic for now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    user.subscriptionTier = planType as "pro" | "premium";
    user.subscriptionStatus = "active";
    user.subscriptionExpiry = expiryDate;

    if (paymentData.customer && paymentData.customer.customer_code) {
      user.paystackCustomerCode = paymentData.customer.customer_code;
    }

    await user.save();

    // Send Subscription Success Email
    try {
      await sendEmail({
        to: user.email,
        subject: `Your WishCube ${planType.charAt(0).toUpperCase() + planType.slice(1)} Subscription is Active! 🚀`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px;">
            <h2 style="color: #6366f1;">Subscription Activated! 🎁</h2>
            <p>Hi ${user.name},</p>
            <p>Your upgrade to the <strong>${planType.toUpperCase()}</strong> plan was successful. You now have full access to all premium features!</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Plan:</strong> ${planType.toUpperCase()}</p>
              <p style="margin: 5px 0;"><strong>Expiry Date:</strong> ${expiryDate.toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> Active</p>
            </div>
            <p>With your new plan, you can now:</p>
            <ul>
              <li>Create unlimited celebration websites</li>
              <li>Use custom slugs for your links</li>
              <li>Password protect your pages</li>
              <li>Access advanced AI messaging tools</li>
            </ul>
            <a href="${process.env.CLIENT_URL}/dashboard" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Start Creating</a>
            <p>Thank you for being a part of WishCube!</p>
            <p>Cheers,<br>The WishCube Team</p>
          </div>
        `,
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
