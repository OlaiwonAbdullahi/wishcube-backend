import express, { Request, Response, NextFunction } from "express";
import Card from "../model/Card";
import { protect } from "../middleware/authMiddleware";
import {
  uploadImage,
  uploadToCloudinary,
  deleteFile,
} from "../config/cloudinary";
import { generateCardMessage } from "../utils/aiMessage";
import { asyncHandler, AppError } from "../utils/errorHandler";

const router = express.Router();

// @desc    Get all cards for a user
// @route   GET /api/cards
// @access  Private
router.get(
  "/",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query;
    const query: any = { userId: req.user?._id };
    if (status) query.status = status;

    const cards = await Card.find(query).sort("-createdAt");
    res.status(200).json({
      success: true,
      message: "Cards retrieved successfully",
      data: {
        total: cards.length,
        cards,
      },
    });
  })
);

// @desc    Create a new card
// @route   POST /api/cards
// @access  Private
router.post(
  "/",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const card = await Card.create({ ...req.body, userId: req.user?._id });
    res.status(201).json({
      success: true,
      message: "Card created successfully",
      data: { card },
    });
  })
);

// @desc    Get single card by ID
// @route   GET /api/cards/:id
// @access  Private
router.get(
  "/:id",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const card = await Card.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });
    if (!card) {
      throw new AppError("Card not found", 404);
    }
    res.status(200).json({
      success: true,
      message: "Card retrieved successfully",
      data: { card },
    });
  })
);

// @desc    Update a card
// @route   PUT /api/cards/:id
// @access  Private
router.put(
  "/:id",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!card) {
      throw new AppError("Card not found", 404);
    }
    res.status(200).json({
      success: true,
      message: "Card updated successfully",
      data: { card },
    });
  })
);

// @desc    Delete a card
// @route   DELETE /api/cards/:id
// @access  Private
router.delete(
  "/:id",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const card = await Card.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });
    if (!card) {
      throw new AppError("Card not found", 404);
    }

    if (card.backgroundImagePublicId) {
      await deleteFile(card.backgroundImagePublicId).catch(console.error);
    }

    await card.deleteOne();
    res.status(200).json({
      success: true,
      message: "Card deleted successfully",
      data: null,
    });
  })
);

// @desc    Upload background image for a card
// @route   POST /api/cards/:id/background
// @access  Private
router.post(
  "/:id/background",
  protect,
  uploadImage.single("image"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError("No image uploaded", 400);
    }

    const card = await Card.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });
    if (!card) {
      throw new AppError("Card not found", 404);
    }

    // Delete old background if exists
    if (card.backgroundImagePublicId) {
      await deleteFile(card.backgroundImagePublicId).catch(console.error);
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, "cards");

    card.backgroundImageUrl = result.secure_url;
    card.backgroundImagePublicId = result.public_id;
    await card.save();

    res.status(200).json({
      success: true,
      message: "Background image uploaded successfully",
      data: {
        backgroundImageUrl: card.backgroundImageUrl,
        card,
      },
    });
  })
);

// @desc    Remove background image from a card
// @route   DELETE /api/cards/:id/background
// @access  Private
router.delete(
  "/:id/background",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const card = await Card.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });
    if (!card) {
      throw new AppError("Card not found", 404);
    }

    if (card.backgroundImagePublicId) {
      await deleteFile(card.backgroundImagePublicId).catch(console.error);
    }

    card.backgroundImageUrl = null;
    card.backgroundImagePublicId = null;
    await card.save();

    res.status(200).json({
      success: true,
      message: "Background image removed successfully",
      data: { card },
    });
  })
);

// @desc    Generate AI messages for a card
// @route   POST /api/cards/ai/generate
// @access  Private
router.post(
  "/ai/generate",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      recipientName,
      senderName,
      occasion,
      relationship,
      language,
      tone,
    } = req.body;

    if (!recipientName || !occasion) {
      throw new AppError("recipientName and occasion are required", 400);
    }

    const [suggestion1, suggestion2, suggestion3] = await Promise.all([
      generateCardMessage({
        recipientName,
        senderName,
        occasion,
        relationship,
        language,
        tone,
        variant: 1,
      }),
      generateCardMessage({
        recipientName,
        senderName,
        occasion,
        relationship,
        language,
        tone,
        variant: 2,
      }),
      generateCardMessage({
        recipientName,
        senderName,
        occasion,
        relationship,
        language,
        tone,
        variant: 3,
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "AI suggestions generated successfully",
      data: {
        suggestions: [suggestion1, suggestion2, suggestion3],
      },
    });
  })
);

// @desc    Mark card as completed
// @route   POST /api/cards/:id/complete
// @access  Private
router.post(
  "/:id/complete",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      { status: "completed", $inc: { downloadCount: 1 } },
      { new: true }
    );
    if (!card) {
      throw new AppError("Card not found", 404);
    }
    res.status(200).json({
      success: true,
      message: "Card marked as completed",
      data: { card },
    });
  })
);

// @desc    Track card download
// @route   POST /api/cards/:id/track-download
// @access  Private
router.post(
  "/:id/track-download",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      { $inc: { downloadCount: 1 } },
      { new: true }
    );
    if (!card) {
      throw new AppError("Card not found", 404);
    }
    res.status(200).json({
      success: true,
      message: "Download tracked successfully",
      data: {
        downloadCount: card.downloadCount,
      },
    });
  })
);

export default router;
