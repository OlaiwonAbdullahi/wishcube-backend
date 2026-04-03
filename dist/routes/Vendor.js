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
const authMiddleware_1 = require("../middleware/authMiddleware");
const cloudinary_1 = require("../config/cloudinary");
const email_1 = require("../utils/email");
const errorHandler_1 = require("../utils/errorHandler");
const token_1 = require("../utils/token");
const router = express_1.default.Router();
// @desc    Register a new vendor
// @route   POST /api/vendors/register
// @access  Public
router.post("/register", (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { ownerName, email, password, storeName, category, description } = req.body;
    if (!ownerName || !email || !password || !storeName || !category) {
        throw new errorHandler_1.AppError("Please provide owner name, email, password, store name and category", 400);
    }
    const existingVendor = await Vendor_1.default.findOne({ email });
    if (existingVendor) {
        throw new errorHandler_1.AppError("Vendor with this email already exists", 400);
    }
    const slug = (0, slugify_1.default)(storeName, { lower: true, strict: true });
    const slugExists = await Vendor_1.default.findOne({ slug });
    if (slugExists) {
        throw new errorHandler_1.AppError("Store name already taken", 400);
    }
    const vendor = await Vendor_1.default.create({
        ownerName,
        email,
        password,
        storeName,
        slug,
        category,
        description: description || "",
    });
    try {
        await (0, email_1.sendEmail)({
            to: vendor.email,
            subject: `Welcome to ${process.env.APP_NAME || "WishCube"} Vendor Marketplace!`,
            html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F3F3F3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border:2px solid #191A23;border-bottom:5px solid #191A23;box-shadow:4px 4px 0 rgba(25,26,35,.15);max-width:560px;width:100%;">
        <tr>
          <td style="background:#191A23;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">WishCube Marketplace</p>
            <div style="display:inline-block;background:#E6D1FF;border:2px solid #fff;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;margin-bottom:14px;">🛍️</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Welcome, Vendor!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">Your application is under review</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;background:#ffffff;">
            <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${vendor.ownerName},</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
              We're thrilled to have your store, <strong>${vendor.storeName}</strong>, onboard! Our team is currently reviewing your details.
            </p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
              Once approved, you'll be able to list your products and start helping our users send the perfect gifts to their loved ones.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${process.env.CLIENT_URL}/vendor/dashboard"
                  style="display:inline-block;background:#191A23;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:14px 36px;border:2px solid #191A23;border-bottom:4px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.2);">
                  Vendor Dashboard &rarr;
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background:#F3F3F3;border-top:2px solid #191A23;text-align:center;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;">&copy; ${new Date().getFullYear()} WishCube. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });
    }
    catch (emailError) {
        console.error("Vendor welcome email failed to send:", emailError);
    }
    (0, token_1.sendTokenResponse)(vendor, 201, res, "vendor");
}));
// @desc    Login vendor
// @route   POST /api/vendors/login
// @access  Public
router.post("/login", (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new errorHandler_1.AppError("Please provide email and password", 400);
    }
    const vendor = await Vendor_1.default.findOne({ email }).select("+password");
    if (!vendor || !(await vendor.comparePassword(password))) {
        throw new errorHandler_1.AppError("Invalid credentials", 401);
    }
    if (!vendor.isActive && vendor.status === "suspended") {
        throw new errorHandler_1.AppError("Your account has been suspended", 403);
    }
    (0, token_1.sendTokenResponse)(vendor, 200, res, "vendor");
}));
// @desc    Upload vendor logo
// @route   POST /api/vendors/logo
// @access  Private (Vendor)
router.post("/logo", authMiddleware_1.protect, cloudinary_1.uploadLogo.single("logo"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.default.findById(req.user?._id);
    if (!vendor) {
        throw new errorHandler_1.AppError("Vendor not found", 404);
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
// @access  Private (Vendor)
router.get("/me", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.default.findById(req.user?._id);
    if (!vendor) {
        throw new errorHandler_1.AppError("Vendor not found", 404);
    }
    res.status(200).json({
        success: true,
        message: "Vendor details retrieved successfully",
        data: { vendor },
    });
}));
// @desc    Update my store
// @route   PUT /api/vendors/me
// @access  Private (Vendor)
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
    const vendor = await Vendor_1.default.findByIdAndUpdate(req.user?._id, updates, {
        new: true,
        runValidators: true,
    });
    if (!vendor) {
        throw new errorHandler_1.AppError("Vendor not found", 404);
    }
    res.status(200).json({
        success: true,
        message: "Vendor updated successfully",
        data: { vendor },
    });
}));
// @desc    Get vendor orders
// @route   GET /api/vendors/orders
// @access  Private/Vendor
router.get("/orders", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("vendor"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.default.findById(req.user?._id);
    if (!vendor) {
        throw new errorHandler_1.AppError("Vendor not found", 404);
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
    const vendor = await Vendor_1.default.findById(req.user?._id);
    if (!vendor) {
        throw new errorHandler_1.AppError("Vendor not found", 404);
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
    if (status === "delivered" && !order.vendorPaidOut) {
    }
    await order.save();
    res.status(200).json({
        success: true,
        message: "Order status updated successfully",
        data: { order },
    });
}));
// @desc    Admin: Get all vendors (with filtering)
// @route   GET /api/vendors/all
// @access  Private/Admin
router.get("/all", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("admin"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status, category, search } = req.query;
    const query = {};
    if (status)
        query.status = status;
    if (category)
        query.category = category;
    if (search) {
        query.$or = [
            { storeName: { $regex: search, $options: "i" } },
            { ownerName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }
    const vendors = await Vendor_1.default.find(query).sort("-createdAt");
    res.status(200).json({
        success: true,
        message: "All vendors retrieved successfully",
        data: {
            total: vendors.length,
            vendors,
        },
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
        .select("-bankDetails -rejectionReason -commissionRate");
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
    const vendor = await Vendor_1.default.findById(req.params.id);
    if (!vendor) {
        throw new errorHandler_1.AppError("Vendor not found", 404);
    }
    vendor.status = "approved";
    vendor.isActive = true;
    vendor.approvedAt = new Date();
    await vendor.save();
    (0, email_1.sendEmail)({
        to: vendor.email,
        subject: `Your WishCube store "${vendor.storeName}" is approved! 🎉`,
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F3F3F3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border:2px solid #191A23;border-bottom:5px solid #191A23;box-shadow:4px 4px 0 rgba(25,26,35,.15);max-width:560px;width:100%;">
        <tr>
          <td style="background:#191A23;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">WishCube Marketplace</p>
            <div style="display:inline-block;background:#D1FAE5;border:2px solid #fff;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;margin-bottom:14px;">🎉</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Store Approved!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">Your store is now live</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;background:#ffffff;">
            <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Congratulations!</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
              Your store <strong>${vendor.storeName}</strong> has been approved and is now live on the WishCube Marketplace. We're excited to see what you'll bring to our community!
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${process.env.CLIENT_URL}/vendor/dashboard"
                  style="display:inline-block;background:#191A23;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:14px 36px;border:2px solid #191A23;border-bottom:4px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.2);">
                  Manage My Store &rarr;
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background:#F3F3F3;border-top:2px solid #191A23;text-align:center;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;">&copy; ${new Date().getFullYear()} WishCube. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
    const vendor = await Vendor_1.default.findById(req.params.id);
    if (!vendor) {
        throw new errorHandler_1.AppError("Vendor not found", 404);
    }
    vendor.status = "rejected";
    vendor.rejectionReason = reason;
    await vendor.save();
    (0, email_1.sendEmail)({
        to: vendor.email,
        subject: `Update regarding your store application on WishCube`,
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F3F3F3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border:2px solid #191A23;border-bottom:5px solid #191A23;box-shadow:4px 4px 0 rgba(25,26,35,.15);max-width:560px;width:100%;">
        <tr>
          <td style="background:#191A23;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">WishCube Marketplace</p>
            <div style="display:inline-block;background:#FFD1D1;border:2px solid #fff;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;margin-bottom:14px;">⚠️</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Update on your application</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;background:#ffffff;">
            <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Application Update</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
              We've reviewed your application for <strong>${vendor.storeName}</strong>. At this time, we are unable to approve your application for the following reason:
            </p>
            <div style="background:#F3F3F3;border-left:4px solid #191A23;padding:16px;margin-bottom:28px;">
              <p style="margin:0;font-size:14px;color:#191A23;font-style:italic;">"${reason}"</p>
            </div>
            <p style="margin:0;color:#52525b;font-size:13px;line-height:1.7;text-align:center;">
              You can update your store details and try again later.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background:#F3F3F3;border-top:2px solid #191A23;text-align:center;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;">&copy; ${new Date().getFullYear()} WishCube. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
