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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const uuid_1 = require("uuid");
const giftSchema = new mongoose_1.Schema({
    senderId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    websiteId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Website",
        default: null,
    },
    type: {
        type: String,
        enum: ["digital", "physical"],
        required: true,
    },
    amount: { type: Number, default: null },
    currency: { type: String, default: "NGN" },
    productId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Product",
        default: null,
    },
    productSnapshot: {
        name: String,
        price: Number,
        imageUrl: String,
        vendorId: mongoose_1.default.Schema.Types.ObjectId,
        storeName: String,
    },
    paymentMethod: {
        type: String,
        enum: ["wallet", "paystack"],
        required: true,
    },
    paymentReference: { type: String, default: null },
    amountPaid: { type: Number, required: true },
    escrowStatus: {
        type: String,
        enum: ["holding", "released", "refunded"],
        default: "holding",
    },
    giftMessage: { type: String, default: null },
    status: {
        type: String,
        enum: ["pending", "redeemed", "expired", "refunded"],
        default: "pending",
    },
    redeemToken: {
        type: String,
        unique: true,
        sparse: true,
        default: () => (0, uuid_1.v4)(),
    },
    redeemedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
    recipientBankDetails: {
        accountName: { type: String, default: null },
        accountNumber: { type: String, default: null },
        bankCode: { type: String, default: null },
        bankName: { type: String, default: null },
    },
    payoutReference: { type: String, default: null },
    payoutStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
    },
    deliveryAddress: {
        fullName: { type: String, default: null },
        phone: { type: String, default: null },
        address: { type: String, default: null },
        city: { type: String, default: null },
        state: { type: String, default: null },
    },
    isPaid: { type: Boolean, default: false },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Gift", giftSchema);
