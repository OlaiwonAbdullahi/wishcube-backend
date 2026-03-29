import mongoose, { Document, Schema } from "mongoose";

export interface IGift extends Document {
  senderId: mongoose.Types.ObjectId;
  websiteId: mongoose.Types.ObjectId | null;
  type: "digital" | "physical";
  amount: number | null;
  currency: string;
  productId: mongoose.Types.ObjectId | null;
  productSnapshot: {
    name: string;
    price: number;
    imageUrl: string | null;
    vendorId: mongoose.Types.ObjectId;
    storeName: string;
  } | null;
  paymentMethod: "wallet" | "paystack";
  paymentReference: string | null;
  amountPaid: number;
  escrowStatus: "holding" | "released" | "refunded";
  giftMessage: string | null;
  status: "pending" | "redeemed" | "expired" | "refunded";
  redeemToken: string;
  redeemedAt: Date | null;
  expiresAt: Date;
  recipientBankDetails: {
    accountName: string | null;
    accountNumber: string | null;
    bankCode: string | null;
    bankName: string | null;
  };
  payoutReference: string | null;
  payoutStatus: "pending" | "processing" | "completed" | "failed";
  deliveryAddress: {
    fullName: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  };
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const giftSchema: Schema = new Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    productSnapshot: {
      name: String,
      price: Number,
      imageUrl: String,
      vendorId: mongoose.Schema.Types.ObjectId,
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
    redeemToken: { type: String, unique: true, sparse: true },
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
  },
  { timestamps: true }
);

export default mongoose.model<IGift>("Gift", giftSchema);
