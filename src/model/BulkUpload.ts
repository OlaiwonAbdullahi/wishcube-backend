import mongoose, { Document, Schema } from "mongoose";

export interface IBulkUpload extends Document {
  userId: mongoose.Types.ObjectId;
  bulk_id: string;
  occasion: string;
  total: number;
  status: "pending" | "published";
  published_at?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BulkUploadSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bulk_id: {
      type: String,
      required: true,
      unique: true,
    },
    occasion: {
      type: String,
      required: true,
    },
    total: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "published"],
      default: "pending",
    },
    published_at: {
      type: Date,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IBulkUpload>("BulkUpload", BulkUploadSchema);
