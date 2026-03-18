import express, { Request, Response } from "express";
import slugify from "slugify";
import Vendor from "../model/Vendor";
import Product from "../model/Product";
import Order from "../model/Order";
import User from "../model/User";
import { protect, authorize } from "../middleware/authMiddleware";
import { uploadLogo, deleteFile } from "../config/cloudinary";
import { sendEmail } from "../utils/email";
import { asyncHandler, AppError } from "../utils/errorHandler";

const router = express.Router();

// @desc    Apply to be a vendor
// @route   POST /api/vendors/apply
// @access  Private
router.post(
  "/apply",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await Vendor.findOne({ userId: req.user?._id });
    if (existing) {
      throw new AppError("You already have a store application", 400);
    }

    const { storeName, description, category, deliveryZones, bankDetails } =
      req.body;
    if (!storeName || !category) {
      throw new AppError("Store name and category are required", 400);
    }

    const slug = slugify(storeName, { lower: true, strict: true });
    const slugExists = await Vendor.findOne({ slug });
    if (slugExists) {
      throw new AppError("Store name already taken", 400);
    }

    const vendor = await Vendor.create({
      userId: req.user?._id,
      storeName,
      slug,
      description,
      category,
      deliveryZones: deliveryZones || [],
      bankDetails: bankDetails || {},
    });

    res.status(201).json({
      success: true,
      message: "Application submitted. We will review and get back to you.",
      data: { vendor },
    });
  })
);

// @desc    Upload vendor logo
// @route   POST /api/vendors/logo
// @access  Private
router.post(
  "/logo",
  protect,
  uploadLogo.single("logo"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findOne({ userId: req.user?._id });
    if (!vendor) {
      throw new AppError("Store not found", 404);
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
  })
);

// @desc    Get my store details
// @route   GET /api/vendors/me
// @access  Private
router.get(
  "/me",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findOne({ userId: req.user?._id });
    if (!vendor) {
      throw new AppError("Store not found", 404);
    }
    res.status(200).json({
      success: true,
      message: "Store details retrieved successfully",
      data: { vendor },
    });
  })
);

// @desc    Update my store
// @route   PUT /api/vendors/me
// @access  Private
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

    const vendor = await Vendor.findOneAndUpdate(
      { userId: req.user?._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!vendor) {
      throw new AppError("Store not found", 404);
    }
    res.status(200).json({
      success: true,
      message: "Store updated successfully",
      data: { vendor },
    });
  })
);

// @desc    Get vendor orders
// @route   GET /api/vendors/orders
// @access  Private/Vendor
router.get(
  "/orders",
  protect,
  authorize("vendor"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findOne({ userId: req.user?._id });
    if (!vendor) {
      throw new AppError("Store not found", 404);
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
  })
);

// @desc    Update order status
// @route   PUT /api/vendors/orders/:orderId
// @access  Private/Vendor
router.put(
  "/orders/:orderId",
  protect,
  authorize("vendor"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findOne({ userId: req.user?._id });
    if (!vendor) {
      throw new AppError("Store not found", 404);
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
  })
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
  })
);

// @desc    Admin: Approve vendor
// @route   PUT /api/vendors/:id/approve
// @access  Private/Admin
router.put(
  "/:id/approve",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findById(req.params.id).populate("userId");
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }

    vendor.status = "approved";
    vendor.isActive = true;
    vendor.approvedAt = new Date();
    await vendor.save();

    // Upgrade user role to vendor
    await User.findByIdAndUpdate((vendor.userId as any)._id, {
      role: "vendor",
    });

    sendEmail({
      to: (vendor.userId as any).email,
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
  })
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

    const vendor = await Vendor.findById(req.params.id).populate("userId");
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }

    vendor.status = "rejected";
    vendor.rejectionReason = reason;
    await vendor.save();

    sendEmail({
      to: (vendor.userId as any).email,
      subject: `Update on your WishCube store application: ${vendor.storeName}`,
      html: `
        <h2>Store Application Update</h2>
        <p>Your application for <strong>${vendor.storeName}</strong> was not approved at this time.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>You can update your store details and re-apply from your dashboard.</p>
      `,
    }).catch(console.error);

    res.status(200).json({
      success: true,
      message: "Vendor rejected successfully",
      data: { vendor },
    });
  })
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
  })
);

export default router;
