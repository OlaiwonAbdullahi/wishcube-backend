import express, { Request, Response } from "express";
import slugify from "slugify";
import { v4 as uuidv4 } from "uuid";
import Website from "../model/Website";
import { protect } from "../middleware/authMiddleware";
import {
  uploadImage,
  uploadVoice,
  uploadVideo,
  deleteFile,
} from "../config/cloudinary";
import { sendEmail } from "../utils/email";
import { asyncHandler, AppError } from "../utils/errorHandler";
import Gift from "../model/Gift";

const router = express.Router();

// Helper: Generate unique slug
const generateSlug = async (
  recipientName: string,
  occasion: string,
  custom: string | null = null,
) => {
  const base = custom
    ? slugify(custom, { lower: true, strict: true })
    : slugify(`${recipientName}-${occasion}-${uuidv4().slice(0, 6)}`, {
        lower: true,
        strict: true,
      });

  const exists = await Website.findOne({ slug: base });
  return exists ? `${base}-${uuidv4().slice(0, 4)}` : base;
};

// @desc    Get all websites for a user
// @route   GET /api/websites
// @access  Private
router.get(
  "/",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query;
    const query: any = { userId: req.user?._id };
    if (status) query.status = status;

    const websites = await Website.find(query)
      .sort("-createdAt")
      .populate("giftIds");

    res.status(200).json({
      success: true,
      message: "Websites retrieved successfully",
      data: {
        total: websites.length,
        websites,
      },
    });
  }),
);

// @desc    Create a new website
// @route   POST /api/websites
// @access  Private
router.post(
  "/",
  protect,
  asyncHandler(
    async (req: Request, res: Response, next: express.NextFunction) => {
      const user = req.user!;

      // 1. Check active website limit for Free users
      if (user.subscriptionTier === "free") {
        const activeCount = await Website.countDocuments({
          userId: user._id,
          status: "live",
        });
        if (activeCount >= 1) {
          return next(
            new AppError(
              "Free users are limited to 1 live website. Please upgrade to Pro to create more.",
              403,
            ),
          );
        }

        // 2. Prevent restricted features for Free users
        if (req.body.isPasswordProtected) {
          return next(
            new AppError("Password protection is a Pro feature.", 403),
          );
        }
        if (req.body.customSlug) {
          return next(new AppError("Custom slugs are a Pro feature.", 403));
        }
      }

      const website = await Website.create({
        ...req.body,
        userId: req.user?._id,
      });

      // If gifts are provided, link them to the website
      if (req.body.giftIds && Array.isArray(req.body.giftIds)) {
        await Gift.updateMany(
          { _id: { $in: req.body.giftIds }, senderId: req.user?._id },
          { websiteId: website._id },
        );
      }

      res.status(201).json({
        success: true,
        message: "Website created successfully",
        data: { website },
      });
    },
  ),
);

// @desc    Get single website
// @route   GET /api/websites/:id
// @access  Private
router.get(
  "/:id",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    }).populate("giftIds");
    if (!website) {
      throw new AppError("Website not found", 404);
    }
    res.status(200).json({
      success: true,
      message: "Website retrieved successfully",
      data: { website },
    });
  }),
);

// @desc    Update website
// @route   PUT /api/websites/:id
// @access  Private
router.put(
  "/:id",
  protect,
  asyncHandler(
    async (req: Request, res: Response, next: express.NextFunction) => {
      const user = req.user!;

      if (user.subscriptionTier === "free") {
        if (req.body.isPasswordProtected) {
          return next(
            new AppError("Password protection is a Pro feature.", 403),
          );
        }
        if (req.body.customSlug) {
          return next(new AppError("Custom slugs are a Pro feature.", 403));
        }
      }

      const website = await Website.findOneAndUpdate(
        { _id: req.params.id, userId: req.user?._id },
        req.body,
        { new: true, runValidators: true },
      );
      if (!website) {
        throw new AppError("Website not found", 404);
      }

      // Update gift links:
      // 1. Unlink any gifts that were previously linked but are no longer in the list
      await Gift.updateMany(
        { websiteId: website._id, _id: { $nin: req.body.giftIds || [] } },
        { websiteId: null },
      );

      // 2. Link newly added gifts
      if (req.body.giftIds && Array.isArray(req.body.giftIds)) {
        await Gift.updateMany(
          { _id: { $in: req.body.giftIds }, senderId: req.user?._id },
          { websiteId: website._id },
        );
      }

      res.status(200).json({
        success: true,
        message: "Website updated successfully",
        data: { website },
      });
    },
  ),
);

// @desc    Delete website
// @route   DELETE /api/websites/:id
// @access  Private
router.delete(
  "/:id",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });
    if (!website) {
      throw new AppError("Website not found", 404);
    }

    // Cleanup media
    for (const img of website.images) {
      if (img.publicId) await deleteFile(img.publicId).catch(console.error);
    }
    if (website.videoPublicId)
      await deleteFile(website.videoPublicId).catch(console.error);
    if (website.voiceMessagePublicId)
      await deleteFile(website.voiceMessagePublicId).catch(console.error);

    // Unlink gifts
    await Gift.updateMany({ websiteId: website._id }, { websiteId: null });

    await website.deleteOne();
    res.status(200).json({
      success: true,
      message: "Website deleted successfully",
      data: null,
    });
  }),
);

// @desc    Publish website
// @route   POST /api/websites/:id/publish
// @access  Private
router.post(
  "/:id/publish",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });
    if (!website) {
      throw new AppError("Website not found", 404);
    }

    const slug = await generateSlug(
      website.recipientName,
      website.occasion,
      req.body.customSlug,
    );
    const publicUrl = `${process.env.CLIENT_URL}/w/${slug}`;
    const expiresAt =
      req.body.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    website.slug = slug;
    website.publicUrl = publicUrl;
    website.status = "live";
    website.expiresAt = expiresAt;
    if (req.body.customSlug) website.customSlug = req.body.customSlug;

    await website.save();
    res.status(200).json({
      success: true,
      message: "Website published successfully",
      data: {
        website,
        shareUrl: publicUrl,
      },
    });
  }),
);

// @desc    Get live website (public)
// @route   GET /api/websites/live/:slug
// @access  Public
router.get(
  "/live/:slug",
  asyncHandler(async (req: Request, res: Response) => {
    const website = await Website.findOne({
      slug: req.params.slug,
      status: "live",
    }).populate({
      path: "giftIds",
      select: "-recipientBankDetails -payoutReference -redeemToken",
    });

    if (!website) {
      throw new AppError("Page not found or has expired", 404);
    }

    if (website.expiresAt && new Date() > website.expiresAt) {
      website.status = "expired";
      await website.save();
      throw new AppError("This page has expired", 410);
    }

    res.status(200).json({
      success: true,
      message: "Live website retrieved successfully",
      data: { website },
    });
  }),
);

// @desc    Submit a reply to a website
// @route   POST /api/websites/live/:slug/reply
// @access  Public
router.post(
  "/live/:slug/reply",
  asyncHandler(async (req: Request, res: Response) => {
    const { message } = req.body;
    if (!message) {
      throw new AppError("Message is required", 400);
    }

    const website = await Website.findOne({
      slug: req.params.slug,
      status: "live",
    });
    if (!website) {
      throw new AppError("Website not found", 404);
    }

    website.recipientReply = {
      message,
      repliedAt: new Date(),
    };

    await website.save();

    res.status(200).json({
      success: true,
      message: "Reply submitted successfully",
      data: {
        recipientReply: website.recipientReply,
      },
    });
  }),
);

// @desc    Submit a reaction to a website
// @route   POST /api/websites/live/:slug/react
// @access  Public
router.post(
  "/live/:slug/react",
  asyncHandler(async (req: Request, res: Response) => {
    const { emoji } = req.body;
    if (!emoji) {
      throw new AppError("Emoji is required", 400);
    }

    const website = await Website.findOne({
      slug: req.params.slug,
      status: "live",
    });
    if (!website) {
      throw new AppError("Website not found", 404);
    }

    website.reaction = {
      emoji,
      reactedAt: new Date(),
    };

    await website.save();

    res.status(200).json({
      success: true,
      message: "Reaction submitted successfully",
      data: {
        reaction: website.reaction,
      },
    });
  }),
);

export default router;
