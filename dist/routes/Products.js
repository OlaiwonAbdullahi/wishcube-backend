"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Product_1 = __importDefault(require("../model/Product"));
const Vendor_1 = __importDefault(require("../model/Vendor"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const cloudinary_1 = require("../config/cloudinary");
const errorHandler_1 = require("../utils/errorHandler");
const router = express_1.default.Router();
// @desc    Get all products (marketplace)
// @route   GET /api/products
// @access  Public
router.get("/", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { category, occasion, state, search, minPrice, maxPrice, featured } = req.query;
    const query = { isAvailable: true, stock: { $gt: 0 } };
    if (category)
        query.category = category;
    if (occasion)
        query.occasionTags = occasion;
    if (state)
        query.deliveryZones = state;
    if (featured)
        query.isFeatured = true;
    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice)
            query.price.$gte = Number(minPrice);
        if (maxPrice)
            query.price.$lte = Number(maxPrice);
    }
    if (search)
        query.name = { $regex: search, $options: "i" };
    const products = await Product_1.default.find(query)
        .sort("-createdAt")
        .populate("vendorId", "storeName slug logo rating deliveryZones");
    res.status(200).json({
        success: true,
        message: "Products retrieved successfully",
        data: {
            total: products.length,
            products,
        },
    });
}));
// @desc    Get all digital gifts (Vouchers)
// @route   GET /api/products/digital-gifts
// @access  Public
router.get("/digital-gifts", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const products = await Product_1.default.find({
        category: "Vouchers",
        isAvailable: true,
    }).sort("-createdAt");
    res.status(200).json({
        success: true,
        message: "Digital gifts retrieved successfully",
        data: {
            total: products.length,
            products,
        },
    });
}));
// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
router.get("/:id", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const product = await Product_1.default.findById(req.params.id).populate("vendorId", "storeName slug logo rating category deliveryZones");
    if (!product) {
        throw new errorHandler_1.AppError("Product not found", 404);
    }
    res.status(200).json({
        success: true,
        message: "Product retrieved successfully",
        data: { product },
    });
}));
// @desc    Create product (vendor only)
// @route   POST /api/products
// @access  Private/Vendor
router.post("/", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("vendor"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.default.findOne({
        _id: req.user?._id,
        status: "approved",
    });
    if (!vendor) {
        throw new errorHandler_1.AppError("Approved vendor account required", 403);
    }
    const product = await Product_1.default.create({ ...req.body, vendorId: vendor._id });
    res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: { product },
    });
}));
// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Vendor
router.put("/:id", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("vendor"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.default.findById(req.user?._id);
    const product = await Product_1.default.findOneAndUpdate({ _id: req.params.id, vendorId: vendor?._id }, req.body, { new: true });
    if (!product) {
        throw new errorHandler_1.AppError("Product not found", 404);
    }
    res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: { product },
    });
}));
// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Vendor
router.delete("/:id", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("vendor"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.default.findById(req.user?._id);
    const product = await Product_1.default.findOne({
        _id: req.params.id,
        vendorId: vendor?._id,
    });
    if (!product) {
        throw new errorHandler_1.AppError("Product not found", 404);
    }
    for (const img of product.images) {
        if (img.publicId)
            await (0, cloudinary_1.deleteFile)(img.publicId).catch(console.error);
    }
    await product.deleteOne();
    res.status(200).json({
        success: true,
        message: "Product deleted successfully",
        data: null,
    });
}));
// @desc    Upload product images
// @route   POST /api/products/upload
// @access  Private/Vendor/Admin/user
router.post("/upload", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("vendor", "admin", "user"), cloudinary_1.uploadProduct.array("images", 5), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        throw new errorHandler_1.AppError("No files uploaded", 400);
    }
    const files = req.files;
    const uploadPromises = files.map((file) => (0, cloudinary_1.uploadToCloudinary)(file.buffer, "products"));
    const results = await Promise.all(uploadPromises);
    const images = results.map((result) => ({
        url: result.secure_url,
        publicId: result.public_id,
    }));
    res.status(200).json({
        success: true,
        message: "Images uploaded successfully",
        data: { images },
    });
}));
// @desc    General media upload — images AND audio (any authenticated user)
// @route   POST /api/products/media-upload
// @access  Private
// @field   "files" — up to 5 files (images: jpg/png/gif/webp, audio: mp3/wav/ogg/m4a/aac/flac)
router.post("/media-upload", authMiddleware_1.protect, cloudinary_1.uploadMedia.array("files", 5), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        throw new errorHandler_1.AppError("No files uploaded", 400);
    }
    const files = req.files;
    const uploadPromises = files.map((file) => (0, cloudinary_1.uploadToCloudinary)(file.buffer, "general", file.mimetype));
    const results = await Promise.all(uploadPromises);
    const media = results.map((result, i) => ({
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        format: result.format,
        mimetype: files[i].mimetype,
        originalName: files[i].originalname,
    }));
    res.status(200).json({
        success: true,
        message: "Files uploaded successfully",
        data: { media },
    });
}));
exports.default = router;
