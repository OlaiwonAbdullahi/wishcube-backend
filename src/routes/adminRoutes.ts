import { Router } from "express";
import { auth } from "../middleware/auth";
import { admin } from "../middleware/admin";
import {
  getAdminStats,
  getAllUsers,
  getUserById,
  updateUserRole,
  disableUser,
  createGift,
  updateGift,
  deleteGift,
  getAllGifts,
  getSystemAnalytics,
} from "../controllers/adminController";
import { paginationValidator } from "../utils/validators";

const router = Router();

// All routes require auth + admin
router.use(auth);
router.use(admin);

// Dashboard
router.get("/stats", getAdminStats);
router.get("/analytics", getSystemAnalytics);

// User management
router.get("/users", paginationValidator, getAllUsers);
router.get("/users/:id", getUserById);
router.put("/users/:id/role", updateUserRole);
router.delete("/users/:id", disableUser);

// Gift management
router.get("/gifts", paginationValidator, getAllGifts);
router.post("/gifts", createGift);
router.put("/gifts/:id", updateGift);
router.delete("/gifts/:id", deleteGift);

export default router;
