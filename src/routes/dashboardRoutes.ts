import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  getDashboardStats,
  getRecentActivity,
  aiGenerateGreeting,
  aiSuggestDesign,
  aiGetRecommendations,
} from "../controllers/dashboardController";

const router = Router();

// All routes require auth
router.use(auth);

router.get("/stats", getDashboardStats);
router.get("/recent", getRecentActivity);

// AI endpoints
router.post("/ai/greeting", aiGenerateGreeting);
router.post("/ai/design", aiSuggestDesign);
router.post("/ai/recommendations", aiGetRecommendations);

export default router;
