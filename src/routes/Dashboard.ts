import express, { Request, Response } from "express";
import Card from "../model/Card";
import Website from "../model/Website";
import Gift from "../model/Gift";
import User from "../model/User";
import { protect } from "../middleware/authMiddleware";
import { asyncHandler } from "../utils/errorHandler";

const router = express.Router();

// @desc    Get dashboard overview stats and recent works
// @route   GET /api/dashboard/overview
// @access  Private
router.get(
  "/overview",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    // Fetch stats in parallel
    const [cardsCount, websitesCount, giftsCount, user] = await Promise.all([
      Card.countDocuments({ userId }),
      Website.countDocuments({ userId }),
      Gift.countDocuments({ senderId: userId }),
      User.findById(userId).select("walletBalance"),
    ]);

    // Fetch recent works in parallel
    const [recentWebsites, recentCards] = await Promise.all([
      Website.find({ userId })
        .sort({ createdAt: -1 })
        .limit(4)
        .select("recipientName occasion status slug publicUrl createdAt"),
      Card.find({ userId })
        .sort({ createdAt: -1 })
        .limit(4)
        .select("recipientName occasion status theme createdAt"),
    ]);

    res.status(200).json({
      success: true,
      message: "Dashboard overview retrieved successfully",
      data: {
        stats: {
          cardsCount,
          websitesCount,
          giftsCount,
          walletBalance: user?.walletBalance || 0,
        },
        recentWorks: {
          websites: recentWebsites,
          cards: recentCards,
        },
      },
    });
  }),
);

export default router;
