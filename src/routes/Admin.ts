import express, { Request, Response } from "express";
import Product from "../model/Product";
import User from "../model/User";
import Card from "../model/Card";
import Website from "../model/Website";
import Vendor from "../model/Vendor";
import Order from "../model/Order";
import { getOrCreateSettings } from "../model/Settings";
import { protect, authorize } from "../middleware/authMiddleware";
import { asyncHandler, AppError } from "../utils/errorHandler";

const router = express.Router();

router.post(
  "/digital-gifts",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, price, description, images } = req.body;

    if (!name || !price) {
      throw new AppError("Name and price are required for digital gifts", 400);
    }

    const digitalGift = await Product.create({
      name,
      price,
      description,
      images: images || [],
      category: "Vouchers",
      isAvailable: true,
      // -1 is the "unlimited stock" sentinel: Infinity doesn't survive
      // JSON.stringify (it serializes to null), so a real number is needed.
      stock: -1,
    });

    res.status(201).json({
      success: true,
      message: "Digital gift created successfully",
      data: { digitalGift },
    });
  }),
);
router.get(
  "/digital-gifts",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const digitalGifts = await Product.find({ category: "Vouchers" }).sort(
      "-createdAt",
    );

    res.status(200).json({
      success: true,
      message: "Digital gifts retrieved successfully",
      data: {
        total: digitalGifts.length,
        digitalGifts,
      },
    });
  }),
);
router.delete(
  "/digital-gifts/:id",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const digitalGift = await Product.findOne({
      _id: req.params.id,
      category: "Vouchers",
    });

    if (!digitalGift) {
      throw new AppError("Digital gift not found", 404);
    }

    await digitalGift.deleteOne();

    res.status(200).json({
      success: true,
      message: "Digital gift deleted successfully",
      data: null,
    });
  }),
);

// @desc    Platform-wide overview stats for the admin dashboard
// @route   GET /api/admin/overview
// @access  Private/Admin
router.get(
  "/overview",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const [
      totalUsers,
      totalCards,
      totalWebsites,
      totalVendors,
      activeVendors,
      totalOrders,
    ] = await Promise.all([
      User.countDocuments(),
      Card.countDocuments(),
      Website.countDocuments(),
      Vendor.countDocuments(),
      Vendor.countDocuments({ status: "approved", isActive: true }),
      Order.countDocuments(),
    ]);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [newUsersThisWeek, newCardsThisWeek, newWebsitesThisWeek] =
      await Promise.all([
        User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
        Card.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
        Website.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      ]);

    // Daily counts for the last 7 days (oldest first) for simple charting.
    const dailySeries = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [users, cards, websites] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } }),
        Card.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } }),
        Website.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } }),
      ]);
      dailySeries.push({
        date: dayStart.toISOString().slice(0, 10),
        users,
        cards,
        websites,
      });
    }

    const [recentCards, recentWebsites] = await Promise.all([
      Card.find().sort("-createdAt").limit(5).populate("userId", "name"),
      Website.find().sort("-createdAt").limit(5).populate("userId", "name"),
    ]);

    const recentActivity = [
      ...recentCards.map((c: any) => ({
        type: "card",
        description: `${c.userId?.name || "Someone"} created a "${c.occasion}" card for ${c.recipientName}`,
        createdAt: c.createdAt,
      })),
      ...recentWebsites.map((w: any) => ({
        type: "website",
        description: `${w.userId?.name || "Someone"} created a "${w.occasion}" page for ${w.recipientName}`,
        createdAt: w.createdAt,
      })),
    ]
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 8);

    res.status(200).json({
      success: true,
      message: "Overview retrieved successfully",
      data: {
        totals: {
          totalUsers,
          totalCards,
          totalWebsites,
          totalVendors,
          activeVendors,
          totalOrders,
        },
        thisWeek: {
          newUsersThisWeek,
          newCardsThisWeek,
          newWebsitesThisWeek,
        },
        dailySeries,
        recentActivity,
      },
    });
  }),
);

// @desc    Admin: list all cards on the platform
// @route   GET /api/admin/cards
// @access  Private/Admin
router.get(
  "/cards",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const cards = await Card.find()
      .sort("-createdAt")
      .limit(200)
      .populate("userId", "name email");

    res.status(200).json({
      success: true,
      message: "Cards retrieved successfully",
      data: { total: cards.length, cards },
    });
  }),
);

// @desc    Admin: list all celebration websites on the platform
// @route   GET /api/admin/websites
// @access  Private/Admin
router.get(
  "/websites",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const websites = await Website.find()
      .sort("-createdAt")
      .limit(200)
      .populate("userId", "name email");

    res.status(200).json({
      success: true,
      message: "Websites retrieved successfully",
      data: { total: websites.length, websites },
    });
  }),
);

// @desc    Admin: get platform settings
// @route   GET /api/admin/settings
// @access  Private/Admin
router.get(
  "/settings",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const settings = await getOrCreateSettings();
    res.status(200).json({
      success: true,
      message: "Settings retrieved successfully",
      data: { settings },
    });
  }),
);

// @desc    Admin: update platform settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
router.put(
  "/settings",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      maintenanceMode,
      maintenanceMessage,
      supportEmail,
      allowNewVendorRegistrations,
    } = req.body;

    const settings = await getOrCreateSettings();
    if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
    if (maintenanceMessage !== undefined) settings.maintenanceMessage = maintenanceMessage;
    if (supportEmail !== undefined) settings.supportEmail = supportEmail;
    if (allowNewVendorRegistrations !== undefined)
      settings.allowNewVendorRegistrations = allowNewVendorRegistrations;

    await settings.save();

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: { settings },
    });
  }),
);

export default router;
