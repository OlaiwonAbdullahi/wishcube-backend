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
            html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F3F3F3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border:2px solid #191A23;border-bottom:5px solid #191A23;box-shadow:4px 4px 0 rgba(25,26,35,.15);max-width:560px;width:100%;">
        <tr>
          <td style="background:#191A23;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">WishCube</p>
            <div style="display:inline-block;background:#E6D1FF;border:2px solid #fff;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;margin-bottom:14px;">🎉</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Welcome to WishCube!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">We're thrilled to have you onboard, ${user.name}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;background:#ffffff;">
            <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${user.name},</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
              With WishCube, you can manage celebrations, send digital greeting cards & websites, and find the perfect gifts for your loved ones. We're excited to help you celebrate those special moments!
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${process.env.CLIENT_URL}/dashboard"
                  style="display:inline-block;background:#191A23;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:14px 36px;border:2px solid #191A23;border-bottom:4px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.2);">
                  Go to Dashboard &rarr;
                </a>
              </td></tr>
            </table>
            <p style="margin:28px 0 0;color:#52525b;font-size:13px;line-height:1.7;text-align:center;">
              If you have any questions, just reply to this email. We're here to help!
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background:#F3F3F3;border-top:2px solid #191A23;text-align:center;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;">&copy; ${new Date().getFullYear()} WishCube. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
                    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F3F3F3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border:2px solid #191A23;border-bottom:5px solid #191A23;box-shadow:4px 4px 0 rgba(25,26,35,.15);max-width:560px;width:100%;">
        <tr>
          <td style="background:#191A23;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">WishCube</p>
            <div style="display:inline-block;background:#FFF3CD;border:2px solid #fff;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;margin-bottom:14px;">✨</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Welcome to WishCube!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">You've joined via Google, ${user.name}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;background:#ffffff;">
            <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${user.name},</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
              We're thrilled to have you join our community! Start managing your celebrations and sending thoughtful digital experiences today.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${process.env.CLIENT_URL}"
                  style="display:inline-block;background:#191A23;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:14px 36px;border:2px solid #191A23;border-bottom:4px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.2);">
                  Go to Dashboard &rarr;
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background:#F3F3F3;border-top:2px solid #191A23;text-align:center;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;">&copy; ${new Date().getFullYear()} WishCube. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
            html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F3F3F3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border:2px solid #191A23;border-bottom:5px solid #191A23;box-shadow:4px 4px 0 rgba(25,26,35,.15);max-width:560px;width:100%;">
        <tr>
          <td style="background:#191A23;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">WishCube</p>
            <div style="display:inline-block;background:#FFD1D1;border:2px solid #fff;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;margin-bottom:14px;">🔐</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Password Reset</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">Secure your account access</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;background:#ffffff;">
            <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${user.name || "there"},</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
              You're receiving this email because a password reset was requested for your account. This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${resetUrl}"
                  style="display:inline-block;background:#191A23;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:14px 36px;border:2px solid #191A23;border-bottom:4px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.2);">
                  Reset Password &rarr;
                </a>
              </td></tr>
            </table>
            <div style="margin:28px 0 0;padding-top:20px;border-top:1px solid #eee;">
              <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">
                If the button doesn't work, copy and paste this link: <br/> ${resetUrl}
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background:#F3F3F3;border-top:2px solid #191A23;text-align:center;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;">&copy; ${new Date().getFullYear()} WishCube. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
