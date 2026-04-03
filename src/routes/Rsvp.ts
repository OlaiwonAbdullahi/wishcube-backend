import express, { NextFunction, Request, Response } from "express";
import { protect } from "../middleware/authMiddleware";
import Rsvp from "../model/Rsvp";
import { asyncHandler } from "../utils/errorHandler";

const router = express.Router();

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

export default router;
