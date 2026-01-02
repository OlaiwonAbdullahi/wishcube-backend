import { Response } from "express";
import Card from "../models/Card";
import Website from "../models/Website";
import Event from "../models/Event";
import Wallet from "../models/Wallet";
import GiftBox from "../models/GiftBox";
import { AuthRequest } from "../types";
import {
  generateGreeting,
  suggestDesign,
  getRecommendations,
} from "../services/aiService";

// Get Dashboard Stats
export const getDashboardStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!._id;

    const [cardsCount, websitesCount, eventsCount, wallet, giftBoxesSent] =
      await Promise.all([
        Card.countDocuments({ userId }),
        Website.countDocuments({ userId }),
        Event.countDocuments({ userId }),
        Wallet.findOne({ userId }),
        GiftBox.countDocuments({ senderId: userId }),
      ]);

    // Get total views
    const [cardViews, websiteViews] = await Promise.all([
      Card.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: "$viewCount" } } },
      ]),
      Website.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: "$viewCount" } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        cards: cardsCount,
        websites: websitesCount,
        events: eventsCount,
        giftBoxesSent,
        walletBalance: wallet?.balance || 0,
        totalViews: (cardViews[0]?.total || 0) + (websiteViews[0]?.total || 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch stats." });
  }
};

// Get Recent Activity
export const getRecentActivity = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const limit = 5;

    const [recentCards, recentWebsites, recentEvents] = await Promise.all([
      Card.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("title occasion createdAt isPublished"),
      Website.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("title subdomain createdAt isPublished"),
      Event.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("title eventType date createdAt"),
    ]);

    res.json({
      success: true,
      data: {
        recentCards,
        recentWebsites,
        recentEvents,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch activity." });
  }
};

// AI: Generate Greeting
export const aiGenerateGreeting = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      occasion,
      recipientName,
      senderName,
      relationship,
      tone,
      additionalContext,
    } = req.body;

    if (!occasion) {
      res
        .status(400)
        .json({ success: false, message: "Occasion is required." });
      return;
    }

    const greeting = await generateGreeting({
      occasion,
      recipientName,
      senderName,
      relationship,
      tone,
      additionalContext,
    });

    res.json({
      success: true,
      data: { greeting },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to generate greeting." });
  }
};

// AI: Suggest Design
export const aiSuggestDesign = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { occasion } = req.body;

    if (!occasion) {
      res
        .status(400)
        .json({ success: false, message: "Occasion is required." });
      return;
    }

    const design = await suggestDesign(occasion);

    res.json({
      success: true,
      data: { design },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to suggest design." });
  }
};

// AI: Get Recommendations
export const aiGetRecommendations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { occasion } = req.body;

    if (!occasion) {
      res
        .status(400)
        .json({ success: false, message: "Occasion is required." });
      return;
    }

    // Get user history for personalized recommendations
    const userId = req.user!._id;
    const [cards, websites] = await Promise.all([
      Card.find({ userId }).select("occasion").limit(10),
      Website.find({ userId }).select("occasion theme").limit(10),
    ]);

    const userHistory = {
      occasions: [
        ...cards.map((c) => c.occasion),
        ...websites.map((w) => w.occasion),
      ],
      themes: websites.map((w) => w.theme).filter(Boolean),
    };

    const recommendations = await getRecommendations(occasion, userHistory);

    res.json({
      success: true,
      data: { recommendations },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to get recommendations." });
  }
};
