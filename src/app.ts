import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/errorHandler";

// Import routes
import authRoutes from "./routes/authRoutes";
import cardRoutes from "./routes/cardRoutes";
import websiteRoutes from "./routes/websiteRoutes";
import walletRoutes from "./routes/walletRoutes";
import giftRoutes from "./routes/giftRoutes";
import eventRoutes from "./routes/eventRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import adminRoutes from "./routes/adminRoutes";

const app: Application = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/websites", websiteRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/gifts", giftRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = env.port;
app.listen(PORT, () => {
  console.log(`🚀 WishCube server running on port ${PORT}`);
  console.log(`📍 Environment: ${env.nodeEnv}`);
});

export default app;
