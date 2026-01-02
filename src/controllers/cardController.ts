import { Response } from "express";
import { validationResult } from "express-validator";
import Card from "../models/Card";
import { AuthRequest } from "../types";
import {
  generateShareableLink,
  getPagination,
  formatPaginatedResponse,
} from "../utils/helpers";
import cloudinary from "../config/cloudinary";

// Create Card
export const createCard = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { title, occasion, template, customization, content } = req.body;

    const card = await Card.create({
      userId: req.user?._id,
      title,
      occasion,
      template,
      customization,
      content,
    });

    res.status(201).json({
      success: true,
      message: "Card created successfully.",
      data: card,
    });
  } catch (error) {
    console.error("Create card error:", error);
    res.status(500).json({ success: false, message: "Failed to create card." });
  }
};

// Get My Cards
export const getMyCards = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { skip } = getPagination(page, limit);

    const [cards, total] = await Promise.all([
      Card.find({ userId: req.user?._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Card.countDocuments({ userId: req.user?._id }),
    ]);

    res.json({
      success: true,
      ...formatPaginatedResponse(cards, total, page, limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch cards." });
  }
};

// Get Card by ID
export const getCardById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const card = await Card.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    }).populate("giftBox");

    if (!card) {
      res.status(404).json({ success: false, message: "Card not found." });
      return;
    }

    res.json({ success: true, data: card });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch card." });
  }
};

// Update Card
export const updateCard = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { title, occasion, template, customization, content } = req.body;

    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      { title, occasion, template, customization, content },
      { new: true, runValidators: true }
    );

    if (!card) {
      res.status(404).json({ success: false, message: "Card not found." });
      return;
    }

    res.json({
      success: true,
      message: "Card updated successfully.",
      data: card,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update card." });
  }
};

// Delete Card
export const deleteCard = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const card = await Card.findOneAndDelete({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!card) {
      res.status(404).json({ success: false, message: "Card not found." });
      return;
    }

    // Delete media from Cloudinary
    for (const media of card.media) {
      if (media.publicId) {
        await cloudinary.uploader.destroy(media.publicId);
      }
    }

    res.json({ success: true, message: "Card deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete card." });
  }
};

// Publish Card
export const publishCard = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const card = await Card.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!card) {
      res.status(404).json({ success: false, message: "Card not found." });
      return;
    }

    if (!card.shareableLink) {
      card.shareableLink = generateShareableLink();
    }
    card.isPublished = true;
    await card.save();

    res.json({
      success: true,
      message: "Card published successfully.",
      data: {
        shareableLink: card.shareableLink,
        fullUrl: `${process.env.APP_URL}/cards/${card.shareableLink}`,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to publish card." });
  }
};

// Get Card by Share Link (Public)
export const getCardByShareLink = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { link } = req.params;

    const card = await Card.findOne({
      shareableLink: link,
      isPublished: true,
    }).populate("giftBox");

    if (!card) {
      res.status(404).json({ success: false, message: "Card not found." });
      return;
    }

    // Increment view count
    card.viewCount += 1;
    await card.save();

    res.json({ success: true, data: card });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch card." });
  }
};

// Upload Media
export const uploadMedia = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const card = await Card.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!card) {
      res.status(404).json({ success: false, message: "Card not found." });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded." });
      return;
    }

    const { mediaType } = req.body;
    if (!["image", "voice", "music"].includes(mediaType)) {
      res.status(400).json({ success: false, message: "Invalid media type." });
      return;
    }

    // Upload to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "wishcube/cards",
          resource_type: mediaType === "image" ? "image" : "video",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file!.buffer);
    });

    card.media.push({
      type: mediaType,
      url: result.secure_url,
      publicId: result.public_id,
      name: req.file.originalname,
    });

    await card.save();

    res.json({
      success: true,
      message: "Media uploaded successfully.",
      data: card.media[card.media.length - 1],
    });
  } catch (error) {
    console.error("Upload media error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to upload media." });
  }
};

// Delete Media
export const deleteMedia = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { mediaIndex } = req.body;

    const card = await Card.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!card) {
      res.status(404).json({ success: false, message: "Card not found." });
      return;
    }

    if (mediaIndex < 0 || mediaIndex >= card.media.length) {
      res.status(400).json({ success: false, message: "Invalid media index." });
      return;
    }

    const media = card.media[mediaIndex];
    if (media.publicId) {
      await cloudinary.uploader.destroy(media.publicId);
    }

    card.media.splice(mediaIndex, 1);
    await card.save();

    res.json({ success: true, message: "Media deleted successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to delete media." });
  }
};
