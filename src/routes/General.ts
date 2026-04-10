import express, { Request, Response } from "express";
import { getBankList, resolveAccountNumber } from "../utils/paystack";
import { asyncHandler, AppError } from "../utils/errorHandler";

const router = express.Router();

// @desc    Get list of supported Nigerian banks from Paystack
// @route   GET /api/general/banks
// @access  Public
router.get(
  "/banks",
  asyncHandler(async (req: Request, res: Response) => {
    const banks = await getBankList();

    res.status(200).json({
      success: true,
      message: "Banks successfully retrieved",
      data: {
        total: banks.length,
        banks,
      },
    });
  }),
);

// @desc    Resolve a Nigerian bank account number
// @route   GET /api/general/resolve-account
// @access  Public
router.get(
  "/resolve-account",
  asyncHandler(async (req: Request, res: Response) => {
    const { accountNumber, bankCode } = req.query;

    if (!accountNumber || !bankCode) {
      throw new AppError("Account number and bank code are required", 400);
    }

    const accountDetails = await resolveAccountNumber(
      accountNumber as string,
      bankCode as string,
    );

    res.status(200).json({
      success: true,
      message: "Account details successfully resolved",
      data: accountDetails,
    });
  }),
);

export default router;
