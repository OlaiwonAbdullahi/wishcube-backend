import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import waitlistRouter from "./routes/Waitlist";
import authRouter from "./routes/Auth";
import cardsRouter from "./routes/Cards";
import websitesRouter from "./routes/Website";
import giftsRouter from "./routes/Gifts";
import vendorsRouter from "./routes/Vendor";
import adminRouter from "./routes/Admin";
import productsRouter from "./routes/Products";
import ordersRouter from "./routes/Orders";
import walletRouter from "./routes/Wallet";
import subscriptionRouter from "./routes/Subscription";
import dashboardRouter from "./routes/Dashboard";
import webhooksRouter from "./routes/Webhooks";
import generalRouter from "./routes/General";
import { globalErrorHandler } from "./middleware/errorMiddleware";
import rsvpRouter from "./routes/Rsvp";
import { landingPageTemplate } from "./utils/landingPage";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  process.env.APP_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "https://usewishcube.com",
  "https://www.usewishcube.com",
  "https://api.usewishcube.com",
  "https://app.usewishcube.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-domain)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV === "development"
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

// 2. URL Normalization (Handle double slashes and trailing dots)
app.use((req: Request, res: Response, next: NextFunction) => {
  // Replace multiple slashes with a single slash
  let normalizedUrl = req.url.replace(/\/+/g, "/");

  // Remove trailing dots if any (seen in error logs)
  if (normalizedUrl.endsWith(".")) {
    normalizedUrl = normalizedUrl.slice(0, -1);
  }

  if (normalizedUrl !== req.url) {
    req.url = normalizedUrl;
  }
  next();
});

// 3. Standard Middleware
app.use(express.json());
app.use(helmet());

// Routes
app.use("/api/waitlist", waitlistRouter);
app.use("/api/auth", authRouter);
app.use("/api/cards", cardsRouter);
app.use("/api/websites", websitesRouter);
app.use("/api/gifts", giftsRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/subscriptions", subscriptionRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/general", generalRouter);
app.use("/api/rsvp", rsvpRouter);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});
app.get("/", (req: Request, res: Response) => {
  res.status(200).send(landingPageTemplate());
});

// Error handling middleware
app.use(globalErrorHandler);

// Database connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/wishcube";

// Inject database name if missing from Atlas URI
function buildMongoUri(uri: string): string {
  if (uri.includes("mongodb+srv://") || uri.includes("mongodb://")) {
    try {
      const url = new URL(uri);
      if (!url.pathname || url.pathname === "/") {
        url.pathname = "/wishcube";
        return url.toString();
      }
    } catch (e) {
      return uri;
    }
  }
  return uri;
}

const mongoUri = buildMongoUri(MONGODB_URI);

const mongooseOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  minPoolSize: 2,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
};

async function connectDB(retries = 5, delay = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(mongoUri, mongooseOptions);
      console.log("✅ Connected to MongoDB");
      return;
    } catch (error: any) {
      console.error(
        `❌ MongoDB attempt ${attempt}/${retries} failed: ${error.message}`,
      );
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
        delay = Math.min(delay * 1.5, 15000);
      } else {
        console.error("💀 All MongoDB connection attempts failed.");
        process.exit(1);
      }
    }
  }
}

// Reconnect on disconnection
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
  setTimeout(() => connectDB(3, 2000), 1000);
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
});

export default app;
