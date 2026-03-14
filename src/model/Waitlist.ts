import mongoose, { Document, Schema } from "mongoose";

export interface IWaitlist extends Document {
  email: string;
  name: string;
  createdAt: Date;
}

const WaitlistSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IWaitlist>("Waitlist", WaitlistSchema);
