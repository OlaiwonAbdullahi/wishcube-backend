import mongoose, { Schema, Model } from "mongoose";
import { ICard, IMedia, ICustomization } from "../types";

const mediaSchema = new Schema<IMedia>(
  {
    type: {
      type: String,
      enum: ["image", "voice", "music"],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: String,
    name: String,
  },
  { _id: false }
);

const customizationSchema = new Schema<ICustomization>(
  {
    backgroundColor: { type: String, default: "#ffffff" },
    textColor: { type: String, default: "#000000" },
    fontFamily: { type: String, default: "Arial" },
    fontSize: { type: String, default: "16px" },
  },
  { _id: false }
);

const cardSchema = new Schema<ICard>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    occasion: {
      type: String,
      required: [true, "Occasion is required"],
      trim: true,
    },
    template: String,
    customization: {
      type: customizationSchema,
      default: () => ({}),
    },
    content: {
      type: String,
      default: "",
    },
    media: {
      type: [mediaSchema],
      default: [],
    },
    shareableLink: {
      type: String,
      unique: true,
      sparse: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    giftBox: {
      type: Schema.Types.ObjectId,
      ref: "GiftBox",
    },
  },
  {
    timestamps: true,
  }
);

// Index for shareable link lookups
cardSchema.index({ shareableLink: 1 });

const Card: Model<ICard> = mongoose.model<ICard>("Card", cardSchema);

export default Card;
