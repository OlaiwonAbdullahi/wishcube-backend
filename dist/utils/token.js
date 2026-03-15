"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTokenResponse = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateAccessToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || "default_access_secret", {
        expiresIn: "15m",
    });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_REFRESH_SECRET || "default_refresh_secret", {
        expiresIn: "7d",
    });
};
exports.generateRefreshToken = generateRefreshToken;
const sendTokenResponse = (user, statusCode, res) => {
    const accessToken = (0, exports.generateAccessToken)(user._id.toString());
    const refreshToken = (0, exports.generateRefreshToken)(user._id.toString());
    res.status(statusCode).json({
        success: true,
        accessToken,
        refreshToken,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            isActive: user.isActive,
            authProvider: user.authProvider,
        },
    });
};
exports.sendTokenResponse = sendTokenResponse;
