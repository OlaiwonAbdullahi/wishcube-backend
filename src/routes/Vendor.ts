import express, { Request, Response, NextFunction } from "express";
import slugify from "slugify";
import crypto from "crypto";
import { body } from "express-validator";
import Vendor from "../model/Vendor";
import Product from "../model/Product";
import Order, { IOrder } from "../model/Order";
import Gift from "../model/Gift";
import Website from "../model/Website";
import { protect, authorize } from "../middleware/authMiddleware";
import { validate } from "../middleware/validationMiddleware";
import { authRateLimiter } from "../middleware/rateLimiter";
import { uploadLogo, deleteFile } from "../config/cloudinary";
import { sendEmail } from "../utils/email";
import {
  vendorWelcomeTemplate,
  vendorApprovedTemplate,
  vendorRejectedTemplate,
  passwordResetTemplate,
} from "../utils/emailTemplates";
import { asyncHandler, AppError } from "../utils/errorHandler";
import { sendTokenResponse } from "../utils/token";

const router = express.Router();

const resetPasswordValidation = [
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Password must contain at least one special character"),
];

// @desc    Register a new vendor
// @route   POST /api/vendors/register
// @access  Public
router.post(
  "/register",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { ownerName, email, password, storeName, category, description } =
      req.body;

    if (!ownerName || !email || !password || !storeName || !category) {
      throw new AppError(
        "Please provide owner name, email, password, store name and category",
        400,
      );
    }

    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      throw new AppError("Vendor with this email already exists", 400);
    }

    const slug = slugify(storeName, { lower: true, strict: true });
    const slugExists = await Vendor.findOne({ slug });
    if (slugExists) {
      throw new AppError("Store name already taken", 400);
    }

    const vendor = await Vendor.create({
      ownerName,
      email,
      password,
      storeName,
      slug,
      category,
      description: description || "",
    });

    try {
      await sendEmail({
        to: vendor.email,
        subject: `Welcome to ${process.env.APP_NAME || "WishCube"} Vendor Marketplace!`,
        html: vendorWelcomeTemplate(
          vendor.ownerName,
          vendor.storeName,
          `${process.env.CLIENT_URL}/vendor/dashboard`,
        ),
      });
    } catch (emailError) {
      console.error("Vendor welcome email failed to send:", emailError);
    }

    sendTokenResponse(vendor as any, 201, res, "vendor");
  }),
);

// @desc    Login vendor
// @route   POST /api/vendors/login
// @access  Public
router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Please provide email and password", 400);
    }

    const vendor = await Vendor.findOne({ email }).select("+password");
    if (!vendor || !(await vendor.comparePassword(password))) {
      throw new AppError("Invalid credentials", 401);
    }

    if (vendor.status === "suspended") {
      throw new AppError("Your account has been suspended", 403);
    }
    if (vendor.status === "pending") {
      throw new AppError(
        "Your store is still pending admin approval. We'll email you once it's reviewed.",
        403,
        "VENDOR_PENDING_APPROVAL",
      );
    }
    if (vendor.status === "rejected") {
      throw new AppError(
        vendor.rejectionReason
          ? `Your vendor application was rejected: ${vendor.rejectionReason}`
          : "Your vendor application was rejected",
        403,
        "VENDOR_REJECTED",
      );
    }

    sendTokenResponse(vendor as any, 200, res, "vendor");
  }),
);

// @desc    Request a vendor password reset link
// @route   POST /api/vendors/forgot-password
// @access  Public
router.post(
  "/forgot-password",
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      return next(new AppError("Please provide an email", 400));
    }

    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      // Enumeration-safe: identical response whether or not the account exists.
      return res.status(200).json({
        success: true,
        message: "If a vendor account exists with that email, a reset link has been sent",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    vendor.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    vendor.resetPasswordExpire = Date.now() + 3600000;
    await vendor.save({ validateBeforeSave: false });

    const resetUrl = `https://app.usewishcube.com/vendor/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: vendor.email,
        subject: "Password Reset Request - WishCube",
        html: passwordResetTemplate(vendor.ownerName, resetUrl),
      });

      res.status(200).json({
        success: true,
        message: "If a vendor account exists with that email, a reset link has been sent",
      });
    } catch (err: any) {
      console.error("Vendor reset email error:", err);
      vendor.resetPasswordToken = undefined;
      vendor.resetPasswordExpire = undefined;
      await vendor.save({ validateBeforeSave: false });
      return next(new AppError(`Email could not be sent: ${err.message}`, 500));
    }
  }),
);

// @desc    Check whether a vendor password reset token is still valid
// @route   GET /api/vendors/validate-reset-token/:token
// @access  Public
router.get(
  "/validate-reset-token/:token",
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const vendor = await Vendor.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!vendor) {
      return next(new AppError("Invalid or expired reset token", 400));
    }

    res.status(200).json({ success: true, message: "Token is valid" });
  }),
);

// @desc    Reset a vendor's password
// @route   POST /api/vendors/reset-password/:token
// @access  Public
router.post(
  "/reset-password/:token",
  authRateLimiter,
  resetPasswordValidation,
  validate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { password } = req.body;

    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const vendor = await Vendor.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!vendor) {
      return next(new AppError("Invalid or expired reset token", 400));
    }

    vendor.password = password;
    vendor.resetPasswordToken = undefined;
    vendor.resetPasswordExpire = undefined;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully. You can now log in.",
    });
  }),
);

// @desc    Upload vendor logo
// @route   POST /api/vendors/logo
// @access  Private (Vendor)
router.post(
  "/logo",
  protect,
  uploadLogo.single("logo"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findById(req.user?._id);
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }

    if (vendor.logoPublicId) {
      await deleteFile(vendor.logoPublicId).catch(console.error);
    }

    if (!req.file) {
      throw new AppError("No file uploaded", 400);
    }

    vendor.logo = req.file.path;
    vendor.logoPublicId = req.file.filename;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Logo uploaded successfully",
      data: { logo: vendor.logo },
    });
  }),
);

// @desc    Get my store details
// @route   GET /api/vendors/me
// @access  Private (Vendor)
router.get(
  "/me",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findById(req.user?._id);
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }
    res.status(200).json({
      success: true,
      message: "Vendor details retrieved successfully",
      data: { vendor },
    });
  }),
);

// @desc    Vendor dashboard overview stats
// @route   GET /api/vendors/dashboard/overview
// @access  Private/Vendor
router.get(
  "/dashboard/overview",
  protect,
  authorize("vendor"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user?._id;

    const [ordersCount, activeOrdersCount, productsCount, recentOrders, stats] =
      await Promise.all([
        Order.countDocuments({ vendorId }),
        Order.countDocuments({
          vendorId,
          status: {
            $in: [
              "processing",
              "out_for_delivery",
              "in_transit",
              "awaiting_confirmation",
            ],
          },
        }),
        Product.countDocuments({ vendorId }),
        Order.find({ vendorId }).sort("-createdAt").limit(5).populate("giftId"),
        Order.aggregate([
          { $match: { vendorId, status: "delivered" } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totalAmount" },
              totalEarnings: { $sum: "$vendorEarnings" },
            },
          },
        ]),
      ]);

    const overview = {
      stats: {
        totalOrders: ordersCount,
        activeOrders: activeOrdersCount,
        totalProducts: productsCount,
        totalRevenue: stats[0]?.totalRevenue || 0,
        totalEarnings: stats[0]?.totalEarnings || 0,
      },
      recentOrders,
    };

    res.status(200).json({
      success: true,
      message: "Vendor dashboard overview retrieved successfully",
      data: overview,
    });
  }),
);

// @desc    Full analytics for vendor
// @route   GET /api/vendors/analytics
// @access  Private/Vendor
router.get(
  "/analytics",
  protect,
  authorize("vendor"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user?._id;

    // 1. Orders by status (Pie Chart)
    const ordersByStatus = await Order.aggregate([
      { $match: { vendorId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // 2. Revenue over time (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const revenueHistory = await Order.aggregate([
      {
        $match: {
          vendorId,
          status: "delivered",
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          revenue: { $sum: "$totalAmount" },
          earnings: { $sum: "$vendorEarnings" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // 3. Top selling products
    const topProducts = await Order.aggregate([
      { $match: { vendorId, status: "delivered" } },
      {
        $group: {
          _id: "$productId",
          name: { $first: "$productSnapshot.name" },
          totalSales: { $sum: "$totalAmount" },
          unitsSold: { $sum: 1 },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json({
      success: true,
      message: "Vendor analytics retrieved successfully",
      data: {
        ordersByStatus,
        revenueHistory,
        topProducts,
      },
    });
  }),
);

// @desc    Update my store
// @route   PUT /api/vendors/me
// @access  Private (Vendor)
router.put(
  "/me",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const allowed = [
      "storeName",
      "description",
      "category",
      "deliveryZones",
      "bankDetails",
    ];
    const updates: any = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const vendor = await Vendor.findByIdAndUpdate(req.user?._id, updates, {
      new: true,
      runValidators: true,
    });
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }
    res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      data: { vendor },
    });
  }),
);

// @desc    Get vendor orders
// @route   GET /api/vendors/orders
// @access  Private/Vendor
router.get(
  "/orders",
  protect,
  authorize("vendor"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findById(req.user?._id);
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }

    const { status } = req.query;
    const query: any = { vendorId: vendor._id };
    if (status) query.status = status;

    const orders = await Order.find(query).sort("-createdAt");
    res.status(200).json({
      success: true,
      message: "Vendor orders retrieved successfully",
      data: {
        total: orders.length,
        orders,
      },
    });
  }),
);

// Status update is now handled in /api/orders/:id/status
// @desc    Update order status
// @route   PUT /api/vendors/orders/:orderId
// @access  Private/Vendor
router.put(
  "/orders/:orderId",
  protect,
  authorize("vendor"),
  asyncHandler(async (req: Request, res: Response) => {
    res.status(410).json({
      success: false,
      message:
        "This endpoint is deprecated. Please use PATCH /api/orders/:id/status",
    });
  }),
);

// @desc    Admin: Get all vendors (with filtering)
// @route   GET /api/vendors/all
// @access  Private/Admin
router.get(
  "/all",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, category, search } = req.query;
    const query: any = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { storeName: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const vendors = await Vendor.find(query).sort("-createdAt");

    res.status(200).json({
      success: true,
      message: "All vendors retrieved successfully",
      data: {
        total: vendors.length,
        vendors,
      },
    });
  }),
);

// @desc    Get all approved vendors (marketplace)
// @route   GET /api/vendors
// @access  Public
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { category, search } = req.query;
    const query: any = { status: "approved", isActive: true };

    if (category) query.category = category;
    if (search) query.storeName = { $regex: search, $options: "i" };

    const vendors = await Vendor.find(query)
      .sort("-createdAt")
      .select("-bankDetails -rejectionReason -commissionRate");

    res.status(200).json({
      success: true,
      message: "Vendors retrieved successfully",
      data: {
        total: vendors.length,
        vendors,
      },
    });
  }),
);

// @desc    Admin: Approve vendor
// @route   PUT /api/vendors/:id/approve
// @access  Private/Admin
router.put(
  "/:id/approve",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }

    vendor.status = "approved";
    vendor.isActive = true;
    vendor.approvedAt = new Date();
    await vendor.save();

    sendEmail({
      to: vendor.email,
      subject: `Your WishCube store "${vendor.storeName}" is approved! 🎉`,
      html: vendorApprovedTemplate(
        vendor.ownerName,
        vendor.storeName,
        `${process.env.CLIENT_URL}/vendor/dashboard`,
      ),
    }).catch(console.error);

    res.status(200).json({
      success: true,
      message: "Vendor approved successfully",
      data: { vendor },
    });
  }),
);

// @desc    Admin: Reject vendor
// @route   PUT /api/vendors/:id/reject
// @access  Private/Admin
router.put(
  "/:id/reject",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;
    if (!reason) {
      throw new AppError("Rejection reason is required", 400);
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }

    vendor.status = "rejected";
    vendor.rejectionReason = reason;
    await vendor.save();

    sendEmail({
      to: vendor.email,
      subject: `Update regarding your store application on WishCube`,
      html: vendorRejectedTemplate(vendor.ownerName, vendor.storeName, reason),
    }).catch(console.error);

    res.status(200).json({
      success: true,
      message: "Vendor rejected successfully",
      data: { vendor },
    });
  }),
);

// @desc    Admin: activate/deactivate a vendor's storefront
// @route   PATCH /api/vendors/:id/active
// @access  Private/Admin
router.patch(
  "/:id/active",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }

    vendor.isActive = !vendor.isActive;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: `Vendor ${vendor.isActive ? "activated" : "deactivated"} successfully`,
      data: { vendor },
    });
  }),
);

// @desc    Admin: permanently delete a vendor account
// @route   DELETE /api/vendors/:id
// @access  Private/Admin
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }

    const orderCount = await Order.countDocuments({ vendorId: vendor._id });
    if (orderCount > 0) {
      throw new AppError(
        "This vendor has order history and can't be deleted. Deactivate their storefront instead.",
        400,
      );
    }

    if (vendor.logoPublicId) {
      await deleteFile(vendor.logoPublicId).catch(console.error);
    }

    await Product.deleteMany({ vendorId: vendor._id });
    await vendor.deleteOne();

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
      data: null,
    });
  }),
);

// @desc    Get store by slug (Public)
// @route   GET /api/vendors/store/:slug
// @access  Public
router.get(
  "/store/:slug",
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findOne({
      slug: req.params.slug,
      isActive: true,
    });
    if (!vendor) {
      throw new AppError("Store not found", 404);
    }

    const products = await Product.find({
      vendorId: vendor._id,
      isAvailable: true,
      stock: { $gt: 0 },
    }).sort("-createdAt");

    res.status(200).json({
      success: true,
      message: "Store details retrieved successfully",
      data: {
        vendor,
        products,
      },
    });
  }),
);

export default router;
