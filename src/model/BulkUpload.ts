import mongoose, { Document, Schema } from "mongoose";

export interface IBulkUpload extends Document {
  userId: mongoose.Types.ObjectId;
  bulk_id: string;
  occasion: string;
  total: number;
  status: "processing_ai" | "ready" | "publishing" | "completed";
  styleConfig?: {
    theme?: string;
    font?: string;
    layout?: string;
    language?: string;
    aiTone?: string;
    expiresAt?: Date;
    password?: string;
  };
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
      enum: ["processing_ai", "ready", "publishing", "completed"],
      default: "processing_ai",
    },
    styleConfig: {
      theme: String,
      font: String,
      layout: String,
      language: String,
      aiTone: String,
      expiresAt: Date,
      password: String,
    },
    published_at: {
      type: Date,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IBulkUpload>("BulkUpload", BulkUploadSchema);
