import express, { Request, Response } from "express";
import Waitlist from "../model/Waitlist";

const router = express.Router();

// POST /api/waitlist
router.post("/", async (req: Request, res: Response) => {
  const { email, name } = req.body;
  try {
    const waitlist = new Waitlist({ email, name });
    await waitlist.save();
    res
      .status(201)
      .json({ message: "Successfully signed up to the waitlist", waitlist });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/waitlist
router.get("/", async (req: Request, res: Response) => {
  try {
    const waitlist = await Waitlist.find().select("email name createdAt");
    res.status(200).json(waitlist);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/waitlist/count
router.get("/count", async (req: Request, res: Response) => {
  try {
    const count = await Waitlist.countDocuments();
    res.status(200).json({ count });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
