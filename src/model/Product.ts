import mongoose, { Document, Schema } from "mongoose";

export interface IProduct extends Document {
  vendorId?: mongoose.Types.ObjectId; // Optional for system products (Vouchers)
  name: string;
  description: string;
  price: number;
  images: { url: string; publicId: string }[];
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
  occasionTags: string[];
  deliveryZones: string[];
  stock: number;
  isAvailable: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema: Schema = new Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: false, // Optional for admin-created digital gifts
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    images: [{ url: String, publicId: String }],
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
    occasionTags: [{ type: String }],
    deliveryZones: [{ type: String }],
    stock: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>("Product", productSchema);
