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
const vendorSchema = new mongoose_1.Schema({
    ownerName: {
        type: String,
        required: [true, "Please provide the owner's name"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Please provide a store/owner email"],
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
        required: [true, "Please provide a password"],
        minlength: [6, "Password must be at least 6 characters"],
        select: false,
    },
    storeName: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String, default: "" },
    logo: { type: String, default: null },
    logoPublicId: { type: String, default: null },
    category: {
        type: String,
        enum: [
            "Cakes",
            "Flowers",
            "Fashion",
            "Electronics",
            "Experiences",
            "Vouchers",
            "Food",
            "Jewelry",
            "Other",
        ],
        required: true,
    },
    deliveryZones: [{ type: String }],
    bankDetails: {
        accountName: { type: String, default: null },
        accountNumber: { type: String, default: null },
        bankCode: { type: String, default: null },
        bankName: { type: String, default: null },
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "suspended"],
        default: "pending",
    },
    isActive: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0.1 },
    rejectionReason: { type: String, default: null },
    approvedAt: { type: Date, default: null },
}, { timestamps: true });
// Encrypt password before saving
vendorSchema.pre("save", async function () {
    if (!this.isModified("password"))
        return;
    if (this.password) {
        const salt = await bcryptjs_1.default.genSalt(12);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
    }
});
// Compare password method
vendorSchema.methods.comparePassword = async function (password) {
    const vendor = this;
    if (!vendor.password)
        return false;
    return await bcryptjs_1.default.compare(password, vendor.password);
};
exports.default = mongoose_1.default.model("Vendor", vendorSchema);
