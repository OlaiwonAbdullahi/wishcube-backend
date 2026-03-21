import express, { Request, Response } from "express";
import Product from "../model/Product";
import Vendor from "../model/Vendor";
import { protect, authorize } from "../middleware/authMiddleware";
import {
  uploadProduct,
  uploadToCloudinary,
  deleteFile,
} from "../config/cloudinary";
import { asyncHandler, AppError } from "../utils/errorHandler";

const router = express.Router();

// @desc    Get all products (marketplace)
// @route   GET /api/products
// @access  Public
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { category, occasion, state, search, minPrice, maxPrice, featured } =
      req.query;
    const query: any = { isAvailable: true, stock: { $gt: 0 } };

    if (category) query.category = category;
    if (occasion) query.occasionTags = occasion;
    if (state) query.deliveryZones = state;
    if (featured) query.isFeatured = true;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) query.name = { $regex: search, $options: "i" };

    const products = await Product.find(query)
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
  })
);

// @desc    Get all digital gifts (Vouchers)
// @route   GET /api/products/digital-gifts
// @access  Public
router.get(
  "/digital-gifts",
  asyncHandler(async (req: Request, res: Response) => {
    const products = await Product.find({
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
  })
);

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const product = await Product.findById(req.params.id).populate(
      "vendorId",
      "storeName slug logo rating category deliveryZones"
    );
    if (!product) {
      throw new AppError("Product not found", 404);
    }
    res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: { product },
    });
  })
);

// @desc    Create product (vendor only)
// @route   POST /api/products
// @access  Private/Vendor
router.post(
  "/",
  protect,
  authorize("vendor"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findOne({
      _id: req.user?._id,
      status: "approved",
    });
    if (!vendor) {
      throw new AppError("Approved vendor account required", 403);
    }

    const product = await Product.create({ ...req.body, vendorId: vendor._id });
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: { product },
    });
  })
);

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Vendor
router.put(
  "/:id",
  protect,
  authorize("vendor"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findById(req.user?._id);
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, vendorId: vendor?._id },
      req.body,
      { new: true }
    );
    if (!product) {
      throw new AppError("Product not found", 404);
    }
    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: { product },
    });
  })
);

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Vendor
router.delete(
  "/:id",
  protect,
  authorize("vendor"),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = await Vendor.findById(req.user?._id);
    const product = await Product.findOne({
      _id: req.params.id,
      vendorId: vendor?._id,
    });
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    for (const img of product.images) {
      if (img.publicId) await deleteFile(img.publicId).catch(console.error);
    }

    await product.deleteOne();
    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: null,
    });
  })
);

// @desc    Upload product images
// @route   POST /api/products/upload
// @access  Private/Vendor/Admin
router.post(
  "/upload",
  protect,
  authorize("vendor", "admin"),
  uploadProduct.array("images", 5),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      throw new AppError("No files uploaded", 400);
    }

    const files = req.files as Express.Multer.File[];
    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file.buffer, "products")
    );

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
  })
);

export default router;
