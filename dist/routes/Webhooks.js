"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const Gift_1 = __importDefault(require("../model/Gift"));
const User_1 = __importDefault(require("../model/User"));
const WalletTransaction_1 = __importDefault(require("../model/WalletTransaction"));
const email_1 = require("../utils/email");
const emailTemplates_1 = require("../utils/emailTemplates");
const router = express_1.default.Router();
/**
 * @desc    Handle Paystack Webhooks
 * @route   POST /api/webhooks/paystack
 * @access  Public (Signature Verified)
 */
router.post("/paystack", async (req, res) => {
    const hash = crypto_1.default
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
                const gift = await Gift_1.default.findById(metadata.giftId);
                if (gift && gift.paymentReference !== reference) {
                    gift.status = "pending";
                    gift.paymentReference = reference;
                    gift.escrowStatus = "holding";
                    await gift.save();
                    console.log(`Gift ${metadata.giftId} verified via webhook`);
                }
            }
            else if (metadata?.type === "wallet_funding" && metadata?.userId) {
                const user = await User_1.default.findById(metadata.userId);
                if (user) {
                    const existingTransaction = await WalletTransaction_1.default.findOne({
                        reference,
                    });
                    if (!existingTransaction) {
                        const balanceBefore = user.walletBalance || 0;
                        const balanceAfter = balanceBefore + amountInNaira;
                        await WalletTransaction_1.default.create({
                            user: user._id,
                            type: "credit",
                            amount: amountInNaira,
                            balanceBefore,
                            balanceAfter,
                            reference,
                            description: "Wallet funding via Paystack",
                            status: "success",
                        });
                        user.walletBalance = balanceAfter;
                        await user.save();
                        (0, email_1.sendEmail)({
                            to: user.email,
                            subject: "Wallet Funded Successfully – WishCube",
                            html: (0, emailTemplates_1.walletFundedTemplate)(user.name, amountInNaira, balanceAfter, `${process.env.CLIENT_URL}/dashboard/wallet`),
                        }).catch(console.error);
                        console.log(`✅ Wallet of user ${user.email} funded via webhook`);
                    }
                }
            }
            else if (metadata?.type === "subscription_upgrade" &&
                metadata?.userId) {
                const user = await User_1.default.findById(metadata.userId);
                if (user && user.subscriptionTier !== metadata.planType) {
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + 30);
                    user.subscriptionTier = metadata.planType;
                    user.subscriptionStatus = "active";
                    user.subscriptionExpiry = expiryDate;
                    if (customer?.customer_code) {
                        user.paystackCustomerCode = customer.customer_code;
                    }
                    await user.save();
                    console.log(`User ${user.email} upgraded to ${metadata.planType} via webhook`);
                }
            }
        }
        if (event.event === "transfer.success" ||
            event.event === "transfer.reversed" ||
            event.event === "transfer.failed") {
            const gift = await Gift_1.default.findOne({
                payoutReference: event.data.reference,
            });
            if (gift) {
                if (event.event === "transfer.success") {
                    gift.payoutStatus = "completed";
                    console.log(`Payout completed for Gift: ${gift._id}`);
                }
                else {
                    gift.payoutStatus = "failed";
                    console.log(`Payout failed/reversed for Gift: ${gift._id}`);
                }
                await gift.save();
            }
        }
    }
    catch (error) {
        console.error("Webhook error:", error);
    }
    res.status(200).send("Webhook received");
});
exports.default = router;
