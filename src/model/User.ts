import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  role: "user" | "admin" | "moderator";
  isActive: boolean;
  isVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpire?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  authProvider: "local" | "google";
  googleId?: string;
  walletBalance: number;
  subscriptionTier: "free" | "pro" | "premium";
  subscriptionStatus: "active" | "inactive" | "past_due" | "canceled";
  subscriptionExpiry: Date | null;
  paystackCustomerCode?: string;
  lastLogin: Date;
  resetPasswordToken?: string;
  resetPasswordExpire?: number;
  comparePassword(password: string): Promise<boolean>;
  generateEmailVerificationToken(): string;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    avatar: {
      type: String,
      default: function (this: any) {
        return `https://api.dicebear.com/9.x/glass/svg?seed=${
          this.name || "default"
        }`;
      },
    },
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user",
      trim: true,
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    subscriptionTier: {
      type: String,
      enum: ["free", "pro", "premium"],
      default: "free",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "past_due", "canceled"],
      default: "active",
    },
    subscriptionExpiry: {
      type: Date,
      default: null,
    },
    paystackCustomerCode: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    loginAttempts: {
      type: Number,
      required: true,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Number,
  },
  { timestamps: true },
);

// Encrypt password before saving
UserSchema.pre<IUser>("save", async function () {
  if (!this.isModified("password")) return;

  if (this.password) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  password: string,
): Promise<boolean> {
  const user = this as IUser;
  if (!user.password) return false;
  return await bcrypt.compare(password, user.password);
};

// Generate and hash email verification token
UserSchema.methods.generateEmailVerificationToken = function (): string {
  // Generate token
  const verificationToken = crypto.randomBytes(32).toString("hex");

  // Hash and set to emailVerificationToken field
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  // Set expire to 24 hours
  this.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return verificationToken;
};

// Increment login attempts and lock account if needed
UserSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  // If user is already locked, do nothing
  if (this.lockUntil && this.lockUntil > Date.now()) {
    return;
  }

  this.loginAttempts += 1;

  // Lock account after 5 failed attempts for 1 hour
  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
  }

  await this.save();
};

// Reset login attempts and lock status
UserSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

export default mongoose.model<IUser>("User", UserSchema);
