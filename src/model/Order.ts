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
    address: string;
    city: string;
    state: string;
  };
  trackingNumber: string | null;
  status: "processing" | "shipped" | "delivered" | "cancelled";
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
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>("Order", orderSchema);
