import mongoose, { Schema, Model } from "mongoose";
import { IGift } from "../types";

const giftSchema = new Schema<IGift>(
  {
    name: {
      type: String,
      required: [true, "Gift name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["voucher", "item"],
      required: true,
    },
    value: {
      type: Number,
      required: [true, "Gift value is required"],
      min: 0,
    },
    price: {
      type: Number,
      required: [true, "Gift price is required"],
      min: 0,
    },
    image: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    stock: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for active gifts
giftSchema.index({ isActive: 1 });

const Gift: Model<IGift> = mongoose.model<IGift>("Gift", giftSchema);

export default Gift;
