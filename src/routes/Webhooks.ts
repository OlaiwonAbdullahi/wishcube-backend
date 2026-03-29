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
              html: `<p>Hi ${user.name}, your wallet has been credited with ₦${amountInNaira.toLocaleString()}. Your new balance is ₦${balanceAfter.toLocaleString()}.</p>`
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
