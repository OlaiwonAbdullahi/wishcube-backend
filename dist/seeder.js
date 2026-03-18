"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("./model/User"));
dotenv_1.default.config();
const createAdmin = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) {
            throw new Error("MONGODB_URI not found in environment variables");
        }
        await mongoose_1.default.connect(MONGODB_URI);
        console.log("Connected to MongoDB for admin seeding...");
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const adminName = process.env.ADMIN_NAME;
        const existingAdmin = await User_1.default.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log(`Admin with email ${adminEmail} already exists.`);
            if (existingAdmin.role !== "admin") {
                existingAdmin.role = "admin";
                await existingAdmin.save();
                console.log(`Updated user ${adminEmail} to admin role.`);
            }
        }
        else {
            await User_1.default.create({
                name: adminName,
                email: adminEmail,
                password: adminPassword,
                role: "admin",
            });
            console.log(`Successfully created admin user: ${adminEmail}`);
        }
        process.exit(0);
    }
    catch (error) {
        console.error("Admin seeding failed:", error);
        process.exit(1);
    }
};
createAdmin();
