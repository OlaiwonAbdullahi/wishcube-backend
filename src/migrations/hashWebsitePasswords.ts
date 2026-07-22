/**
 * One-off migration: hashes any Website.password values that are still stored
 * in plaintext from before the bcrypt pre-save hook was added.
 *
 * Run once with: npm run migrate:hash-website-passwords
 * Safe to re-run - already-hashed values (bcrypt's `$2a$`/`$2b$` prefix) are skipped.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Website from "../model/Website";

dotenv.config();

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

const run = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI not found in environment variables");
  }

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB for website-password migration...");

  const websites = await Website.find({
    password: { $ne: null },
  }).select("+password");

  let hashed = 0;
  let skipped = 0;

  for (const website of websites) {
    if (!website.password || BCRYPT_HASH_PATTERN.test(website.password)) {
      skipped += 1;
      continue;
    }
    const salt = await bcrypt.genSalt(12);
    website.password = await bcrypt.hash(website.password, salt);
    // Bypass the pre-save hook's isModified/hash-again logic by writing directly.
    await Website.updateOne(
      { _id: website._id },
      { $set: { password: website.password } },
    );
    hashed += 1;
  }

  console.log(
    `Done. Hashed ${hashed} plaintext password(s), skipped ${skipped} already-hashed/empty.`,
  );
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
