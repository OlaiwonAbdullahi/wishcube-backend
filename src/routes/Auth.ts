import express, { Request, Response, NextFunction } from "express";
import User, { IUser } from "../model/User";
import { asyncHandler, AppError } from "../utils/errorHandler";
import { sendTokenResponse, generateAccessToken } from "../utils/token";
import { protect } from "../middleware/authMiddleware";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

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

      if (user) {
        if (!user.isActive) {
          return next(new AppError("Account is deactivated", 403));
        }

        user.googleId = googleId;
        user.avatar = picture || user.avatar;
        user.lastLogin = new Date();
        await user.save();
      } else {
        user = await User.create({
          email,
          name,
          googleId,
          avatar: picture,
          authProvider: "google",
          lastLogin: new Date(),
        });
      }

      sendTokenResponse(user, 200, res);
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      return next(new AppError("Google Authentication failed", 401));
    }
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

export default router;
