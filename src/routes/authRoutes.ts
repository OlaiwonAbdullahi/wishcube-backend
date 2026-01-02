import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  register,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getProfile,
  updateProfile,
} from "../controllers/authController";
import {
  registerValidator,
  loginValidator,
  resetPasswordValidator,
} from "../utils/validators";

const router = Router();

// Public routes
router.post("/register", registerValidator, register);
router.post("/login", loginValidator, login);
router.post("/refresh", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordValidator, resetPassword);
router.get("/verify/:token", verifyEmail);

// Protected routes
router.get("/profile", auth, getProfile);
router.put("/profile", auth, updateProfile);

export default router;
