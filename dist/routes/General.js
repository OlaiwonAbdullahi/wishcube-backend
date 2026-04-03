"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paystack_1 = require("../utils/paystack");
const errorHandler_1 = require("../utils/errorHandler");
const router = express_1.default.Router();
// @desc    Get list of supported Nigerian banks from Paystack
// @route   GET /api/general/banks
// @access  Public
router.get("/banks", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const banks = await (0, paystack_1.getBankList)();
    res.status(200).json({
        success: true,
        message: "Banks successfully retrieved",
        data: {
            total: banks.length,
            banks,
        },
    });
}));
exports.default = router;
