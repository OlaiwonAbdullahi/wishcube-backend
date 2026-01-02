import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  getGiftCatalog,
  purchaseGift,
  addToGiftBox,
  getGiftBox,
  redeemGiftBox,
  getMySentGiftBoxes,
} from "../controllers/giftController";
import {
  purchaseGiftValidator,
  addToGiftBoxValidator,
  paginationValidator,
} from "../utils/validators";

const router = Router();

// Public routes
router.get("/catalog", paginationValidator, getGiftCatalog);
router.post("/redeem/:code", auth, redeemGiftBox); // Auth optional for wallet credit

// Protected routes
router.use(auth);

router.post("/purchase", purchaseGiftValidator, purchaseGift);
router.post("/box", addToGiftBoxValidator, addToGiftBox);
router.get("/box/:id", getGiftBox);
router.get("/my-boxes", getMySentGiftBoxes);

export default router;
