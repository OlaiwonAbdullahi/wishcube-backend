import express, { Request, Response } from "express";
import crypto from "crypto";
import Gift from "../model/Gift";
import User from "../model/User";
import WalletTransaction from "../model/WalletTransaction";
import { sendEmail } from "../utils/email";

const router = express.Router();

/**
 * @desc    Handle Paystack Webhooks
 * @route   POST /api/webhooks/paystack
 * @access  Public (Signature Verified)
 */
router.post("/paystack", async (req: Request, res: Response) => {
  // 1. Verify Paystack Signature
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "")
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.body;

  // 2. Handle only successful charges
  if (event.event === "charge.success") {
    const data = event.data;
    const { reference, metadata, amount, customer } = data;
    const amountInNaira = amount / 100;

    console.log(`💰 Webhook received: ${metadata?.type} | Ref: ${reference}`);

    try {
      // CASE 1: GIFT PURCHASE
      if (metadata?.type === "gift" && metadata?.giftId) {
        const gift = await Gift.findById(metadata.giftId);
        // We only process if paymentReference ISN'T already set to this ref
        if (gift && gift.paymentReference !== reference) {
          gift.status = "pending"; 
          gift.paymentReference = reference;
          gift.escrowStatus = "holding";
          await gift.save();

          console.log(`✅ Gift ${metadata.giftId} verified via webhook`);

          // Optional: Send email from webhook if you want to be extra safe
          // but we usually let the frontend verification handle it if the user is still there.
        }
      }

      // CASE 2: WALLET FUNDING
      else if (metadata?.type === "wallet_funding" && metadata?.userId) {
        const user = await User.findById(metadata.userId);
        if (user) {
          // Check if transaction already exists to avoid double-crediting
          const existingTransaction = await WalletTransaction.findOne({ reference });
          
          if (!existingTransaction) {
            const balanceBefore = (user as any).walletBalance || 0;
            const balanceAfter = balanceBefore + amountInNaira;

            await WalletTransaction.create({
              user: user._id,
              type: "credit",
              amount: amountInNaira,
              balanceBefore,
              balanceAfter,
              reference,
              description: "Wallet funding via Paystack (Webhook)",
              status: "success",
            });

            (user as any).walletBalance = balanceAfter;
            await user.save();

            // Notify user
            sendEmail({
              to: user.email,
              subject: "Wallet Funded Successfully – WishCube",
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
            <div style="display:inline-block;background:#E6D1FF;border:2px solid #fff;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;margin-bottom:14px;">💰</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Wallet Funded!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">Your account has been credited</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;background:#ffffff;">
            <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${user.name},</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
              Your wallet has been successfully credited via Paystack. You can now use your balance to celebrate your loved ones!
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;border:2px solid #191A23;margin-bottom:28px;">
              <tr>
                <td style="padding:24px;">
                  <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#191A23;">Summary</p>
                  <p style="margin:0 0 5px;font-size:16px;color:#191A23;"><strong>Amount:</strong> ₦${amountInNaira.toLocaleString()}</p>
                  <p style="margin:0;font-size:14px;color:#52525b;"><strong>New Balance:</strong> ₦${balanceAfter.toLocaleString()}</p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${process.env.CLIENT_URL}/dashboard/wallet"
                  style="display:inline-block;background:#191A23;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:14px 36px;border:2px solid #191A23;border-bottom:4px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.2);">
                  View Wallet &rarr;
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
</html>`
            }).catch(console.error);

            console.log(`✅ Wallet of user ${user.email} funded via webhook`);
          }
        }
      }

      // CASE 3: SUBSCRIPTION UPGRADE
      else if (metadata?.type === "subscription_upgrade" && metadata?.userId) {
        const user = await User.findById(metadata.userId);
        if (user && user.subscriptionTier !== metadata.planType) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);

          user.subscriptionTier = metadata.planType;
          user.subscriptionStatus = "active";
          user.subscriptionExpiry = expiryDate;
          
          if (customer?.customer_code) {
             (user as any).paystackCustomerCode = customer.customer_code;
          }

          await user.save();
          console.log(`✅ User ${user.email} upgraded to ${metadata.planType} via webhook`);
        }
      }
    } catch (error) {
      console.error("❌ Webhook error:", error);
      // We still return 200 to Paystack to stop retries, but log the error internally
    }
  }

  // Always return 200 to Paystack to acknowledge receipt
  res.status(200).send("Webhook received");
});

export default router;
