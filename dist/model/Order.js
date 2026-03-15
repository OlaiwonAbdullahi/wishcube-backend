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
const orderSchema = new mongoose_1.Schema({
    giftId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Gift",
        required: true,
    },
    vendorId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
    },
    productId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    senderId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    productSnapshot: {
        name: String,
        price: Number,
        imageUrl: String,
    },
    deliveryAddress: {
        fullName: String,
        phone: String,
        address: String,
        city: String,
        state: String,
    },
    trackingNumber: { type: String, default: null },
    status: {
        type: String,
        enum: ["processing", "shipped", "delivered", "cancelled"],
        default: "processing",
    },
    totalAmount: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    vendorEarnings: { type: Number, required: true },
    vendorPaidOut: { type: Boolean, default: false },
    vendorPaidOutAt: { type: Date, default: null },
    statusHistory: [
        {
            status: String,
            updatedAt: { type: Date, default: Date.now },
            note: String,
        },
    ],
    autoConfirmAt: { type: Date, default: null },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Order", orderSchema);
