import express, { NextFunction, Request, Response } from "express";
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
      message: "Rsvps retrieved sucessfully",
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
    const publicUrl = `https://app.usewishcube.com/r/${slug}`;
    rsvp.slug = slug;
    rsvp.publicUrl = publicUrl;
    await rsvp.save();
  }),
);

export default router;
