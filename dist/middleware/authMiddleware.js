"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../model/User"));
const Vendor_1 = __importDefault(require("../model/Vendor"));
const errorHandler_1 = require("../utils/errorHandler");
const errorHandler_2 = require("../utils/errorHandler");
exports.protect = (0, errorHandler_2.asyncHandler)(async (req, res, next) => {
    let token;
    if (req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
        return next(new errorHandler_1.AppError("Not authorized to access this route", 401));
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "default_access_secret");
        // Check User first
        const user = await User_1.default.findById(decoded.id);
        if (user) {
            if (!user.isActive) {
                return next(new errorHandler_1.AppError("Account is deactivated", 403));
            }
            // Check subscription expiry
            if (user.subscriptionTier !== "free" &&
                user.subscriptionExpiry &&
                user.subscriptionExpiry < new Date()) {
                user.subscriptionTier = "free";
                user.subscriptionStatus = "inactive"; // Or "canceled"
                await user.save();
            }
            req.user = user;
            return next();
        }
        // Check Vendor if not User
        const vendor = await Vendor_1.default.findById(decoded.id);
        if (vendor) {
            if (!vendor.isActive && vendor.status === "suspended") {
                return next(new errorHandler_1.AppError("Vendor account is suspended", 403));
            }
            req.vendor = vendor;
            // For compatibility with routes expecting req.user
            req.user = {
                _id: vendor._id,
                name: vendor.ownerName,
                email: vendor.email,
                role: "vendor",
                isActive: vendor.isActive,
            };
            return next();
        }
        return next(new errorHandler_1.AppError("No account found with this id", 404));
    }
    catch (err) {
        return next(new errorHandler_1.AppError("Not authorized to access this route", 401));
    }
});
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(String(req.user.role).trim())) {
            return next(new errorHandler_1.AppError(`User role ${req.user?.role} is not authorized to access this route`, 403));
        }
        next();
    };
};
exports.authorize = authorize;
