import { Router } from "express";
import { auth } from "../middleware/auth";
import { uploadSingle } from "../middleware/upload";
import {
  createWebsite,
  getMyWebsites,
  getWebsiteById,
  updateWebsite,
  deleteWebsite,
  publishWebsite,
  getWebsiteBySubdomain,
  updatePage,
  deletePage,
  uploadMedia,
} from "../controllers/websiteController";
import {
  createWebsiteValidator,
  paginationValidator,
} from "../utils/validators";

const router = Router();

// Public routes
router.get("/s/:subdomain", getWebsiteBySubdomain);

// Protected routes
router.use(auth);

router.post("/", createWebsiteValidator, createWebsite);
router.get("/", paginationValidator, getMyWebsites);
router.get("/:id", getWebsiteById);
router.put("/:id", updateWebsite);
router.delete("/:id", deleteWebsite);
router.post("/:id/publish", publishWebsite);
router.put("/:id/pages", updatePage);
router.delete("/:id/pages", deletePage);
router.post("/:id/media", uploadSingle, uploadMedia);

export default router;
