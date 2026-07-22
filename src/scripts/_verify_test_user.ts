import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../model/User";

dotenv.config();

const email = process.argv[2];
if (!email) {
  console.error("Usage: ts-node _verify_test_user.ts <email>");
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const user = await User.findOneAndUpdate(
    { email },
    { isVerified: true },
    { new: true },
  );
  console.log(user ? `Verified ${user.email}` : "User not found");
  await mongoose.disconnect();
  process.exit(0);
})();
