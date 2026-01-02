import mongoose, { Schema, Model } from "mongoose";
import { IWallet, ITransaction } from "../types";

const transactionSchema = new Schema<ITransaction>(
  {
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    reference: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const walletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "NGN",
    },
    transactions: {
      type: [transactionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Method to add transaction
walletSchema.methods.addTransaction = function (transaction: ITransaction) {
  this.transactions.push(transaction);
  if (transaction.status === "completed") {
    if (transaction.type === "credit") {
      this.balance += transaction.amount;
    } else {
      this.balance -= transaction.amount;
    }
  }
  return this.save();
};

const Wallet: Model<IWallet> = mongoose.model<IWallet>("Wallet", walletSchema);

export default Wallet;
