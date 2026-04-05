import express, { Request, Response } from "express";
import crypto from "crypto";
import Gift from "../model/Gift";
import User from "../model/User";
import WalletTransaction from "../model/WalletTransaction";
import { sendEmail } from "../utils/email";
import { walletFundedTemplate } from "../utils/emailTemplates";

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
              html: walletFundedTemplate(
                user.name,
                amountInNaira,
                balanceAfter,
                `${process.env.CLIENT_URL}/dashboard/wallet`,
              ),
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
