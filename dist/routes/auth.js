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
            user = await User_1.default.create({
                email,
                name,
                googleId,
                avatar: picture,
                authProvider: "google",
                lastLogin: new Date(),
            });
        }
        (0, token_1.sendTokenResponse)(user, 200, res);
    }
    catch (error) {
        console.error("Google Auth Error:", error);
        return next(new errorHandler_1.AppError("Google Authentication failed", 401));
    }
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
exports.default = router;
