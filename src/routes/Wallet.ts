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
      html: `
       <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Wallet Funded – WishCube</title>
</head>

<body style="margin:0;padding:0;background:#F3F3F3;font-family:'Segoe UI',Arial,sans-serif;">

    <!-- Outer wrapper -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;padding:40px 16px;">
        <tr>
            <td align="center">

                <!-- Card shell — neo-brutalist: white bg, thick dark border, bottom-heavy shadow -->
                <table width="560" cellpadding="0" cellspacing="0"
                    style="background:#ffffff;border:2px solid #191A23;border-bottom:5px solid #191A23;box-shadow:4px 4px 0px 0px rgba(25,26,35,0.15);max-width:560px;width:100%;">

                    <!-- ── HEADER ───────────────────────────────────────── -->
                    <tr>
                        <td style="background:#191A23;padding:32px 40px;text-align:center;">
                            <!-- Logo / brand mark -->
                            <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">WishCube</p>
                            <!-- Icon badge -->
                            <div style="display:inline-block;background:#E6D1FF;border:2px solid #ffffff;width:52px;height:52px;line-height:52px;text-align:center;font-size:24px;margin-bottom:16px;">
                                💰
                            </div>
                            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">
                                Wallet Funded!
                            </h1>
                            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">
                                Your WishCube wallet has been topped up
                            </p>
                        </td>
                    </tr>

                    <!-- ── BODY ────────────────────────────────────────── -->
                    <tr>
                        <td style="padding:32px 40px;background:#ffffff;">

                            <!-- Greeting -->
                            <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">
                                Hi ${(user as any).name || "there"},
                            </p>
                            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
                                We've successfully credited your WishCube wallet. Here's a summary of the transaction:
                            </p>

                            <!-- ── Transaction summary card ───────────── -->
                            <table width="100%" cellpadding="0" cellspacing="0"
                                style="background:#F3F3F3;border:2px solid #191A23;border-bottom:4px solid #191A23;margin-bottom:28px;">
                                <tr>
                                    <td style="padding:24px;">

                                        <!-- Section label -->
                                        <p style="margin:0 0 16px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#191A23;">
                                            Transaction Details
                                        </p>

                                        <!-- Row: Amount Funded -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                                            <tr>
                                                <td style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#52525b;">
                                                    Amount Funded
                                                </td>
                                                <td align="right" style="font-size:18px;font-weight:800;color:#191A23;">
                                                    ₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </table>
                                        <div style="border-top:1px solid #D4D4D8;margin-bottom:12px;"></div>

                                        <!-- Row: New Balance -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                                            <tr>
                                                <td style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#52525b;">
                                                    New Balance
                                                </td>
                                                <td align="right" style="font-size:15px;font-weight:700;color:#16a34a;">
                                                    ₦${newBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </table>
                                        <div style="border-top:1px solid #D4D4D8;margin-bottom:12px;"></div>

                                        <!-- Row: Reference -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                                            <tr>
                                                <td style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#52525b;">
                                                    Reference
                                                </td>
                                                <td align="right" style="font-size:12px;font-family:monospace;color:#191A23;word-break:break-all;">
                                                    ${reference}
                                                </td>
                                            </tr>
                                        </table>
                                        <div style="border-top:1px solid #D4D4D8;margin-bottom:12px;"></div>

                                        <!-- Row: Date & Time -->
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#52525b;">
                                                    Date &amp; Time
                                                </td>
                                                <td align="right" style="font-size:13px;color:#191A23;">
                                                    ${fundedAt}
                                                </td>
                                            </tr>
                                        </table>

                                    </td>
                                </tr>
                            </table>
                            <!-- ─────────────────────────────────────────── -->

                            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
                                You can now use your wallet balance to purchase gifts, send cards, and more on WishCube.
                            </p>

                            <!-- CTA button — solid, neo-brutalist style -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="${process.env.CLIENT_URL}/dashboard/wallet"
                                            style="display:inline-block;background:#191A23;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:14px 36px;border:2px solid #191A23;border-bottom:4px solid #000000;box-shadow:3px 3px 0px 0px rgba(0,0,0,0.2);">
                                            View My Wallet →
                                        </a>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    <!-- ── FOOTER ──────────────────────────────────────── -->
                    <tr>
                        <td style="padding:20px 40px;background:#F3F3F3;border-top:2px solid #191A23;text-align:center;">
                            <p style="margin:0 0 6px;color:#52525b;font-size:12px;line-height:1.6;">
                                If you did not initiate this transaction, please
                                <a href="mailto:support@usewishcube.com"
                                    style="color:#191A23;font-weight:700;text-decoration:underline;">contact support</a> immediately.
                            </p>
                            <p style="margin:0;color:#a1a1aa;font-size:11px;">
                                &copy; ${new Date().getFullYear()} WishCube. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
                <!-- /card shell -->

            </td>
        </tr>
    </table>

</body>

</html>
      `,
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
