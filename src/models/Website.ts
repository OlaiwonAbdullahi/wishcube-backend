import mongoose, { Schema, Model } from "mongoose";
import { IWebsite, IMedia, IPage } from "../types";

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

const pageSchema = new Schema<IPage>(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const websiteSchema = new Schema<IWebsite>(
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
    subdomain: {
      type: String,
      required: [true, "Subdomain is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    theme: {
      type: String,
      default: "default",
    },
    pages: {
      type: [pageSchema],
      default: [{ title: "Home", content: "", order: 0 }],
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
    expiresAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index for subdomain lookups
websiteSchema.index({ subdomain: 1 });
websiteSchema.index({ shareableLink: 1 });

const Website: Model<IWebsite> = mongoose.model<IWebsite>(
  "Website",
  websiteSchema
);

export default Website;
