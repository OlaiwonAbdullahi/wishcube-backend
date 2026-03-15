"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = __importDefault(require("../model/User"));
const errorHandler_1 = require("../utils/errorHandler");
const token_1 = require("../utils/token");
const authMiddleware_1 = require("../middleware/authMiddleware");
const google_auth_library_1 = require("google-auth-library");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const email_1 = require("../utils/email");
const router = express_1.default.Router();
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post("/register", (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return next(new errorHandler_1.AppError("Please provide name, email and password", 400));
    }
    const userExists = await User_1.default.findOne({ email });
    if (userExists) {
        return next(new errorHandler_1.AppError("User already exists", 400));
    }
    const user = await User_1.default.create({ name, email, password });
    // Send Welcome Email
    try {
        await (0, email_1.sendEmail)({
            to: user.email,
            subject: `Welcome to ${process.env.APP_NAME || "WishCube"}!`,
            html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2 style="color: #6366f1;">Welcome to WishCube, ${user.name}! 🎁</h2>
            <p>We're thrilled to have you onboard. With WishCube, you can manage celebrations, send digital greeting cards & Websites, and find the perfect gifts for your loved ones.</p>
            <p>Ready to get started?</p>
            <a href="${process.env.CLIENT_URL}/dashboard" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Go to Dashboard</a>
            <p>If you have any questions, just reply to this email. We're here to help!</p>
            <p>Cheers,<br>The WishCube Team</p>
          </div>
        `,
        });
    }
    catch (emailError) {
        console.error("Welcome email failed to send:", emailError);
        // Don't fail registration if email fails
    }
    (0, token_1.sendTokenResponse)(user, 201, res);
}));
// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post("/login", (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new errorHandler_1.AppError("Please provide email and password", 400));
    }
    const user = await User_1.default.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
        return next(new errorHandler_1.AppError("Invalid credentials", 401));
    }
    if (!user.isActive) {
        return next(new errorHandler_1.AppError("Account is deactivated", 403));
    }
    user.lastLogin = new Date();
    await user.save();
    (0, token_1.sendTokenResponse)(user, 200, res);
}));
// @desc    Google login
// @route   POST /api/auth/google
// @access  Public
router.post("/google", (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { token } = req.body;
    if (!token) {
        return next(new errorHandler_1.AppError("Google ID token is required", 400));
    }
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload) {
            return next(new errorHandler_1.AppError("Invalid Google token", 400));
        }
        const { email, name, sub: googleId, picture } = payload;
        let user = await User_1.default.findOne({ email });
        let isNewUser = false;
        if (user) {
            if (!user.isActive) {
                return next(new errorHandler_1.AppError("Account is deactivated", 403));
            }
            user.googleId = googleId;
            user.avatar = picture || user.avatar;
            user.lastLogin = new Date();
            await user.save();
        }
        else {
            isNewUser = true;
            user = await User_1.default.create({
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
                await (0, email_1.sendEmail)({
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
            }
            catch (emailError) {
                console.error("Welcome email failed to send:", emailError);
            }
        }
        (0, token_1.sendTokenResponse)(user, 200, res);
    }
    catch (error) {
        console.error("Google Auth Error:", error);
        return next(new errorHandler_1.AppError("Google Authentication failed", 401));
    }
}));
// @desc    Update user profile
// @route   PUT /api/auth/update-profile
// @access  Private
router.put("/update-profile", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { name, avatar } = req.body;
    const user = await User_1.default.findById(req.user?._id);
    if (!user) {
        return next(new errorHandler_1.AppError("User not found", 404));
    }
    if (name)
        user.name = name;
    if (avatar)
        user.avatar = avatar;
    await user.save();
    res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: user,
    });
}));
// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get("/me", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const user = await User_1.default.findById(req.user?._id);
    res.status(200).json({
        success: true,
        data: user,
    });
}));
// @desc    Refresh Token
// @route   POST /api/auth/refresh
// @access  Public
router.post("/refresh", (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return next(new errorHandler_1.AppError("Refresh token is required", 400));
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "default_refresh_secret");
        const user = await User_1.default.findById(decoded.id);
        if (!user || !user.isActive) {
            return next(new errorHandler_1.AppError("Invalid refresh token", 401));
        }
        const accessToken = (0, token_1.generateAccessToken)(user._id.toString());
        res.status(200).json({ success: true, accessToken });
    }
    catch (error) {
        return next(new errorHandler_1.AppError("Refresh token expired or invalid", 401));
    }
}));
// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post("/forgot-password", (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        return next(new errorHandler_1.AppError("Please provide an email", 400));
    }
    const user = await User_1.default.findOne({ email });
    // Security: Don't reveal if user exists
    if (!user) {
        return res.status(200).json({
            success: true,
            message: "If an account exists with that email, a reset link has been sent",
        });
    }
    if (user.authProvider === "google") {
        return next(new errorHandler_1.AppError("This account uses Google login. Please use Google to sign in.", 400));
    }
    // Generate reset token
    const resetToken = crypto_1.default.randomBytes(32).toString("hex");
    // Hash and set to user model
    user.resetPasswordToken = crypto_1.default
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    // Set expire (1 hour)
    user.resetPasswordExpire = Date.now() + 3600000;
    await user.save({ validateBeforeSave: false });
    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password/${resetToken}`;
    try {
        await (0, email_1.sendEmail)({
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
            message: "If an account exists with that email, a reset link has been sent",
        });
    }
    catch (err) {
        console.error("Email send error:", err);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new errorHandler_1.AppError(`Email could not be sent: ${err.message}`, 500));
    }
}));
// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
router.post("/reset-password/:token", (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { password } = req.body;
    if (!password || password.length < 6) {
        return next(new errorHandler_1.AppError("Please provide a password with at least 6 characters", 400));
    }
    // Get hashed token
    const resetPasswordToken = crypto_1.default
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");
    const user = await User_1.default.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) {
        return next(new errorHandler_1.AppError("Invalid or expired reset token", 400));
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
}));
exports.default = router;
