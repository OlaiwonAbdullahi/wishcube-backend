"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * One-off migration: hashes any Website.password values that are still stored
 * in plaintext from before the bcrypt pre-save hook was added.
 *
 * Run once with: npm run migrate:hash-website-passwords
 * Safe to re-run - already-hashed values (bcrypt's `$2a$`/`$2b$` prefix) are skipped.
 */
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Website_1 = __importDefault(require("../model/Website"));
dotenv_1.default.config();
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;
const run = async () => {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        throw new Error("MONGODB_URI not found in environment variables");
    }
    await mongoose_1.default.connect(MONGODB_URI);
    console.log("Connected to MongoDB for website-password migration...");
    const websites = await Website_1.default.find({
        password: { $ne: null },
    }).select("+password");
    let hashed = 0;
    let skipped = 0;
    for (const website of websites) {
        if (!website.password || BCRYPT_HASH_PATTERN.test(website.password)) {
            skipped += 1;
            continue;
        }
        const salt = await bcryptjs_1.default.genSalt(12);
        website.password = await bcryptjs_1.default.hash(website.password, salt);
        // Bypass the pre-save hook's isModified/hash-again logic by writing directly.
        await Website_1.default.updateOne({ _id: website._id }, { $set: { password: website.password } });
        hashed += 1;
    }
    console.log(`Done. Hashed ${hashed} plaintext password(s), skipped ${skipped} already-hashed/empty.`);
    process.exit(0);
};
run().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
