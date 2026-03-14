"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Waitlist_1 = __importDefault(require("../model/Waitlist"));
const errorHandler_1 = require("../utils/errorHandler");
const router = express_1.default.Router();
// POST /api/waitlist
router.post("/", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, name } = req.body;
    if (!email || !name) {
        throw new errorHandler_1.AppError("Please provide both name and email", 400);
    }
    const waitlist = new Waitlist_1.default({ email, name });
    await waitlist.save();
    res.status(201).json({
        status: "success",
        message: "Successfully signed up to the waitlist",
        data: { waitlist },
    });
}));
// GET /api/waitlist to get all waitlist
router.get("/", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const waitlist = await Waitlist_1.default.find().sort({ createdAt: -1 });
    res.status(200).json({
        status: "success",
        results: waitlist.length,
        data: { waitlist },
    });
}));
// GET /api/waitlist/count to get the total number of waitlist
router.get("/count", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const count = await Waitlist_1.default.countDocuments();
    res.status(200).json({
        status: "success",
        data: { count },
    });
}));
exports.default = router;
