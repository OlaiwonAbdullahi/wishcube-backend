import express, { Request, Response } from "express";
import Waitlist from "../model/Waitlist";
import { asyncHandler, AppError } from "../utils/errorHandler";

const router = express.Router();

// POST /api/waitlist
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, name } = req.body;

    if (!email || !name) {
      throw new AppError("Please provide both name and email", 400);
    }

    const waitlist = new Waitlist({ email, name });
    await waitlist.save();

    res.status(201).json({
      success: true,
      message: "Successfully signed up to the waitlist",
      data: { waitlist },
    });
  })
);

// GET /api/waitlist to get all waitlist
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const waitlist = await Waitlist.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Waitlist retrieved successfully",
      data: {
        total: waitlist.length,
        waitlist,
      },
    });
  })
);

// GET /api/waitlist/count to get the total number of waitlist
router.get(
  "/count",
  asyncHandler(async (req: Request, res: Response) => {
    const count = await Waitlist.countDocuments();
    res.status(200).json({
      success: true,
      message: "Waitlist count retrieved successfully",
      data: { count },
    });
  })
);

export default router;
