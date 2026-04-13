import mongoose, { Document, Schema } from "mongoose";

export interface IBulkRecipient extends Document {
  bulkId: mongoose.Types.ObjectId;
  row_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  original_message?: string;
  ai_message?: string;
  gift: {
    gift_type: "voucher" | "physical" | "wallet_credit";
    amount: number;
    currency: string;
    gift_id?: string;
  } | null;
  status: "pending" | "gift_attached" | "published";
  wishcube_link?: string;
  websiteId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BulkRecipientSchema: Schema = new Schema(
  {
    bulkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BulkUpload",
      required: true,
    },
    row_id: {
      type: String,
      required: true,
    },
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    department: {
      type: String,
    },
    original_message: {
      type: String,
    },
    ai_message: {
      type: String,
    },
    gift: {
      gift_type: {
        type: String,
        enum: ["voucher", "physical", "wallet_credit"],
      },
      amount: {
        type: Number,
      },
      currency: {
        type: String,
        default: "NGN",
      },
      gift_id: {
        type: String,
      },
    },
    status: {
      type: String,
      enum: ["pending", "gift_attached", "published"],
      default: "pending",
    },
    wishcube_link: {
      type: String,
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Website",
    },
  },
  { timestamps: true }
);

// Compound index for unique row_id within a bulk upload
BulkRecipientSchema.index({ bulkId: 1, row_id: 1 }, { unique: true });

export default mongoose.model<IBulkRecipient>(
  "BulkRecipient",
  BulkRecipientSchema
);
