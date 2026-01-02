import mongoose, {
  Schema,
  Model,
  CallbackWithoutResultAndOptionalError,
} from "mongoose";
import { IGiftBox, IGiftBoxItem } from "../types";
import { generateRedemptionCode } from "../utils/helpers";

const giftBoxItemSchema = new Schema<IGiftBoxItem>(
  {
    giftId: {
      type: Schema.Types.ObjectId,
      ref: "Gift",
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    purchasedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const giftBoxSchema = new Schema<IGiftBox>(
  {
    cardId: {
      type: Schema.Types.ObjectId,
      ref: "Card",
    },
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: "Website",
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientEmail: String,
    gifts: {
      type: [giftBoxItemSchema],
      default: [],
    },
    isRedeemed: {
      type: Boolean,
      default: false,
    },
    redeemedAt: Date,
    redemptionCode: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate redemption code before saving
giftBoxSchema.pre(
  "save",
  function (next: CallbackWithoutResultAndOptionalError) {
    if (!this.redemptionCode) {
      this.redemptionCode = generateRedemptionCode();
    }
    next();
  }
);

// Index for redemption code lookups
giftBoxSchema.index({ redemptionCode: 1 });
giftBoxSchema.index({ cardId: 1 });
giftBoxSchema.index({ websiteId: 1 });

const GiftBox: Model<IGiftBox> = mongoose.model<IGiftBox>(
  "GiftBox",
  giftBoxSchema
);

export default GiftBox;
