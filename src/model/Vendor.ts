import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IVendor extends Document {
  ownerName: string;
  email: string;
  password?: string;
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
  comparePassword(password: string): Promise<boolean>;
}

const vendorSchema: Schema = new Schema(
  {
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
  },
  { timestamps: true },
);

// Encrypt password before saving
vendorSchema.pre<IVendor>("save", async function () {
  if (!this.isModified("password")) return;

  if (this.password) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

// Compare password method
vendorSchema.methods.comparePassword = async function (
  password: string,
): Promise<boolean> {
  const vendor = this as IVendor;
  if (!vendor.password) return false;
  return await bcrypt.compare(password, vendor.password);
};

export default mongoose.model<IVendor>("Vendor", vendorSchema);
