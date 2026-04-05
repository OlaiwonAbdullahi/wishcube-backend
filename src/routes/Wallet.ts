import express, { Request, Response } from "express";
import User from "../model/User";
import WalletTransaction from "../model/WalletTransaction";
import { protect } from "../middleware/authMiddleware";
import {
  initializePaystackPayment,
  verifyPaystackPayment,
} from "../utils/paystack";
import { asyncHandler, AppError } from "../utils/errorHandler";
import { sendEmail } from "../utils/email";
import { walletFundedTemplate } from "../utils/emailTemplates";

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
  }),
);

// @desc    Get wallet transaction history
// @route   GET /api/wallet/transactions
// @access  Private
router.get(
  "/transactions",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const transactions = await WalletTransaction.find({ user: req.user?._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await WalletTransaction.countDocuments({
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
  }),
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
  }),
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

    const balanceBefore = (user as any).walletBalance || 0;
    const balanceAfter = balanceBefore + amount;

    // Create transaction record
    await WalletTransaction.create({
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

    (user as any).walletBalance = balanceAfter;
    await user.save();

    const newBalance: number = (user as any).walletBalance;
    const fundedAt = new Date().toLocaleString("en-NG", {
      timeZone: "Africa/Lagos",
      dateStyle: "long",
      timeStyle: "short",
    });

    // Send wallet funding confirmation email (non-blocking)
    sendEmail({
      to: (user as any).email,
      subject: "Wallet Funded Successfully – WishCube",
      html: walletFundedTemplate(
        (user as any).name,
        amount,
        newBalance,
        reference,
        fundedAt,
        `${process.env.CLIENT_URL}/dashboard/wallet`,
      ),
    }).catch((err) => console.error("Wallet funding email error:", err));

    res.status(200).json({
      success: true,
      message: "Wallet funded successfully",
      data: {
        newBalance,
      },
    });
  }),
);

export default router;
