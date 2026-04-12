import mongoose, { Document, Schema } from "mongoose";

export interface IOrder extends Document {
  giftId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  productSnapshot: {
    name: string;
    price: number;
    imageUrl: string | null;
  };
  deliveryAddress: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
  };
  trackingNumber: string | null;
  status:
    | "processing"
    | "out_for_delivery"
    | "in_transit"
    | "awaiting_confirmation"
    | "delivered"
    | "disputed"
    | "cancelled";
  deliveryCode: string | null;
  otpExpiresAt: Date | null;
  otpAttempts: number;
  awaitingConfirmationAt: Date | null;
  confirmedBy: "vendor" | "recipient" | null;
  isDeliveredByReceiver: boolean;
  totalAmount: number;
  commissionAmount: number;
  vendorEarnings: number;
  vendorPaidOut: boolean;
  vendorPaidOutAt: Date | null;
  statusHistory: {
    status: string;
    updatedAt: Date;
    note: string;
  }[];
  autoConfirmAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema: Schema = new Schema(
  {
    giftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gift",
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
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
      email: String,
      address: String,
      city: String,
      state: String,
    },
    trackingNumber: { type: String, default: null },
    status: {
      type: String,
      enum: [
        "processing",
        "out_for_delivery",
        "in_transit",
        "awaiting_confirmation",
        "delivered",
        "disputed",
        "cancelled",
      ],
      default: "processing",
    },
    deliveryCode: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    awaitingConfirmationAt: { type: Date, default: null },
    confirmedBy: {
      type: String,
      enum: ["vendor", "recipient", null],
      default: null,
    },
    isDeliveredByReceiver: { type: Boolean, default: false },
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
  },
  { timestamps: true },
);

export default mongoose.model<IOrder>("Order", orderSchema);
