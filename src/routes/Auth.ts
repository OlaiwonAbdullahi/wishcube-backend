import express, { Request, Response, NextFunction } from "express";
import User from "../model/User";
import { asyncHandler, AppError } from "../utils/errorHandler";
import { sendTokenResponse, generateAccessToken } from "../utils/token";
import { protect, authorize } from "../middleware/authMiddleware";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/email";
import {
  userWelcomeTemplate,
  passwordResetTemplate,
} from "../utils/emailTemplates";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post(
  "/register",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return next(new AppError("Please provide name, email and password", 400));
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError("User already exists", 400));
    }

    const user = await User.create({ name, email, password });
    try {
      await sendEmail({
        to: user.email,
        subject: `Welcome to ${process.env.APP_NAME || "Wishcube"}!`,
        html: userWelcomeTemplate(
          user.name,
          `${process.env.CLIENT_URL}/dashboard`,
        ),
      });
    } catch (emailError) {
      console.error("Welcome email failed to send:", emailError);
    }

    sendTokenResponse(user, 201, res);
  }),
);
router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError("Invalid credentials", 401));
    }

    if (!user.isActive) {
      return next(new AppError("Account is deactivated", 403));
    }

    user.lastLogin = new Date();
    await user.save();

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
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return next(
        new AppError(
          "Please provide a password with at least 6 characters",
          400,
        ),
      );
    }

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
