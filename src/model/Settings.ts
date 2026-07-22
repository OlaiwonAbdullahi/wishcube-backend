import mongoose, { Document, Schema } from "mongoose";

export interface ISettings extends Document {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  supportEmail: string;
  allowNewVendorRegistrations: boolean;
  updatedAt: Date;
}

const settingsSchema: Schema = new Schema(
  {
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: {
      type: String,
      default: "WishCube is temporarily down for maintenance. We'll be back shortly.",
    },
    supportEmail: { type: String, default: "support@usewishcube.com" },
    allowNewVendorRegistrations: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Settings = mongoose.model<ISettings>("Settings", settingsSchema);

// Singleton - there is only ever one Settings document.
export const getOrCreateSettings = async () => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  return settings;
};

export default Settings;
