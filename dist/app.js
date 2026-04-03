"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const Waitlist_1 = __importDefault(require("./routes/Waitlist"));
const Auth_1 = __importDefault(require("./routes/Auth"));
const Cards_1 = __importDefault(require("./routes/Cards"));
const Website_1 = __importDefault(require("./routes/Website"));
const Gifts_1 = __importDefault(require("./routes/Gifts"));
const Vendor_1 = __importDefault(require("./routes/Vendor"));
const Admin_1 = __importDefault(require("./routes/Admin"));
const Products_1 = __importDefault(require("./routes/Products"));
const Wallet_1 = __importDefault(require("./routes/Wallet"));
const Subscription_1 = __importDefault(require("./routes/Subscription"));
const Dashboard_1 = __importDefault(require("./routes/Dashboard"));
const Webhooks_1 = __importDefault(require("./routes/Webhooks"));
const General_1 = __importDefault(require("./routes/General"));
const errorMiddleware_1 = require("./middleware/errorMiddleware");
const Rsvp_1 = __importDefault(require("./routes/Rsvp"));
dotenv_1.default.config();
const app = (0, express_1.default)();
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-domain)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) ||
            process.env.NODE_ENV === "development") {
            callback(null, true);
        }
        else {
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
}));
// 2. URL Normalization (Handle double slashes and trailing dots)
app.use((req, res, next) => {
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
app.use(express_1.default.json());
app.use((0, helmet_1.default)());
// Routes
app.use("/api/waitlist", Waitlist_1.default);
app.use("/api/auth", Auth_1.default);
app.use("/api/cards", Cards_1.default);
app.use("/api/websites", Website_1.default);
app.use("/api/gifts", Gifts_1.default);
app.use("/api/vendors", Vendor_1.default);
app.use("/api/products", Products_1.default);
app.use("/api/admin", Admin_1.default);
app.use("/api/wallet", Wallet_1.default);
app.use("/api/subscriptions", Subscription_1.default);
app.use("/api/dashboard", Dashboard_1.default);
app.use("/api/webhooks", Webhooks_1.default);
app.use("/api/general", General_1.default);
app.use("/api/rsvp", Rsvp_1.default);
// Health check
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});
app.get("/", (req, res) => {
    res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WishCube API</title>
        <style>
            :root {
                --primary: #6366f1;
                --bg: #0f172a;
                --text: #f8fafc;
                --card-bg: #1e293b;
            }
            body {
                font-family: verdana, sans-serif;
                background-color: var(--bg);
                color: var(--text);
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                text-align: center;
            }
            .container {
                max-width: 600px;
                padding: 2rem;
                background: var(--card-bg);
                border-radius: 1rem;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            h1 {
                font-size: 2.5rem;
                margin-bottom: 0.5rem;
                background: linear-gradient(to right, #818cf8, #c084fc);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            p {
                color: #94a3b8;
                font-size: 1.1rem;
                margin-bottom: 2rem;
            }
            .status {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                background: rgba(34, 197, 94, 0.1);
                color: #4ade80;
                border-radius: 9999px;
                font-weight: 600;
                font-size: 0.875rem;
            }
            .pulse {
                width: 8px;
                height: 8px;
                background: #4ade80;
                border-radius: 50%;
                box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7);
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(74, 222, 128, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
            }
            .footer {
                margin-top: 2rem;
                font-size: 0.875rem;
                color: #64748b;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="status"><div class="pulse"></div> API Operational</div>
            <h1>WishCube API</h1>
            <p>The backend services for WishCube are running successfully. This endpoint serves as the entry point for our digital greeting cards, gifts, and Celebration management platform.</p>
            <div class="footer">
                &copy; ${new Date().getFullYear()} WishCube. All rights reserved.
            </div>
        </div>
    </body>
    </html>
  `);
});
// Error handling middleware
app.use(errorMiddleware_1.globalErrorHandler);
// Database connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/wishcube";
// Inject database name if missing from Atlas URI
function buildMongoUri(uri) {
    if (uri.includes("mongodb+srv://") || uri.includes("mongodb://")) {
        try {
            const url = new URL(uri);
            if (!url.pathname || url.pathname === "/") {
                url.pathname = "/wishcube";
                return url.toString();
            }
        }
        catch (e) {
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
async function connectDB(retries = 5, delay = 3000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await mongoose_1.default.connect(mongoUri, mongooseOptions);
            console.log("✅ Connected to MongoDB");
            return;
        }
        catch (error) {
            console.error(`❌ MongoDB attempt ${attempt}/${retries} failed: ${error.message}`);
            if (attempt < retries) {
                console.log(`⏳ Retrying in ${delay / 1000}s...`);
                await new Promise((res) => setTimeout(res, delay));
                delay = Math.min(delay * 1.5, 15000);
            }
            else {
                console.error("💀 All MongoDB connection attempts failed.");
                process.exit(1);
            }
        }
    }
}
// Reconnect on disconnection
mongoose_1.default.connection.on("disconnected", () => {
    console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
    setTimeout(() => connectDB(3, 2000), 1000);
});
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
    });
});
exports.default = app;
