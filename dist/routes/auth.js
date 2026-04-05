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
const emailTemplates_1 = require("../utils/emailTemplates");
const router = express_1.default.Router();
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
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
    try {
        await (0, email_1.sendEmail)({
            to: user.email,
            subject: `Welcome to ${process.env.APP_NAME || "Wishcube"}!`,
            html: (0, emailTemplates_1.userWelcomeTemplate)(user.name, `${process.env.CLIENT_URL}/dashboard`),
        });
    }
    catch (emailError) {
        console.error("Welcome email failed to send:", emailError);
    }
    (0, token_1.sendTokenResponse)(user, 201, res);
}));
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
                    html: (0, emailTemplates_1.userWelcomeTemplate)(user.name, process.env.CLIENT_URL || "", true),
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
        data: { user },
    });
}));
router.get("/me", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const user = await User_1.default.findById(req.user?._id);
    res.status(200).json({
        success: true,
        message: "User profile retrieved successfully",
        data: { user },
    });
}));
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
        res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            data: { accessToken },
        });
    }
    catch (error) {
        return next(new errorHandler_1.AppError("Refresh token expired or invalid", 401));
    }
}));
router.post("/forgot-password", (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        return next(new errorHandler_1.AppError("Please provide an email", 400));
    }
    const user = await User_1.default.findOne({ email });
    if (!user) {
        return res.status(200).json({
            success: true,
            message: "If an account exists with that email, a reset link has been sent",
        });
    }
    if (user.authProvider === "google") {
        return next(new errorHandler_1.AppError("This account uses Google login. Please use Google to sign in.", 400));
    }
    const resetToken = crypto_1.default.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto_1.default
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    user.resetPasswordExpire = Date.now() + 3600000;
    await user.save({ validateBeforeSave: false });
    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password/${resetToken}`;
    try {
        await (0, email_1.sendEmail)({
            to: user.email,
            subject: "Password Reset Request - WishCube",
            html: (0, emailTemplates_1.passwordResetTemplate)(user.name, resetUrl),
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
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.status(200).json({
        success: true,
        message: "Password updated successfully. You can now log in.",
    });
}));
// @desc    Admin: Get all users
// @route   GET /api/auth
// @access  Private/Admin
router.get("/", authMiddleware_1.protect, (0, authMiddleware_1.authorize)("admin"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const users = await User_1.default.find().sort("-createdAt");
    res.status(200).json({
        success: true,
        message: "All users retrieved successfully",
        data: {
            total: users.length,
            users,
        },
    });
}));
exports.default = router;
