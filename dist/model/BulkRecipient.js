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
const BulkRecipientSchema = new mongoose_1.Schema({
    bulkId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "BulkUpload",
        required: true,
    },
    row_id: {
        type: String,
        required: true,
    },
    first_name: {
        type: String,
        required: true,
    },
    last_name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    department: {
        type: String,
    },
    original_message: {
        type: String,
    },
    ai_message: {
        type: String,
    },
    gift: {
        gift_type: {
            type: String,
            enum: ["voucher", "physical", "wallet_credit"],
        },
        amount: {
            type: Number,
        },
        currency: {
            type: String,
            default: "NGN",
        },
        gift_id: {
            type: String,
        },
    },
    status: {
        type: String,
        enum: ["pending", "gift_attached", "published"],
        default: "pending",
    },
    wishcube_link: {
        type: String,
    },
    websiteId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Website",
    },
}, { timestamps: true });
// Compound index for unique row_id within a bulk upload
BulkRecipientSchema.index({ bulkId: 1, row_id: 1 }, { unique: true });
exports.default = mongoose_1.default.model("BulkRecipient", BulkRecipientSchema);
