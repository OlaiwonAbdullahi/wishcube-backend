import express, { Request, Response } from "express";
import Product from "../model/Product";
import { protect, authorize } from "../middleware/authMiddleware";
import { asyncHandler, AppError } from "../utils/errorHandler";

const router = express.Router();

// @desc    Admin: Create a digital gift product
// @route   POST /api/admin/digital-gifts
// @access  Private/Admin
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
      category: "Vouchers", // Hardcode category to Vouchers
      isAvailable: true,
      stock: Infinity, // Digital gifts have unlimited stock
    });

    res.status(201).json({
      success: true,
      message: "Digital gift created successfully",
      data: { digitalGift },
    });
  })
);

// @desc    Admin: Get all digital gifts
// @route   GET /api/admin/digital-gifts
// @access  Private/Admin
router.get(
  "/digital-gifts",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const digitalGifts = await Product.find({ category: "Vouchers" }).sort(
      "-createdAt"
    );

    res.status(200).json({
      success: true,
      message: "Digital gifts retrieved successfully",
      data: {
        total: digitalGifts.length,
        digitalGifts,
      },
    });
  })
);

// @desc    Admin: Delete a digital gift
// @route   DELETE /api/admin/digital-gifts/:id
// @access  Private/Admin
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
  })
);

export default router;
