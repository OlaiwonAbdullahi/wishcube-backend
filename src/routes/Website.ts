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
import User from "../model/User";

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
    }).populate("userId", "name email");
    if (!website) {
      throw new AppError("Website not found", 404);
    }

    website.recipientReply = {
      message,
      repliedAt: new Date(),
    };

    await website.save();

    // Notify the sender (non-blocking)
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
        html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F3F3F3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border:2px solid #191A23;border-bottom:5px solid #191A23;box-shadow:4px 4px 0 rgba(25,26,35,.15);max-width:560px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:#191A23;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">WishCube</p>
            <div style="display:inline-block;background:#E6D1FF;border:2px solid #fff;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;margin-bottom:14px;">💌</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">They Replied!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">${website.recipientName} sent you a message</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:32px 40px;background:#ffffff;">
            <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${sender.name || "there"},</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
              Great news! <strong>${website.recipientName}</strong> just replied to your <strong>${website.occasion}</strong> greeting.
            </p>

            <!-- Reply bubble -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#F3F3F3;border:2px solid #191A23;border-bottom:4px solid #191A23;margin-bottom:28px;">
              <tr>
                <td style="padding:24px;">
                  <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#191A23;">Their Message</p>
                  <p style="margin:0;font-size:16px;color:#191A23;line-height:1.7;font-style:italic;">&ldquo;${message}&rdquo;</p>
                  <p style="margin:12px 0 0;font-size:11px;color:#a1a1aa;">${repliedAt}</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${process.env.CLIENT_URL}/dashboard/websites"
                  style="display:inline-block;background:#191A23;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:14px 36px;border:2px solid #191A23;border-bottom:4px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.2);">
                  View My Websites &rarr;
                </a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
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
      }).catch((err) => console.error("Reply notification email error:", err));
    }

    res.status(200).json({
      success: true,
      message: "Reply submitted successfully",
      data: { recipientReply: website.recipientReply },
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
    }).populate("userId", "name email");
    if (!website) {
      throw new AppError("Website not found", 404);
    }

    website.reaction = {
      emoji,
      reactedAt: new Date(),
    };

    await website.save();

    // Notify the sender (non-blocking)
    const sender = website.userId as any;
    if (sender?.email) {
      sendEmail({
        to: sender.email,
        subject: `${website.recipientName} reacted to your greeting! ${emoji}`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F3F3F3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border:2px solid #191A23;border-bottom:5px solid #191A23;box-shadow:4px 4px 0 rgba(25,26,35,.15);max-width:560px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:#191A23;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">WishCube</p>
            <div style="display:inline-block;background:#FFF3CD;border:2px solid #fff;width:72px;height:72px;line-height:72px;text-align:center;font-size:40px;margin-bottom:14px;">${emoji}</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">You Got a Reaction!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">${website.recipientName} reacted to your greeting</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:32px 40px;background:#ffffff;">
            <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${sender.name || "there"},</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
              <strong>${website.recipientName}</strong> just reacted to your <strong>${website.occasion}</strong> greeting with:
            </p>

            <!-- Emoji highlight -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#F3F3F3;border:2px solid #191A23;border-bottom:4px solid #191A23;margin-bottom:28px;">
              <tr>
                <td style="padding:32px;text-align:center;">
                  <span style="font-size:64px;line-height:1;">${emoji}</span>
                  <p style="margin:16px 0 0;font-size:13px;color:#52525b;">Sent on ${new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "long", timeStyle: "short" })}</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${process.env.CLIENT_URL}/dashboard/websites"
                  style="display:inline-block;background:#191A23;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:14px 36px;border:2px solid #191A23;border-bottom:4px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.2);">
                  View My Websites &rarr;
                </a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
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
