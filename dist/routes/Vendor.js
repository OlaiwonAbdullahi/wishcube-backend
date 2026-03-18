"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const slugify_1 = __importDefault(require("slugify"));
const Vendor_1 = __importDefault(require("../model/Vendor"));
const Product_1 = __importDefault(require("../model/Product"));
const Order_1 = __importDefault(require("../model/Order"));
const User_1 = __importDefault(require("../model/User"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const cloudinary_1 = require("../config/cloudinary");
const email_1 = require("../utils/email");
const errorHandler_1 = require("../utils/errorHandler");
const router = express_1.default.Router();
// @desc    Apply to be a vendor
// @route   POST /api/vendors/apply
// @access  Private
router.post("/apply", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const existing = await Vendor_1.default.findOne({ userId: req.user?._id });
    if (existing) {
        throw new errorHandler_1.AppError("You already have a store application", 400);
    }
    const { storeName, description, category, deliveryZones, bankDetails } = req.body;
    if (!storeName || !category) {
        throw new errorHandler_1.AppError("Store name and category are required", 400);
    }
    const slug = (0, slugify_1.default)(storeName, { lower: true, strict: true });
    const slugExists = await Vendor_1.default.findOne({ slug });
    if (slugExists) {
        throw new errorHandler_1.AppError("Store name already taken", 400);
    }
    const vendor = await Vendor_1.default.create({
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
}));
// @desc    Upload vendor logo
// @route   POST /api/vendors/logo
// @access  Private
router.post("/logo", authMiddleware_1.protect, cloudinary_1.uploadLogo.single("logo"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.default.findOne({ userId: req.user?._id });
    if (!vendor) {
        throw new errorHandler_1.AppError("Store not found", 404);
    }
    if (vendor.logoPublicId) {
        await (0, cloudinary_1.deleteFile)(vendor.logoPublicId).catch(console.error);
    }
    if (!req.file) {
        throw new errorHandler_1.AppError("No file uploaded", 400);
    }
    vendor.logo = req.file.path;
    vendor.logoPublicId = req.file.filename;
    await vendor.save();
    res.status(200).json({
        success: true,
        message: "Logo uploaded successfully",
        data: { logo: vendor.logo },
    });
}));
// @desc    Get my store details
// @route   GET /api/vendors/me
// @access  Private
router.get("/me", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.default.findOne({ userId: req.user?._id });
    if (!vendor) {
        throw new errorHandler_1.AppError("Store not found", 404);
    }
    res.status(200).json({
        success: true,
        message: "Store details retrieved successfully",
        data: { vendor },
    });
}));
// @desc    Update my store
// @route   PUT /api/vendors/me
// @access  Private
router.put("/me", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const allowed = [
        "storeName",
        "description",
        "category",
        "deliveryZones",
        "bankDetails",
    ];
    const updates = {};
    allowed.forEach((key) => {
        if (req.body[key] !== undefined)
            updates[key] = req.body[key];
    });
    const vendor = await Vendor_1.default.findOneAndUpdate({ userId: req.user?._id }, updates, { new: true, runValidators: true });
    if (!vendor) {
        throw new errorHandler_1.AppError("Store not found", 404);
    }
    res.status(200).json({
        success: true,
        message: "Store updated successfully",
        data: { vendor },
    });
}));
// @desc    Get vendor orders
// @route   GET /api/vendors/orders
// @access  Private/Vendor
router.get("/orders", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("vendor"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.default.findOne({ userId: req.user?._id });
    if (!vendor) {
        throw new errorHandler_1.AppError("Store not found", 404);
    }
    const { status } = req.query;
    const query = { vendorId: vendor._id };
    if (status)
        query.status = status;
    const orders = await Order_1.default.find(query).sort("-createdAt");
    res.status(200).json({
        success: true,
        message: "Vendor orders retrieved successfully",
        data: {
            total: orders.length,
            orders,
        },
    });
}));
// @desc    Update order status
// @route   PUT /api/vendors/orders/:orderId
// @access  Private/Vendor
router.put("/orders/:orderId", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("vendor"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.default.findOne({ userId: req.user?._id });
    if (!vendor) {
        throw new errorHandler_1.AppError("Store not found", 404);
    }
    const { status, trackingNumber, note } = req.body;
    const allowed = ["shipped", "delivered"];
    if (!allowed.includes(status)) {
        throw new errorHandler_1.AppError("Invalid status update", 400);
    }
    const order = await Order_1.default.findOne({
        _id: req.params.orderId,
        vendorId: vendor._id,
    });
    if (!order) {
        throw new errorHandler_1.AppError("Order not found", 404);
    }
    order.status = status;
    if (trackingNumber)
        order.trackingNumber = trackingNumber;
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
}));
// @desc    Get all approved vendors (marketplace)
// @route   GET /api/vendors
// @access  Public
router.get("/", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { category, search } = req.query;
    const query = { status: "approved", isActive: true };
    if (category)
        query.category = category;
    if (search)
        query.storeName = { $regex: search, $options: "i" };
    const vendors = await Vendor_1.default.find(query)
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
}));
// @desc    Admin: Approve vendor
// @route   PUT /api/vendors/:id/approve
// @access  Private/Admin
router.put("/:id/approve", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("admin"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.default.findById(req.params.id).populate("userId");
    if (!vendor) {
        throw new errorHandler_1.AppError("Vendor not found", 404);
    }
    vendor.status = "approved";
    vendor.isActive = true;
    vendor.approvedAt = new Date();
    await vendor.save();
    // Upgrade user role to vendor
    await User_1.default.findByIdAndUpdate(vendor.userId._id, {
        role: "vendor",
    });
    (0, email_1.sendEmail)({
        to: vendor.userId.email,
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
}));
// @desc    Admin: Reject vendor
// @route   PUT /api/vendors/:id/reject
// @access  Private/Admin
router.put("/:id/reject", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("admin"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { reason } = req.body;
    if (!reason) {
        throw new errorHandler_1.AppError("Rejection reason is required", 400);
    }
    const vendor = await Vendor_1.default.findById(req.params.id).populate("userId");
    if (!vendor) {
        throw new errorHandler_1.AppError("Vendor not found", 404);
    }
    vendor.status = "rejected";
    vendor.rejectionReason = reason;
    await vendor.save();
    (0, email_1.sendEmail)({
        to: vendor.userId.email,
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
}));
// @desc    Get store by slug (Public)
// @route   GET /api/vendors/store/:slug
// @access  Public
router.get("/store/:slug", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.default.findOne({
        slug: req.params.slug,
        isActive: true,
    });
    if (!vendor) {
        throw new errorHandler_1.AppError("Store not found", 404);
    }
    const products = await Product_1.default.find({
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
}));
exports.default = router;
