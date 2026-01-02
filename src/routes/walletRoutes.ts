import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  getBalance,
  fundWallet,
  verifyWalletPayment,
  paystackWebhook,
  getTransactions,
} from "../controllers/walletController";
import { fundWalletValidator, paginationValidator } from "../utils/validators";

const router = Router();

// Paystack webhook (no auth)
router.post("/webhook", paystackWebhook);

// Protected routes
router.use(auth);

router.get("/balance", getBalance);
router.post("/fund", fundWalletValidator, fundWallet);
router.get("/verify", verifyWalletPayment);
router.get("/transactions", paginationValidator, getTransactions);

export default router;
