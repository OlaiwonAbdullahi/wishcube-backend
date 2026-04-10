import express, { Request, Response } from "express";
import slugify from "slugify";
import { v4 as uuidv4 } from "uuid";
import Website from "../model/Website";
import { protect } from "../middleware/authMiddleware";
import { deleteFile } from "../config/cloudinary";
import { sendEmail } from "../utils/email";
import {
  websitePublishedTemplate,
  websiteReplyTemplate,
  websiteReactionTemplate,
} from "../utils/emailTemplates";
import { asyncHandler, AppError } from "../utils/errorHandler";
import Gift from "../model/Gift";
import Order from "../model/Order";

const router = express.Router();

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
router.post(
  "/",
  protect,
  asyncHandler(
    async (req: Request, res: Response, next: express.NextFunction) => {
      const user = req.user!;
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
      await Gift.updateMany(
        { websiteId: website._id, _id: { $nin: req.body.giftIds || [] } },
        { websiteId: null },
      );
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
    for (const img of website.images) {
      if (img.publicId) await deleteFile(img.publicId).catch(console.error);
    }
    if (website.videoPublicId)
      await deleteFile(website.videoPublicId).catch(console.error);
    if (website.voiceMessagePublicId)
      await deleteFile(website.voiceMessagePublicId).catch(console.error);

    await Gift.updateMany({ websiteId: website._id }, { websiteId: null });

    await website.deleteOne();
    res.status(200).json({
      success: true,
      message: "Website deleted successfully",
      data: null,
    });
  }),
);
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
    if (req.body.recipientEmail !== undefined)
      website.recipientEmail = req.body.recipientEmail;

    await website.save();

    if (website.recipientEmail) {
      const senderName = req.user?.name || "Someone";
      const occasionText = website.occasion ? ` for ${website.occasion}` : "";

      sendEmail({
        to: website.recipientEmail,
        subject: `${senderName} has sent you a WishCube! 🎁`,
        html: websitePublishedTemplate(
          website.recipientName,
          senderName,
          occasionText,
          publicUrl,
        ),
      }).catch((err) =>
        console.error("Website publish notification email error:", err),
      );
    }

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
router.get(
  "/live/:slug",
  asyncHandler(async (req: Request, res: Response) => {
    const website = await Website.findOne({
      slug: req.params.slug,
      status: "live",
    }).populate({
      path: "giftIds",
      select:
        "type amount amountPaid currency productSnapshot giftMessage status escrowStatus redeemToken expiresAt deliveryAddress",
    });

    if (!website) {
      throw new AppError("Page not found or has expired", 404);
    }

    if (website.expiresAt && new Date() > website.expiresAt) {
      website.status = "expired";
      await website.save();
      throw new AppError("This page has expired", 410);
    }

    // Attach order info for physical gifts
    const giftsWithOrders = await Promise.all(
      (website.giftIds as any[]).map(async (gift) => {
        const giftObj = gift.toObject();
        if (gift.type === "physical" && gift.status === "redeemed") {
          const order = await Order.findOne({ giftId: gift._id }).select("_id status");
          if (order) {
            giftObj.orderId = order._id;
            giftObj.orderStatus = order.status;
          }
        }
        return giftObj;
      }),
    );

    const websiteData = website.toObject();
    websiteData.giftIds = giftsWithOrders;

    res.status(200).json({
      success: true,
      message: "Live website retrieved successfully",
      data: { website: websiteData },
    });
  }),
);
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
    }).populate("userId", "name email");
    if (!website) {
      throw new AppError("Website not found", 404);
    }

    website.recipientReply = {
      message,
      repliedAt: new Date(),
    };

    await website.save();
    const sender = website.userId as any;
    if (sender?.email) {
      const repliedAt = new Date().toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
        dateStyle: "long",
        timeStyle: "short",
      });
      sendEmail({
        to: sender.email,
        subject: `${website.recipientName} replied to your greeting! 💌`,
        html: websiteReplyTemplate(
          website.recipientName,
          sender.name,
          website.occasion,
          message,
          repliedAt,
          `${process.env.CLIENT_URL}/dashboard`,
        ),
      }).catch((err) =>
        console.error("Website reply notification email error:", err),
      );
    }

    res.status(200).json({
      success: true,
      message: "Reply submitted successfully",
      data: { recipientReply: website.recipientReply },
    });
  }),
);
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
    }).populate("userId", "name email");
    if (!website) {
      throw new AppError("Website not found", 404);
    }

    website.reaction = {
      emoji,
      reactedAt: new Date(),
    };

    await website.save();
    const sender = website.userId as any;
    if (sender?.email) {
      sendEmail({
        to: sender.email,
        subject: `${website.recipientName} reacted to your greeting! ${emoji}`,
        html: websiteReactionTemplate(
          website.recipientName,
          sender.name,
          website.occasion,
          emoji,
          new Date().toLocaleString("en-NG", {
            timeZone: "Africa/Lagos",
            dateStyle: "long",
            timeStyle: "short",
          }),
          `${process.env.CLIENT_URL}/dashboard/websites`,
        ),
      }).catch((err) => console.error("React notification email error:", err));
    }

    res.status(200).json({
      success: true,
      message: "Reaction submitted successfully",
      data: { reaction: website.reaction },
    });
  }),
);

export default router;
