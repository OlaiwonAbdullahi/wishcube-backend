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
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "")
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.body;

  try {
    if (event.event === "charge.success") {
      const data = event.data;
      const { reference, metadata, amount, customer } = data;
      const amountInNaira = amount / 100;
      console.log(`💰 Webhook received: ${metadata?.type} | Ref: ${reference}`);
      if (metadata?.type === "gift" && metadata?.giftId) {
        const gift = await Gift.findById(metadata.giftId);
        if (gift && gift.paymentReference !== reference) {
          gift.status = "pending";
          gift.paymentReference = reference;
          gift.escrowStatus = "holding";
          await gift.save();
          console.log(`Gift ${metadata.giftId} verified via webhook`);
        }
      } else if (metadata?.type === "wallet_funding" && metadata?.userId) {
        const user = await User.findById(metadata.userId);
        if (user) {
          const existingTransaction = await WalletTransaction.findOne({
            reference,
          });
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
              description: "Wallet funding via Paystack",
              status: "success",
            });
            (user as any).walletBalance = balanceAfter;
            await user.save();
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
</html>`,
            }).catch(console.error);
            console.log(`✅ Wallet of user ${user.email} funded via webhook`);
          }
        }
      } else if (
        metadata?.type === "subscription_upgrade" &&
        metadata?.userId
      ) {
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
          console.log(
            `User ${user.email} upgraded to ${metadata.planType} via webhook`,
          );
        }
      }
    }
    if (
      event.event === "transfer.success" ||
      event.event === "transfer.reversed" ||
      event.event === "transfer.failed"
    ) {
      const gift = await Gift.findOne({
        payoutReference: event.data.reference,
      });
      if (gift) {
        if (event.event === "transfer.success") {
          gift.payoutStatus = "completed";
          console.log(`Payout completed for Gift: ${gift._id}`);
        } else {
          gift.payoutStatus = "failed";
          console.log(`Payout failed/reversed for Gift: ${gift._id}`);
        }
        await gift.save();
      }
    }
  } catch (error) {
    console.error("Webhook error:", error);
  }
  res.status(200).send("Webhook received");
});

export default router;
