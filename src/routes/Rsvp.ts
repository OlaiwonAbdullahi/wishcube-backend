import express, { Request, Response } from "express";
import { protect } from "../middleware/authMiddleware";
import Rsvp from "../model/Rsvp";
import { AppError, asyncHandler } from "../utils/errorHandler";
import slugify from "slugify";

import { v4 as uuidv4 } from "uuid";

const router = express.Router();
const generateSlug = async (occasion: string) => {
  const base = slugify(`${occasion}-${uuidv4().slice(0, 6)}`, {
    lower: true,
    strict: true,
  });

  const exists = await Rsvp.findOne({ slug: base });
  return exists ? `${base}-${uuidv4().slice(0, 4)}` : base;
};
router.get(
  "/",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query;
    const query: any = { userId: req.user?._id };
    if (status) query.status = status;

    const rsvps = await Rsvp.find(query).sort("-createdAt");
    res.status(200).json({
      success: true,
      message: "RSVPs retrieved successfully",
      data: {
        total: rsvps.length,
        rsvps,
      },
    });
  }),
);

router.post(
  "/",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const rsvp = await Rsvp.create({
      ...req.body,
      userId: req.user?._id,
    });
    res.status(201).json({
      success: true,
      message: "Rsvps retrieved sucessfully",
      data: {
        rsvp,
      },
    });
  }),
);

router.post(
  "/:id/publish",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const rsvp = await Rsvp.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });
    if (!rsvp) {
      throw new AppError("Rsvp Page not Found", 404);
    }
    const slug = await generateSlug(rsvp.occasion);
    const publicUrl = `${process.env.CLIENT_URL || "https://app.usewishcube.com"}/r/${slug}`;
    rsvp.slug = slug;
    rsvp.publicUrl = publicUrl;
    rsvp.status = "live";
    await rsvp.save();

    res.status(200).json({
      success: true,
      message: "RSVP published successfully",
      data: {
        rsvp,
        shareUrl: publicUrl,
      },
    });
  }),
);
router.get(
  "/live/:slug",
  asyncHandler(async (req: Request, res: Response) => {
    const rsvp = await Rsvp.findOne({
      slug: req.params.slug,
      status: "live",
    });

    if (!rsvp) {
      throw new AppError("RSVP page not found or has expired", 404);
    }
    if (rsvp.occasionDate && new Date() > rsvp.occasionDate) {
      rsvp.status = "expired";
      await rsvp.save();
      throw new AppError("This RSVP page has expired", 410);
    }
    rsvp.views = (rsvp.views || 0) + 1;
    await rsvp.save();
    res.status(200).json({
      success: true,
      message: "RSVP retrieved successfully",
      data: {
        rsvp,
      },
    });
  }),
);
// @desc    Guest submits an RSVP response
// @route   POST /api/rsvp/live/:slug/respond
// @access  Public
router.post(
  "/live/:slug/respond",
  asyncHandler(async (req: Request, res: Response) => {
    const { name, email, response, plusOnes, message, answers } = req.body;

    if (!name || !email || !response) {
      throw new AppError("Name, email and response are required", 400);
    }
    if (!["yes", "no", "maybe"].includes(response)) {
      throw new AppError("Response must be yes, no, or maybe", 400);
    }

    const rsvp = await Rsvp.findOne({ slug: req.params.slug, status: "live" });
    if (!rsvp) {
      throw new AppError("RSVP page not found or has expired", 404);
    }
    if (rsvp.occasionDate && new Date() > rsvp.occasionDate) {
      throw new AppError("This event has already passed", 410);
    }

    const existing = rsvp.attendees.find(
      (a) => a.email.toLowerCase() === String(email).toLowerCase(),
    );

    // Custom question answers: require anything the host marked required.
    const providedAnswers: { questionId: string; value: string }[] = Array.isArray(
      answers,
    )
      ? answers
      : [];
    const answerMap = new Map(
      providedAnswers.map((a) => [a.questionId, a.value]),
    );
    for (const q of rsvp.customQuestions) {
      const val = answerMap.get(q.id);
      if (q.required && (!val || !String(val).trim())) {
        throw new AppError(`Please answer: ${q.label}`, 400);
      }
    }
    const resolvedAnswers = rsvp.customQuestions.map((q) => ({
      questionId: q.id,
      question: q.label,
      value: answerMap.get(q.id) || "",
    }));

    // Capacity check (only "yes" responses count toward the headcount).
    if (rsvp.capacity && response === "yes") {
      const newHeadcount = 1 + (plusOnes || 0);
      const otherYesHeadcount = rsvp.attendees
        .filter(
          (a) =>
            a.response === "yes" &&
            a.email.toLowerCase() !== String(email).toLowerCase(),
        )
        .reduce((sum, a) => sum + 1 + (a.plusOnes || 0), 0);
      if (otherYesHeadcount + newHeadcount > rsvp.capacity) {
        throw new AppError("Sorry, this event is at full capacity.", 400);
      }
    }

    if (existing) {
      existing.name = name;
      existing.response = response;
      existing.plusOnes = plusOnes || 0;
      existing.message = message || "";
      existing.answers = resolvedAnswers;
      existing.respondedAt = new Date();
    } else {
      rsvp.attendees.push({
        name,
        email,
        response,
        plusOnes: plusOnes || 0,
        message: message || "",
        answers: resolvedAnswers,
        respondedAt: new Date(),
      } as any);
    }

    await rsvp.save();

    res.status(200).json({
      success: true,
      message: "RSVP response submitted successfully",
      data: {
        response: {
          name,
          email,
          response,
          plusOnes: plusOnes || 0,
          message: message || "",
          answers: resolvedAnswers,
        },
      },
    });
  }),
);

router.put(
  "/:id",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const rsvp = await Rsvp.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!rsvp) {
      throw new AppError("RSVP not found", 404);
    }
    res.status(200).json({
      success: true,
      message: "RSVP updated successfully",
      data: {
        rsvp,
      },
    });
  }),
);
router.delete(
  "/:id",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const rsvp = await Rsvp.findOneAndDelete({
      _id: req.params.id,
      userId: req.user?._id,
    });
    if (!rsvp) {
      throw new AppError("RSVP not found", 404);
    }
    res.status(200).json({
      success: true,
      message: "RSVP deleted successfully",
      data: null,
    });
  }),
);

export default router;
