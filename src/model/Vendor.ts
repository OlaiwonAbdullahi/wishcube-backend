import mongoose, { Document, Schema } from "mongoose";

export interface IVendor extends Document {
  userId: mongoose.Types.ObjectId;
  storeName: string;
  slug: string;
  description: string;
  logo: string | null;
  logoPublicId: string | null;
  category:
    | "Cakes"
    | "Flowers"
    | "Fashion"
    | "Electronics"
    | "Experiences"
    | "Vouchers"
    | "Food"
    | "Jewelry"
    | "Other";
  deliveryZones: string[];
  bankDetails: {
    accountName: string | null;
    accountNumber: string | null;
    bankCode: string | null;
    bankName: string | null;
  };
  status: "pending" | "approved" | "rejected" | "suspended";
  isActive: boolean;
  rating: number;
  totalSales: number;
  totalEarnings: number;
  commissionRate: number;
  rejectionReason: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const vendorSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
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
  },
  { timestamps: true }
);

export default mongoose.model<IVendor>("Vendor", vendorSchema);
