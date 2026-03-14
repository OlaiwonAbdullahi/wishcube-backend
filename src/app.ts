import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import waitlistRouter from "./routes/Waitlist";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// Routes
app.use("/api/waitlist", waitlistRouter);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

// Database connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/wishcube";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error.message);
  });

export default app;
