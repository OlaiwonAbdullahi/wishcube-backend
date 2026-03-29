import express, { Request, Response, NextFunction } from "express";
import slugify from "slugify";
import Vendor from "../model/Vendor";
import Product from "../model/Product";
import Order from "../model/Order";
import User from "../model/User";
import { protect, authorize } from "../middleware/authMiddleware";
import { uploadLogo, deleteFile } from "../config/cloudinary";
import { sendEmail } from "../utils/email";
import { asyncHandler, AppError } from "../utils/errorHandler";
import { sendTokenResponse } from "../utils/token";

const router = express.Router();

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

    // Send Welcome Email to Vendor
    try {
      await sendEmail({
        to: vendor.email,
        subject: `Welcome to ${process.env.APP_NAME || "WishCube"} Vendor Marketplace!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2 style="color: #6366f1;">Welcome to WishCube, ${vendor.ownerName}! 🎁</h2>
            <p>We're thrilled to have your store, <strong>${vendor.storeName}</strong>, onboard. Your application is currently pending review.</p>
            <p>Once approved, you'll be able to list your products and start selling to our community.</p>
            <p>Cheers,<br>The WishCube Team</p>
          </div>
        `,
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

    if (!vendor.isActive && vendor.status === "suspended") {
      throw new AppError("Your account has been suspended", 403);
    }

    sendTokenResponse(vendor as any, 200, res, "vendor");
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
    // Note: protect middleware needs to be updated to handle Vendor
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

// @desc    Update order status
// @route   PUT /api/vendors/orders/:orderId
// @access  Private/Vendor
router.put(
  "/orders/:orderId",
  protect,
  authorize("vendor"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findById(req.user?._id);
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }

    const { status, trackingNumber, note } = req.body;
    const allowed = ["shipped", "delivered"];
    if (!allowed.includes(status)) {
      throw new AppError("Invalid status update", 400);
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      vendorId: vendor._id,
    });
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    order.statusHistory.push({
      status,
      updatedAt: new Date(),
      note: note || "",
    });

    // If delivered → release payment logic would go here
    if (status === "delivered" && !order.vendorPaidOut) {
      // releaseVendorPayment helper call here
    }

    await order.save();
    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: { order },
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
      .select("-bankDetails -rejectionReason -commissionRate"); // Exclude sensitive fields

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
      html: `
        <h2>Congratulations!</h2>
        <p>Your store <strong>${vendor.storeName}</strong> has been approved and is now live on WishCube Marketplace.</p>
        <a href="${process.env.CLIENT_URL}/vendor/dashboard">Go to Vendor Dashboard</a>
      `,
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
      html: `
        <h2>Update regarding your application</h2>
        <p>We're sorry, but your application for <strong>${vendor.storeName}</strong> has been rejected for the following reason:</p>
        <p style="background: #f3f4f6; padding: 12px; border-radius: 4px;">${reason}</p>
        <p>You can update your details and try again later.</p>
      `,
    }).catch(console.error);

    res.status(200).json({
      success: true,
      message: "Vendor rejected successfully",
      data: { vendor },
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
