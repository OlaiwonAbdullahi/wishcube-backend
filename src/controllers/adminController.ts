import { Response } from "express";
import { validationResult } from "express-validator";
import User from "../models/User";
import Card from "../models/Card";
import Website from "../models/Website";
import Event from "../models/Event";
import Gift from "../models/Gift";
import Wallet from "../models/Wallet";
import GiftBox from "../models/GiftBox";
import { AuthRequest } from "../types";
import {
  getPagination,
  formatPaginatedResponse,
  sanitizeUser,
} from "../utils/helpers";

// Get Admin Stats
export const getAdminStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const [
      totalUsers,
      totalCards,
      totalWebsites,
      totalEvents,
      totalGifts,
      totalGiftBoxes,
    ] = await Promise.all([
      User.countDocuments(),
      Card.countDocuments(),
      Website.countDocuments(),
      Event.countDocuments(),
      Gift.countDocuments(),
      GiftBox.countDocuments(),
    ]);

    // Calculate total revenue from wallet transactions
    const revenueData = await Wallet.aggregate([
      { $unwind: "$transactions" },
      {
        $match: {
          "transactions.type": "credit",
          "transactions.status": "completed",
        },
      },
      { $group: { _id: null, total: { $sum: "$transactions.amount" } } },
    ]);

    // Get recent signups
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("firstName lastName email createdAt");

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalCards,
          totalWebsites,
          totalEvents,
          totalGifts,
          totalGiftBoxes,
          totalRevenue: revenueData[0]?.total || 0,
        },
        recentUsers,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch admin stats." });
  }
};

// Get All Users
export const getAllUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { skip } = getPagination(page, limit);
    const search = req.query.search as string;

    let query: any = {};
    if (search) {
      query = {
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-password"),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      ...formatPaginatedResponse(users, total, page, limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch users." });
  }
};

// Get User by ID
export const getUserById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    // Get user stats
    const [cardsCount, websitesCount, eventsCount, wallet] = await Promise.all([
      Card.countDocuments({ userId: user._id }),
      Website.countDocuments({ userId: user._id }),
      Event.countDocuments({ userId: user._id }),
      Wallet.findOne({ userId: user._id }),
    ]);

    res.json({
      success: true,
      data: {
        user,
        stats: {
          cards: cardsCount,
          websites: websitesCount,
          events: eventsCount,
          walletBalance: wallet?.balance || 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch user." });
  }
};

// Update User Role
export const updateUserRole = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      res.status(400).json({ success: false, message: "Invalid role." });
      return;
    }

    // Prevent changing own role
    if (req.params.id === req.user!._id.toString()) {
      res
        .status(400)
        .json({ success: false, message: "Cannot change your own role." });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.json({
      success: true,
      message: "User role updated.",
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update role." });
  }
};

// Disable User
export const disableUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Prevent disabling self
    if (req.params.id === req.user!._id.toString()) {
      res
        .status(400)
        .json({ success: false, message: "Cannot disable your own account." });
      return;
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    // Clean up user data
    await Promise.all([
      Card.deleteMany({ userId: user._id }),
      Website.deleteMany({ userId: user._id }),
      Event.deleteMany({ userId: user._id }),
      Wallet.deleteOne({ userId: user._id }),
      GiftBox.deleteMany({ senderId: user._id }),
    ]);

    res.json({ success: true, message: "User disabled and data deleted." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to disable user." });
  }
};

// Create Gift (Admin)
export const createGift = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, description, type, value, price, image, isActive, stock } =
      req.body;

    const gift = await Gift.create({
      name,
      description,
      type,
      value,
      price,
      image,
      isActive,
      stock,
    });

    res.status(201).json({
      success: true,
      message: "Gift created successfully.",
      data: gift,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create gift." });
  }
};

// Update Gift (Admin)
export const updateGift = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, description, type, value, price, image, isActive, stock } =
      req.body;

    const gift = await Gift.findByIdAndUpdate(
      req.params.id,
      { name, description, type, value, price, image, isActive, stock },
      { new: true, runValidators: true }
    );

    if (!gift) {
      res.status(404).json({ success: false, message: "Gift not found." });
      return;
    }

    res.json({
      success: true,
      message: "Gift updated successfully.",
      data: gift,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update gift." });
  }
};

// Delete Gift (Admin)
export const deleteGift = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const gift = await Gift.findByIdAndDelete(req.params.id);

    if (!gift) {
      res.status(404).json({ success: false, message: "Gift not found." });
      return;
    }

    res.json({ success: true, message: "Gift deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete gift." });
  }
};

// Get All Gifts (Admin)
export const getAllGifts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { skip } = getPagination(page, limit);

    const [gifts, total] = await Promise.all([
      Gift.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Gift.countDocuments(),
    ]);

    res.json({
      success: true,
      ...formatPaginatedResponse(gifts, total, page, limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch gifts." });
  }
};

// Get System Analytics (Admin)
export const getSystemAnalytics = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Users over time
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Cards created over time
    const cardGrowth = await Card.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Revenue over time
    const revenueGrowth = await Wallet.aggregate([
      { $unwind: "$transactions" },
      {
        $match: {
          "transactions.type": "credit",
          "transactions.status": "completed",
          "transactions.createdAt": { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$transactions.createdAt",
            },
          },
          amount: { $sum: "$transactions.amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Popular occasions
    const popularOccasions = await Card.aggregate([
      { $group: { _id: "$occasion", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        userGrowth,
        cardGrowth,
        revenueGrowth,
        popularOccasions,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch analytics." });
  }
};
