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
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
// Routes
app.use("/api/waitlist", Waitlist_1.default);
// Health check
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal server error" });
});
// Database connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/wishcube";
mongoose_1.default
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
exports.default = app;
