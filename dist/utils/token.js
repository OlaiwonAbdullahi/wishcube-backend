"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTokenResponse = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateAccessToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || "default_access_secret", {
        expiresIn: "7d",
    });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_REFRESH_SECRET || "default_refresh_secret", {
        expiresIn: "7d",
    });
};
exports.generateRefreshToken = generateRefreshToken;
const sendTokenResponse = (entity, statusCode, res, type = "user") => {
    const accessToken = (0, exports.generateAccessToken)(entity._id.toString());
    const refreshToken = (0, exports.generateRefreshToken)(entity._id.toString());
    const responseData = {
        accessToken,
        refreshToken,
    };
    if (type === "user") {
        responseData.user = {
            id: entity._id,
            name: entity.name,
            email: entity.email,
            role: entity.role,
            avatar: entity.avatar,
            isActive: entity.isActive,
            authProvider: entity.authProvider,
        };
    }
    else {
        responseData.vendor = {
            id: entity._id,
            ownerName: entity.ownerName,
            email: entity.email,
            logo: entity.logo,
            isActive: entity.isActive,
        };
    }
    res.status(statusCode).json({
        success: true,
        message: statusCode === 201
            ? `${type === "user" ? "User" : "Vendor"} registered successfully`
            : `${type === "user" ? "User" : "Vendor"} logged in successfully`,
        data: responseData,
    });
};
exports.sendTokenResponse = sendTokenResponse;
