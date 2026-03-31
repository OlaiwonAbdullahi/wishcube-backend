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
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">WishCube Premium</p>
            <div style="display:inline-block;background:#E6D1FF;border:2px solid #fff;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;margin-bottom:14px;">🚀</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Subscription Active!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">Welcome to the ${planType.toUpperCase()} experience</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;background:#ffffff;">
            <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${user.name},</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
              Your upgrade to the <strong>${planType.toUpperCase()}</strong> plan was successful. You now have full access to all premium features!
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;border:2px solid #191A23;margin-bottom:28px;">
              <tr>
                <td style="padding:24px;">
                  <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#191A23;">Plan Summary</p>
                  <p style="margin:0 0 5px;font-size:14px;color:#191A23;"><strong>Tier:</strong> ${planType.toUpperCase()}</p>
                  <p style="margin:0 0 5px;font-size:14px;color:#191A23;"><strong>Expiry:</strong> ${expiryDate.toLocaleDateString()}</p>
                  <p style="margin:0;font-size:14px;color:#191A23;"><strong>Status:</strong> Active</p>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 12px;color:#191A23;font-size:14px;font-weight:700;">Your Premium Perks:</p>
            <ul style="margin:0 0 28px;padding-left:20px;color:#52525b;font-size:13px;line-height:1.8;">
              <li>Create unlimited celebration websites</li>
              <li>Use custom slugs for your links</li>
              <li>Password protect your pages</li>
              <li>Access advanced AI messaging tools</li>
            </ul>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${process.env.CLIENT_URL}/dashboard"
                  style="display:inline-block;background:#191A23;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:14px 36px;border:2px solid #191A23;border-bottom:4px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.2);">
                  Start Creating &rarr;
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
