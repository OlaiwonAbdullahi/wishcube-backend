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

    const total = await WalletTransaction.countDocuments({ user: req.user?._id });

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
          <title>Wallet Funded</title>
        </head>
        <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
            <tr>
              <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#6366f1,#a855f7);padding:32px 40px;text-align:center;">
                      <p style="margin:0 0 8px;font-size:28px;">💰</p>
                      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Wallet Funded!</h1>
                      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Your WishCube wallet has been topped up</p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:32px 40px;">
                      <p style="margin:0 0 24px;color:#cbd5e1;font-size:15px;">Hi <strong style="color:#f8fafc;">${(user as any).name || "there"}</strong>,</p>
                      <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">We've successfully credited your WishCube wallet. Here's a summary of the transaction:</p>

                      <!-- Transaction card -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;border:1px solid rgba(255,255,255,0.06);margin-bottom:24px;">
                        <tr>
                          <td style="padding:20px 24px;">
                            <table width="100%" cellpadding="0" cellspacing="8">
                              <tr>
                                <td style="color:#64748b;font-size:13px;">Amount Funded</td>
                                <td align="right" style="color:#4ade80;font-size:16px;font-weight:700;">₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td>
                              </tr>
                              <tr><td colspan="2" style="border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;"></td></tr>
                              <tr>
                                <td style="color:#64748b;font-size:13px;">New Balance</td>
                                <td align="right" style="color:#f8fafc;font-size:15px;font-weight:600;">₦${newBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td>
                              </tr>
                              <tr><td colspan="2" style="border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;"></td></tr>
                              <tr>
                                <td style="color:#64748b;font-size:13px;">Reference</td>
                                <td align="right" style="color:#94a3b8;font-size:13px;font-family:monospace;">${reference}</td>
                              </tr>
                              <tr><td colspan="2" style="border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;"></td></tr>
                              <tr>
                                <td style="color:#64748b;font-size:13px;">Date &amp; Time</td>
                                <td align="right" style="color:#94a3b8;font-size:13px;">${fundedAt}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">You can now use your wallet balance to purchase gifts, and more on WishCube.</p>

                      <div style="text-align:center;">
                        <a href="${process.env.CLIENT_URL}/dashboard/wallet" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;">View Wallet</a>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
                      <p style="margin:0;color:#475569;font-size:12px;">If you did not initiate this transaction, please <a href="mailto:support@usewishcube.com" style="color:#6366f1;text-decoration:none;">contact support</a> immediately.</p>
                      <p style="margin:8px 0 0;color:#334155;font-size:11px;">&copy; ${new Date().getFullYear()} WishCube. All rights reserved.</p>
                    </td>
                  </tr>

                </table>
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
