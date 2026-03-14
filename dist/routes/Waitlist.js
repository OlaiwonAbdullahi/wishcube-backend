"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Waitlist_1 = __importDefault(require("../model/Waitlist"));
const router = express_1.default.Router();
// POST /api/waitlist
router.post("/", async (req, res) => {
    const { email, name } = req.body;
    try {
        const waitlist = new Waitlist_1.default({ email, name });
        await waitlist.save();
        res
            .status(201)
            .json({ message: "Successfully signed up to the waitlist", waitlist });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
// GET /api/waitlist
router.get("/", async (req, res) => {
    try {
        const waitlist = await Waitlist_1.default.find().select("email name createdAt");
        res.status(200).json(waitlist);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
// GET /api/waitlist/count
router.get("/count", async (req, res) => {
    try {
        const count = await Waitlist_1.default.countDocuments();
        res.status(200).json({ count });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.default = router;
