import { Router } from "express";
import { auth } from "../middleware/auth";
import { uploadSingle } from "../middleware/upload";
import {
  createCard,
  getMyCards,
  getCardById,
  updateCard,
  deleteCard,
  publishCard,
  getCardByShareLink,
  uploadMedia,
  deleteMedia,
} from "../controllers/cardController";
import {
  createCardValidator,
  updateCardValidator,
  paginationValidator,
} from "../utils/validators";

const router = Router();

// Public routes
router.get("/share/:link", getCardByShareLink);

// Protected routes
router.use(auth);

router.post("/", createCardValidator, createCard);
router.get("/", paginationValidator, getMyCards);
router.get("/:id", getCardById);
router.put("/:id", updateCardValidator, updateCard);
router.delete("/:id", deleteCard);
router.post("/:id/publish", publishCard);
router.post("/:id/media", uploadSingle, uploadMedia);
router.delete("/:id/media", deleteMedia);

export default router;
