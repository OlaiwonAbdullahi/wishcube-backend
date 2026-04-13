import express, { Request, Response, NextFunction } from "express";
import User from "../model/User";
import { asyncHandler, AppError } from "../utils/errorHandler";
import { sendTokenResponse, generateAccessToken } from "../utils/token";
import { protect, authorize } from "../middleware/authMiddleware";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { body } from "express-validator";
import { validate } from "../middleware/validationMiddleware";
import { authRateLimiter, loginRateLimiter } from "../middleware/rateLimiter";
import { sendEmail } from "../utils/email";
import {
  userWelcomeTemplate,
  passwordResetTemplate,
  emailVerificationTemplate,
} from "../utils/emailTemplates";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Validation rules
const registerValidation = [
  body("name").notEmpty().withMessage("Name is required").trim(),
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Password must contain at least one special character"),
];

const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const resetPasswordValidation = [
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Password must contain at least one special character"),
];

router.post(
  "/register",
  loginRateLimiter,
  registerValidation,
  validate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError("User already exists", 400));
    }

    const user = await User.create({ name, email, password });

    // Generate verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${
      process.env.CLIENT_URL || "http://localhost:3000"
    }/verify-email/${verificationToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your email - WishCube",
        html: emailVerificationTemplate(user.name, verificationUrl),
      });
    } catch (emailError) {
      console.error("Verification email failed to send:", emailError);
    }

    res.status(201).json({
      success: true,
      message:
        "User registered. Please check your email to verify your account.",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isVerified: user.isVerified,
        },
      },
    });
  }),
);

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
router.get(
  "/verify-email/:token",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const emailVerificationToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationToken,
      emailVerificationExpire: { $gt: new Date() },
    });

    if (!user) {
      return next(new AppError("Invalid or expired verification token", 400));
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    // Send welcome email after verification
    try {
      await sendEmail({
        to: user.email,
        subject: `Welcome to ${process.env.APP_NAME || "WishCube"}!`,
        html: userWelcomeTemplate(
          user.name,
          `${process.env.CLIENT_URL || "http://localhost:3000"}/dashboard`,
        ),
      });
    } catch (emailError) {
      console.error("Welcome email failed to send:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  }),
);

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
router.post(
  "/resend-verification",
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      return next(new AppError("Please provide an email address", 400));
    }

    const user = await User.findOne({ email });

    if (!user) {
      return next(new AppError("No account found with that email", 404));
    }

    if (user.isVerified) {
      return next(new AppError("Email is already verified", 400));
    }

    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${
      process.env.CLIENT_URL || "http://localhost:3000"
    }/verify-email/${verificationToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your email - WishCube",
        html: emailVerificationTemplate(user.name, verificationUrl),
      });

      res.status(200).json({
        success: true,
        message: "Verification email resent successfully.",
      });
    } catch (emailError) {
      console.error("Verification email failed to send:", emailError);
      return next(new AppError("Email could not be sent", 500));
    }
  }),
);

router.post(
  "/login",
  loginRateLimiter,
  loginValidation,
  validate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new AppError("Invalid credentials", 401));
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil(
        (user.lockUntil.getTime() - Date.now()) / 60000,
      );
      return next(
        new AppError(
          `Account is locked due to multiple failed attempts. Please try again in ${remainingTime} minutes`,
          403,
        ),
      );
    }

    if (!(await user.comparePassword(password))) {
      await user.incrementLoginAttempts();
      return next(new AppError("Invalid credentials", 401));
    }

    if (!user.isActive) {
      return next(new AppError("Account is deactivated", 403));
    }

    if (!user.isVerified) {
      return next(new AppError("Please verify your email to log in", 401));
    }

    user.lastLogin = new Date();
    await user.resetLoginAttempts();

    sendTokenResponse(user, 200, res);
  }),
);
router.post(
  "/google",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.body;

    if (!token) {
      return next(new AppError("Google ID token is required", 400));
    }

    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return next(new AppError("Invalid Google token", 400));
      }

      const { email, name, sub: googleId, picture } = payload;

      let user = await User.findOne({ email });
      let isNewUser = false;

      if (user) {
        if (!user.isActive) {
          return next(new AppError("Account is deactivated", 403));
        }

        user.googleId = googleId;
        user.avatar = picture || user.avatar;
        user.lastLogin = new Date();
        await user.save();
      } else {
        isNewUser = true;
        user = await User.create({
          email,
          name,
          googleId,
          avatar: picture,
          authProvider: "google",
          isVerified: true, // Google accounts are pre-verified
          lastLogin: new Date(),
        });
      }

      if (isNewUser) {
        try {
          await sendEmail({
            to: user.email,
            subject: `Welcome to ${process.env.APP_NAME || "WishCube"}!`,
            html: userWelcomeTemplate(
              user.name,
              process.env.CLIENT_URL || "",
              true,
            ),
          });
        } catch (emailError) {
          console.error("Welcome email failed to send:", emailError);
        }
      }

      sendTokenResponse(user, 200, res);
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      return next(new AppError("Google Authentication failed", 401));
    }
  }),
);
router.put(
  "/update-profile",
  protect,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { name, avatar } = req.body;

    const user = await User.findById(req.user?._id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { user },
    });
  }),
);
router.get(
  "/me",
  protect,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user?._id);
    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: { user },
    });
  }),
);
router.post(
  "/refresh",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError("Refresh token is required", 400));
    }

    try {
      const decoded: any = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || "default_refresh_secret",
      );
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return next(new AppError("Invalid refresh token", 401));
      }

      const accessToken = generateAccessToken((user._id as any).toString());
      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: { accessToken },
      });
    } catch (error) {
      return next(new AppError("Refresh token expired or invalid", 401));
    }
  }),
);
router.post(
  "/forgot-password",
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      return next(new AppError("Please provide an email", 400));
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with that email, a reset link has been sent",
      });
    }

    if (user.authProvider === "google") {
      return next(
        new AppError(
          "This account uses Google login. Please use Google to sign in.",
          400,
        ),
      );
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 3600000;

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${
      process.env.CLIENT_URL || "http://localhost:3000"
    }/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request - WishCube",
        html: passwordResetTemplate(user.name, resetUrl),
      });

      res.status(200).json({
        success: true,
        message:
          "If an account exists with that email, a reset link has been sent",
      });
    } catch (err: any) {
      console.error("Email send error:", err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new AppError(`Email could not be sent: ${err.message}`, 500));
    }
  }),
);

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
router.post(
  "/reset-password/:token",
  authRateLimiter,
  resetPasswordValidation,
  validate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { password } = req.body;

    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError("Invalid or expired reset token", 400));
    }
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully. You can now log in.",
    });
  }),
);

// @desc    Admin: Get all users
// @route   GET /api/auth
// @access  Private/Admin
router.get(
  "/",
  protect,
  authorize("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const users = await User.find().sort("-createdAt");
    res.status(200).json({
      success: true,
      message: "All users retrieved successfully",
      data: {
        total: users.length,
        users,
      },
    });
  }),
);

export default router;
