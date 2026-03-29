import express, { Request, Response } from "express";
import { getBankList } from "../utils/paystack";
import { asyncHandler } from "../utils/errorHandler";

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
      message: "Banks retrieved successfully",
      data: {
        total: banks.length,
        banks,
      },
    });
  })
);

export default router;
