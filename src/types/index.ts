import { Request } from "express";
import { Document, Types } from "mongoose";

// User Types
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "user" | "admin";
  avatar?: string;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Card Types
export interface IMedia {
  type: "image" | "voice" | "music";
  url: string;
  publicId?: string;
  name?: string;
}

export interface ICustomization {
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: string;
}

export interface ICard extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  occasion: string;
  template?: string;
  customization: ICustomization;
  content: string;
  media: IMedia[];
  shareableLink?: string;
  isPublished: boolean;
  viewCount: number;
  giftBox?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Website Types
export interface IPage {
  title: string;
  content: string;
  order: number;
}

export interface IWebsite extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  occasion: string;
  subdomain: string;
  theme: string;
  pages: IPage[];
  media: IMedia[];
  shareableLink?: string;
  isPublished: boolean;
  viewCount: number;
  giftBox?: Types.ObjectId;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Wallet Types
export interface ITransaction {
  type: "credit" | "debit";
  amount: number;
  reference: string;
  description: string;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
}

export interface IWallet extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  balance: number;
  currency: string;
  transactions: ITransaction[];
  createdAt: Date;
  updatedAt: Date;
}

// Gift Types
export interface IGift extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  type: "voucher" | "item";
  value: number;
  price: number;
  image?: string;
  isActive: boolean;
  stock?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGiftBoxItem {
  giftId: Types.ObjectId;
  quantity: number;
  purchasedAt: Date;
}

export interface IGiftBox extends Document {
  _id: Types.ObjectId;
  cardId?: Types.ObjectId;
  websiteId?: Types.ObjectId;
  senderId: Types.ObjectId;
  recipientEmail?: string;
  gifts: IGiftBoxItem[];
  isRedeemed: boolean;
  redeemedAt?: Date;
  redemptionCode: string;
  createdAt: Date;
  updatedAt: Date;
}

// Event Types
export interface ILocation {
  type: "physical" | "virtual";
  address?: string;
  link?: string;
}

export interface IInvitation {
  email: string;
  sentAt: Date;
  status: "sent" | "opened" | "bounced";
}

export interface IEvent extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  description: string;
  eventType: string;
  date: Date;
  time: string;
  location: ILocation;
  coverImage?: string;
  isPublic: boolean;
  maxAttendees?: number;
  invitations: IInvitation[];
  shareableLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

// RSVP Types
export interface IRSVP extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  guestEmail: string;
  guestName: string;
  status: "pending" | "accepted" | "declined" | "maybe";
  plusOnes: number;
  dietaryRestrictions?: string;
  message?: string;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Express Request Extension
export interface AuthRequest extends Request {
  user?: IUser;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Pagination
export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
