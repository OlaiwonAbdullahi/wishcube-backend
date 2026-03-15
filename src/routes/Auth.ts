import express, { Request, Response, NextFunction } from "express";
import User, { IUser } from "../model/User";
import { asyncHandler, AppError } from "../utils/errorHandler";
import { sendTokenResponse, generateAccessToken } from "../utils/token";
import { protect } from "../middleware/authMiddleware";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/email";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
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

    // Send Welcome Email
    try {
      await sendEmail({
        to: user.email,
        subject: `Welcome to ${process.env.APP_NAME || "WishCube"}!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2 style="color: #6366f1;">Welcome to WishCube, ${user.name}! 🎁</h2>
            <p>We're thrilled to have you join our community. With WishCube, you can manage celebrations, send digital greeting cards, and find the perfect gifts for your loved ones.</p>
            <p>Ready to get started?</p>
            <a href="${process.env.CLIENT_URL}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Go to Dashboard</a>
            <p>If you have any questions, just reply to this email. We're here to help!</p>
            <p>Cheers,<br>The WishCube Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Welcome email failed to send:", emailError);
      // Don't fail registration if email fails
    }

    sendTokenResponse(user, 201, res);
  })
);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
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
  })
);

// @desc    Google login
// @route   POST /api/auth/google
// @access  Public
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
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                <h2 style="color: #6366f1;">Welcome to WishCube, ${user.name}! 🎁</h2>
                <p>We're thrilled to have you join our community via Google login.</p>
                <p>Start managing your celebrations and gifts today!</p>
                <a href="${process.env.CLIENT_URL}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Go to Dashboard</a>
                <p>Cheers,<br>The WishCube Team</p>
              </div>
            `,
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
  })
);

// @desc    Update user profile
// @route   PUT /api/auth/update-profile
// @access  Private
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
      data: user,
    });
  })
);

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get(
  "/me",
  protect,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user?._id);
    res.status(200).json({
      success: true,
      data: user,
    });
  })
);

// @desc    Refresh Token
// @route   POST /api/auth/refresh
// @access  Public
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
        process.env.JWT_REFRESH_SECRET || "default_refresh_secret"
      );
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return next(new AppError("Invalid refresh token", 401));
      }

      const accessToken = generateAccessToken((user._id as any).toString());
      res.status(200).json({ success: true, accessToken });
    } catch (error) {
      return next(new AppError("Refresh token expired or invalid", 401));
    }
  })
);

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post(
  "/forgot-password",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      return next(new AppError("Please provide an email", 400));
    }

    const user = await User.findOne({ email });

    // Security: Don't reveal if user exists
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
          400
        )
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash and set to user model
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set expire (1 hour)
    user.resetPasswordExpire = Date.now() + 3600000;

    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${
      process.env.CLIENT_URL || "http://localhost:3000"
    }/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request - WishCube",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2 style="color: #6366f1;">Password Reset Request</h2>
            <p>You are receiving this email because you (or someone else) requested a password reset for your account.</p>
            <p>Please click the button below to complete the process:</p>
            <a href="${resetUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Reset Password</a>
            <p>This link will expire in 1 hour. If you did not request this, please ignore this email and your password will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888;">If the button above doesn't work, copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #888;">${resetUrl}</p>
          </div>
        `,
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
  })
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
          400
        )
      );
    }

    // Get hashed token
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

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully. You can now log in.",
    });
  })
);

export default router;
