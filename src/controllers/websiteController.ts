import { Response } from "express";
import { validationResult } from "express-validator";
import Website from "../models/Website";
import { AuthRequest } from "../types";
import {
  generateShareableLink,
  getPagination,
  formatPaginatedResponse,
} from "../utils/helpers";
import cloudinary from "../config/cloudinary";

// Create Website
export const createWebsite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { title, occasion, subdomain, theme, pages } = req.body;

    // Check if subdomain is taken
    const existingWebsite = await Website.findOne({ subdomain });
    if (existingWebsite) {
      res.status(400).json({
        success: false,
        message: "This subdomain is already taken.",
      });
      return;
    }

    const website = await Website.create({
      userId: req.user?._id,
      title,
      occasion,
      subdomain,
      theme,
      pages,
    });

    res.status(201).json({
      success: true,
      message: "Website created successfully.",
      data: website,
    });
  } catch (error) {
    console.error("Create website error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create website." });
  }
};

// Get My Websites
export const getMyWebsites = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { skip } = getPagination(page, limit);

    const [websites, total] = await Promise.all([
      Website.find({ userId: req.user?._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Website.countDocuments({ userId: req.user?._id }),
    ]);

    res.json({
      success: true,
      ...formatPaginatedResponse(websites, total, page, limit),
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch websites." });
  }
};

// Get Website by ID
export const getWebsiteById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    }).populate("giftBox");

    if (!website) {
      res.status(404).json({ success: false, message: "Website not found." });
      return;
    }

    res.json({ success: true, data: website });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch website." });
  }
};

// Update Website
export const updateWebsite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { title, occasion, theme, pages, expiresAt } = req.body;

    const website = await Website.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      { title, occasion, theme, pages, expiresAt },
      { new: true, runValidators: true }
    );

    if (!website) {
      res.status(404).json({ success: false, message: "Website not found." });
      return;
    }

    res.json({
      success: true,
      message: "Website updated successfully.",
      data: website,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update website." });
  }
};

// Delete Website
export const deleteWebsite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const website = await Website.findOneAndDelete({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!website) {
      res.status(404).json({ success: false, message: "Website not found." });
      return;
    }

    // Delete media from Cloudinary
    for (const media of website.media) {
      if (media.publicId) {
        await cloudinary.uploader.destroy(media.publicId);
      }
    }

    res.json({ success: true, message: "Website deleted successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to delete website." });
  }
};

// Publish Website
export const publishWebsite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!website) {
      res.status(404).json({ success: false, message: "Website not found." });
      return;
    }

    if (!website.shareableLink) {
      website.shareableLink = generateShareableLink();
    }
    website.isPublished = true;
    await website.save();

    res.json({
      success: true,
      message: "Website published successfully.",
      data: {
        subdomain: website.subdomain,
        shareableLink: website.shareableLink,
        fullUrl: `${process.env.APP_URL}/w/${website.subdomain}`,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to publish website." });
  }
};

// Get Website by Subdomain (Public)
export const getWebsiteBySubdomain = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { subdomain } = req.params;

    const website = await Website.findOne({
      subdomain,
      isPublished: true,
    }).populate("giftBox");

    if (!website) {
      res.status(404).json({ success: false, message: "Website not found." });
      return;
    }

    // Check if expired
    if (website.expiresAt && new Date() > website.expiresAt) {
      res
        .status(410)
        .json({ success: false, message: "This website has expired." });
      return;
    }

    // Increment view count
    website.viewCount += 1;
    await website.save();

    res.json({ success: true, data: website });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch website." });
  }
};

// Add/Update Page
export const updatePage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { pageIndex, title, content, order } = req.body;

    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!website) {
      res.status(404).json({ success: false, message: "Website not found." });
      return;
    }

    if (
      pageIndex !== undefined &&
      pageIndex >= 0 &&
      pageIndex < website.pages.length
    ) {
      // Update existing page
      website.pages[pageIndex] = {
        ...website.pages[pageIndex],
        title,
        content,
        order,
      };
    } else {
      // Add new page
      website.pages.push({ title, content, order: website.pages.length });
    }

    await website.save();

    res.json({
      success: true,
      message: "Page updated successfully.",
      data: website.pages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update page." });
  }
};

// Delete Page
export const deletePage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { pageIndex } = req.body;

    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!website) {
      res.status(404).json({ success: false, message: "Website not found." });
      return;
    }

    if (website.pages.length <= 1) {
      res
        .status(400)
        .json({
          success: false,
          message: "Website must have at least one page.",
        });
      return;
    }

    if (pageIndex < 0 || pageIndex >= website.pages.length) {
      res.status(400).json({ success: false, message: "Invalid page index." });
      return;
    }

    website.pages.splice(pageIndex, 1);
    await website.save();

    res.json({ success: true, message: "Page deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete page." });
  }
};

// Upload Media
export const uploadMedia = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!website) {
      res.status(404).json({ success: false, message: "Website not found." });
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

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "wishcube/websites",
          resource_type: mediaType === "image" ? "image" : "video",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file!.buffer);
    });

    website.media.push({
      type: mediaType,
      url: result.secure_url,
      publicId: result.public_id,
      name: req.file.originalname,
    });

    await website.save();

    res.json({
      success: true,
      message: "Media uploaded successfully.",
      data: website.media[website.media.length - 1],
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to upload media." });
  }
};
