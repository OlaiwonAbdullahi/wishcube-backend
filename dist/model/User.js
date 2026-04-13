"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const UserSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, "Please provide a name"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Please provide an email"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            "Please provide a valid email",
        ],
    },
    password: {
        type: String,
        minlength: [6, "Password must be at least 6 characters"],
        select: false,
    },
    avatar: {
        type: String,
        default: function () {
            return `https://api.dicebear.com/9.x/glass/svg?seed=${this.name || "default"}`;
        },
    },
    role: {
        type: String,
        enum: ["user", "admin", "moderator"],
        default: "user",
        trim: true,
    },
    walletBalance: {
        type: Number,
        default: 0,
    },
    subscriptionTier: {
        type: String,
        enum: ["free", "pro", "premium"],
        default: "free",
    },
    subscriptionStatus: {
        type: String,
        enum: ["active", "inactive", "past_due", "canceled"],
        default: "active",
    },
    subscriptionExpiry: {
        type: Date,
        default: null,
    },
    paystackCustomerCode: {
        type: String,
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    loginAttempts: {
        type: Number,
        required: true,
        default: 0,
    },
    lockUntil: {
        type: Date,
    },
    authProvider: {
        type: String,
        enum: ["local", "google"],
        default: "local",
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    lastLogin: {
        type: Date,
        default: Date.now,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Number,
}, { timestamps: true });
// Encrypt password before saving
UserSchema.pre("save", async function () {
    if (!this.isModified("password"))
        return;
    if (this.password) {
        const salt = await bcryptjs_1.default.genSalt(12);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
    }
});
// Compare password method
UserSchema.methods.comparePassword = async function (password) {
    const user = this;
    if (!user.password)
        return false;
    return await bcryptjs_1.default.compare(password, user.password);
};
// Generate and hash email verification token
UserSchema.methods.generateEmailVerificationToken = function () {
    // Generate token
    const verificationToken = crypto_1.default.randomBytes(32).toString("hex");
    // Hash and set to emailVerificationToken field
    this.emailVerificationToken = crypto_1.default
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");
    // Set expire to 24 hours
    this.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return verificationToken;
};
// Increment login attempts and lock account if needed
UserSchema.methods.incrementLoginAttempts = async function () {
    // If user is already locked, do nothing
    if (this.lockUntil && this.lockUntil > Date.now()) {
        return;
    }
    this.loginAttempts += 1;
    // Lock account after 5 failed attempts for 1 hour
    if (this.loginAttempts >= 5) {
        this.lockUntil = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    }
    await this.save();
};
// Reset login attempts and lock status
UserSchema.methods.resetLoginAttempts = async function () {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    await this.save();
};
exports.default = mongoose_1.default.model("User", UserSchema);
