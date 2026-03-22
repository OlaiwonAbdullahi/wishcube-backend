import express, { Request, Response } from "express";
import User from "../model/User";
import { protect } from "../middleware/authMiddleware";
import {
  initializePaystackPayment,
  verifyPaystackPayment,
} from "../utils/paystack";
import { asyncHandler, AppError } from "../utils/errorHandler";

const router = express.Router();

// @desc    Get wallet balance
// @route   GET /api/wallet/balance
// @access  Private
router.get(
  "/balance",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findById(req.user?._id);
    res.status(200).json({
      success: true,
      message: "Wallet balance retrieved successfully",
      data: {
        walletBalance: (user as any).walletBalance || 0,
      },
    });
  })
);

// @desc    Initialize wallet funding
// @route   POST /api/wallet/fund
// @access  Private
router.post(
  "/fund",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { amount } = req.body;

    if (!amount || amount < 100) {
      throw new AppError("Minimum funding amount is ₦100", 400);
    }

    const paystackData = await initializePaystackPayment({
      email: (req.user as any).email,
      amount: amount * 100, // Paystack works in kobo
      metadata: {
        userId: (req.user?._id as any).toString(),
        type: "wallet_funding",
      },
      callbackUrl: `${process.env.CLIENT_URL}/wallet/verify`,
    });

    res.status(200).json({
      success: true,
      message: "Funding initialized",
      data: {
        paymentUrl: paystackData.authorization_url,
        reference: paystackData.reference,
      },
    });
  })
);

// @desc    Verify wallet funding
// @route   POST /api/wallet/verify
// @access  Private
router.post(
  "/verify",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { reference } = req.body;

    if (!reference) {
      throw new AppError("Payment reference is required", 400);
    }

    const verification = await verifyPaystackPayment(reference);

    if (verification.status !== "success") {
      throw new AppError("Payment verification failed", 400);
    }

    // Check if it's a wallet funding transaction
    if (verification.metadata?.type !== "wallet_funding") {
      throw new AppError("Invalid transaction type", 400);
    }

    const amount = verification.amount / 100; // Convert kobo to NGN
    const user = await User.findById(req.user?._id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    (user as any).walletBalance = ((user as any).walletBalance || 0) + amount;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Wallet funded successfully",
      data: {
        newBalance: (user as any).walletBalance,
      },
    });
  })
);

export default router;
