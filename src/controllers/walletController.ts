import { Response } from "express";
import { validationResult } from "express-validator";
import Wallet from "../models/Wallet";
import { AuthRequest } from "../types";
import { getPagination, formatPaginatedResponse } from "../utils/helpers";
import {
  initializePayment,
  verifyPayment,
  verifyWebhookSignature,
  generatePaymentReference,
} from "../services/paymentService";

// Get or Create Wallet
const getOrCreateWallet = async (userId: string) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId });
  }
  return wallet;
};

// Get Wallet Balance
export const getBalance = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const wallet = await getOrCreateWallet(req.user!._id.toString());

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        currency: wallet.currency,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get balance." });
  }
};

// Fund Wallet (Initialize Payment)
export const fundWallet = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { amount } = req.body;
    const wallet = await getOrCreateWallet(req.user!._id.toString());

    const reference = generatePaymentReference();

    // Add pending transaction
    wallet.transactions.push({
      type: "credit",
      amount,
      reference,
      description: "Wallet funding",
      status: "pending",
      createdAt: new Date(),
    });
    await wallet.save();

    // Initialize Paystack payment
    const paymentData = await initializePayment(
      req.user!.email,
      amount,
      reference
    );

    res.json({
      success: true,
      message: "Payment initialized.",
      data: {
        authorizationUrl: paymentData.authorization_url,
        reference: paymentData.reference,
      },
    });
  } catch (error) {
    console.error("Fund wallet error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to initialize payment." });
  }
};

// Verify Payment
export const verifyWalletPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { reference } = req.query;

    if (!reference || typeof reference !== "string") {
      res
        .status(400)
        .json({ success: false, message: "Reference is required." });
      return;
    }

    // Verify with Paystack
    const paymentData = await verifyPayment(reference);

    if (paymentData.status !== "success") {
      res.status(400).json({
        success: false,
        message: "Payment was not successful.",
      });
      return;
    }

    // Find wallet with this transaction
    const wallet = await Wallet.findOne({
      "transactions.reference": reference,
    });

    if (!wallet) {
      res
        .status(404)
        .json({ success: false, message: "Transaction not found." });
      return;
    }

    // Update transaction status
    const transaction = wallet.transactions.find(
      (t) => t.reference === reference
    );
    if (transaction && transaction.status === "pending") {
      transaction.status = "completed";
      wallet.balance += transaction.amount;
      await wallet.save();
    }

    res.json({
      success: true,
      message: "Payment verified successfully.",
      data: {
        balance: wallet.balance,
        amount: paymentData.amount / 100,
      },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to verify payment." });
  }
};

// Paystack Webhook
export const paystackWebhook = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const signature = req.headers["x-paystack-signature"] as string;
    const payload = JSON.stringify(req.body);

    if (!verifyWebhookSignature(payload, signature)) {
      res.status(400).json({ success: false, message: "Invalid signature." });
      return;
    }

    const { event, data } = req.body;

    if (event === "charge.success") {
      const { reference, amount } = data;

      const wallet = await Wallet.findOne({
        "transactions.reference": reference,
      });

      if (wallet) {
        const transaction = wallet.transactions.find(
          (t) => t.reference === reference
        );
        if (transaction && transaction.status === "pending") {
          transaction.status = "completed";
          wallet.balance += amount / 100;
          await wallet.save();
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ success: false });
  }
};

// Get Transactions
export const getTransactions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const wallet = await getOrCreateWallet(req.user!._id.toString());

    // Sort transactions by date descending and paginate
    const transactions = wallet.transactions
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      ...formatPaginatedResponse(
        transactions,
        wallet.transactions.length,
        page,
        limit
      ),
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to get transactions." });
  }
};
