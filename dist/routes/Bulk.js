"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const XLSX = __importStar(require("xlsx"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const errorHandler_1 = require("../utils/errorHandler");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const BulkUpload_1 = __importDefault(require("../model/BulkUpload"));
const BulkRecipient_1 = __importDefault(require("../model/BulkRecipient"));
const aiMessage_1 = require("../utils/aiMessage");
const Website_1 = __importDefault(require("../model/Website"));
const Gift_1 = __importDefault(require("../model/Gift"));
const email_1 = require("../utils/email");
const emailTemplates_1 = require("../utils/emailTemplates");
const slugify_1 = __importDefault(require("slugify"));
const csv_writer_1 = require("csv-writer");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
/**
 * Helper function for background AI message generation.
 */
const processAIGeneration = async (bulkId, occasion) => {
    try {
        const recipients = await BulkRecipient_1.default.find({ bulkId });
        for (const recipient of recipients) {
            let ai_message = "";
            try {
                if (recipient.original_message) {
                    ai_message = await (0, aiMessage_1.generateCardMessage)({
                        recipientName: recipient.first_name,
                        occasion: `${occasion} (refining: ${recipient.original_message})`,
                        tone: "Professional",
                        relationship: recipient.department
                            ? `Colleague in ${recipient.department}`
                            : "Colleague",
                    });
                }
                else {
                    ai_message = await (0, aiMessage_1.generateCardMessage)({
                        recipientName: recipient.first_name,
                        occasion: occasion,
                        tone: "Professional",
                        relationship: recipient.department
                            ? `Colleague in ${recipient.department}`
                            : "Colleague",
                    });
                }
            }
            catch (err) {
                console.error(`AI Generation failed for row ${recipient.row_id}`, err);
                ai_message =
                    recipient.original_message || `Happy ${occasion}, ${recipient.first_name}!`;
            }
            recipient.ai_message = ai_message;
            await recipient.save();
        }
        const bulk = await BulkUpload_1.default.findById(bulkId);
        if (bulk) {
            bulk.status = "ready";
            await bulk.save();
        }
    }
    catch (error) {
        console.error("AI processing error:", error);
    }
};
/**
 * Helper function for background bulk processing
 * This replaces BullMQ/Redis for a simpler implementation.
 */
const processBulkPublish = async (bulkId, userId) => {
    try {
        const bulk = await BulkUpload_1.default.findById(bulkId);
        if (!bulk)
            return;
        const recipients = await BulkRecipient_1.default.find({ bulkId });
        for (const recipient of recipients) {
            if (recipient.status === "published")
                continue;
            // 1. Generate slug
            const slug = (0, slugify_1.default)(`${recipient.first_name}-${recipient.last_name}-${(0, uuid_1.v4)().slice(0, 6)}`, {
                lower: true,
                strict: true,
            });
            // 2. Create Website Page (incorporating styles)
            const website = await Website_1.default.create({
                userId,
                recipientName: `${recipient.first_name} ${recipient.last_name}`,
                recipientEmail: recipient.email,
                occasion: bulk.occasion,
                message: recipient.ai_message,
                slug,
                status: "live",
                theme: bulk.styleConfig?.theme,
                font: bulk.styleConfig?.font,
                layout: bulk.styleConfig?.layout,
                language: bulk.styleConfig?.language,
                expiresAt: bulk.styleConfig?.expiresAt,
                password: bulk.styleConfig?.password,
                images: recipient.images,
                voiceMessageUrl: recipient.voiceMessageUrl,
                voiceMessagePublicId: recipient.voiceMessagePublicId,
                publicUrl: `${process.env.CLIENT_URL || "https://wishcube.app"}/w/${slug}`,
            });
            // 3. Create Gift record if gift was attached
            if (recipient.gift) {
                const giftRecord = await Gift_1.default.create({
                    senderId: userId,
                    websiteId: website._id,
                    type: recipient.gift.gift_type === "physical" ? "physical" : "digital",
                    amount: recipient.gift.amount,
                    currency: recipient.gift.currency,
                    productId: recipient.gift.gift_type === "physical"
                        ? recipient.gift.gift_id
                        : null,
                    status: "pending",
                    isPaid: true,
                    amountPaid: recipient.gift.amount || 0,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                });
                website.giftIds = [giftRecord._id];
                await website.save();
            }
            // 4. Update recipient
            recipient.status = "published";
            recipient.wishcube_link = website.publicUrl;
            recipient.websiteId = website._id;
            await recipient.save();
            // 5. Send email
            try {
                const emailHtml = (0, emailTemplates_1.websitePublishedTemplate)(recipient.first_name, "Your Company", ` for ${bulk.occasion}`, website.publicUrl);
                await (0, email_1.sendEmail)({
                    to: recipient.email,
                    subject: `A personalized WishCube for you!`,
                    html: emailHtml,
                });
            }
            catch (err) {
                console.error(`Failed to send email to ${recipient.email}`, err);
            }
        }
        bulk.status = "completed";
        bulk.published_at = new Date();
        await bulk.save();
    }
    catch (error) {
        console.error("Bulk processing error:", error);
    }
};
/**
 * 1. GET /api/bulk/template
 * Returns a downloadable Excel (.xlsx) template file.
 */
router.get("/template", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = [
        {
            first_name: "John",
            last_name: "Doe",
            email: "john.doe@example.com",
            department: "Engineering",
            custom_message: "Thanks for your hard work!",
        },
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    // Set column widths
    const wscols = [
        { wch: 15 }, // first_name
        { wch: 15 }, // last_name
        { wch: 25 }, // email
        { wch: 20 }, // department
        { wch: 40 }, // custom_message
    ];
    ws["!cols"] = wscols;
    XLSX.utils.book_append_sheet(wb, ws, "Recipients");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="bulk_template.xlsx"');
    res.send(buf);
}));
/**
 * 2. POST /api/bulk/upload
 * Accepts the filled Excel file.
 */
router.post("/upload", authMiddleware_1.protect, upload.single("file"), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    if (user.subscriptionTier === "free") {
        throw new errorHandler_1.AppError("Bulk upload is only available for Pro and Premium users.", 403);
    }
    if (!req.file) {
        throw new errorHandler_1.AppError("Please upload an Excel file.", 400);
    }
    const { occasion } = req.body;
    if (!occasion) {
        throw new errorHandler_1.AppError("Please provide an occasion context.", 400);
    }
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);
    if (rows.length > 500) {
        throw new errorHandler_1.AppError("Maximum 500 rows allowed per bulk upload.", 400);
    }
    const bulk_id = `blk_${(0, uuid_1.v4)().slice(0, 8)}`;
    const bulkUpload = await BulkUpload_1.default.create({
        userId: user._id,
        bulk_id,
        occasion,
        total: 0,
        status: "processing_ai",
    });
    const recipientInputs = [];
    let rowIndex = 1;
    for (const row of rows) {
        const { first_name, last_name, email, department, custom_message } = row;
        // Skip empty rows
        if (!first_name && !last_name && !email)
            continue;
        // Validation
        if (!first_name || !last_name || !email) {
            throw new errorHandler_1.AppError(`Row ${rowIndex} is missing required fields (first_name, last_name, email).`, 400);
        }
        const recipient = await BulkRecipient_1.default.create({
            bulkId: bulkUpload._id,
            row_id: `row_${String(rowIndex).padStart(3, "0")}`,
            first_name,
            last_name,
            email,
            department,
            original_message: custom_message,
            ai_message: "Generating...", // Placeholder until bg job finishes
            status: "pending",
        });
        recipientInputs.push({
            row_id: recipient.row_id,
            first_name: recipient.first_name,
            last_name: recipient.last_name,
            email: recipient.email,
            department: recipient.department,
            original_message: recipient.original_message,
            ai_message: recipient.ai_message,
            gift: null,
            status: recipient.status,
        });
        rowIndex++;
    }
    bulkUpload.total = recipientInputs.length;
    await bulkUpload.save();
    // Trigger AI generation in background
    processAIGeneration(bulkUpload._id, occasion).catch((err) => console.error("Background AI generation trigger error:", err));
    res.status(200).json({
        bulk_id: bulkUpload.bulk_id,
        occasion,
        total: recipientInputs.length,
        recipients: recipientInputs,
    });
}));
/**
 * 3. PATCH /api/bulk/:bulk_id/recipient/:row_id/gift
 */
router.patch("/:bulk_id/recipient/:row_id/gift", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { bulk_id, row_id } = req.params;
    const { gift_type, amount, currency, gift_id } = req.body;
    if (!gift_type)
        throw new errorHandler_1.AppError("gift_type is required", 400);
    if ((gift_type === "voucher" || gift_type === "wallet_credit") && !amount) {
        throw new errorHandler_1.AppError("amount is required for voucher or wallet_credit", 400);
    }
    if (gift_type === "physical" && !gift_id) {
        throw new errorHandler_1.AppError("gift_id is required for physical gifts", 400);
    }
    const bulk = await BulkUpload_1.default.findOne({ bulk_id, userId: req.user?._id });
    if (!bulk)
        throw new errorHandler_1.AppError("Bulk upload not found", 404);
    const recipient = await BulkRecipient_1.default.findOne({ bulkId: bulk._id, row_id });
    if (!recipient)
        throw new errorHandler_1.AppError("Recipient row not found", 404);
    recipient.gift = {
        gift_type,
        amount: amount || 0,
        currency: currency || "NGN",
        gift_id,
    };
    recipient.status = "gift_attached";
    await recipient.save();
    res.status(200).json({
        row_id: recipient.row_id,
        status: recipient.status,
        gift: recipient.gift,
    });
}));
/**
 * NEW: PATCH /api/bulk/:bulk_id/recipient/:row_id/assets
 * Update images and voice message for a recipient.
 */
router.patch("/:bulk_id/recipient/:row_id/assets", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { bulk_id, row_id } = req.params;
    const { images, voiceMessageUrl, voiceMessagePublicId } = req.body;
    const bulk = await BulkUpload_1.default.findOne({ bulk_id, userId: req.user?._id });
    if (!bulk)
        throw new errorHandler_1.AppError("Bulk upload not found", 404);
    const recipient = await BulkRecipient_1.default.findOne({ bulkId: bulk._id, row_id });
    if (!recipient)
        throw new errorHandler_1.AppError("Recipient row not found", 404);
    if (images)
        recipient.images = images;
    if (voiceMessageUrl !== undefined)
        recipient.voiceMessageUrl = voiceMessageUrl;
    if (voiceMessagePublicId !== undefined)
        recipient.voiceMessagePublicId = voiceMessagePublicId;
    await recipient.save();
    res.status(200).json({
        row_id: recipient.row_id,
        recipient,
    });
}));
/**
 * NEW: PATCH /api/bulk/:bulk_id/recipient/:row_id/message
 * Manually update a recipient's AI message.
 */
router.patch("/:bulk_id/recipient/:row_id/message", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { bulk_id, row_id } = req.params;
    const { message } = req.body;
    if (!message)
        throw new errorHandler_1.AppError("message is required", 400);
    const bulk = await BulkUpload_1.default.findOne({ bulk_id, userId: req.user?._id });
    if (!bulk)
        throw new errorHandler_1.AppError("Bulk upload not found", 404);
    const recipient = await BulkRecipient_1.default.findOne({ bulkId: bulk._id, row_id });
    if (!recipient)
        throw new errorHandler_1.AppError("Recipient row not found", 404);
    recipient.ai_message = message;
    await recipient.save();
    res.status(200).json({
        row_id: recipient.row_id,
        ai_message: recipient.ai_message,
    });
}));
/**
 * NEW: POST /api/bulk/:bulk_id/recipient/:row_id/regenerate
 * Regenerate AI message for a specific recipient.
 */
router.post("/:bulk_id/recipient/:row_id/regenerate", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { bulk_id, row_id } = req.params;
    const { aiTone, language } = req.body;
    const bulk = await BulkUpload_1.default.findOne({ bulk_id, userId: req.user?._id });
    if (!bulk)
        throw new errorHandler_1.AppError("Bulk upload not found", 404);
    const recipient = await BulkRecipient_1.default.findOne({ bulkId: bulk._id, row_id });
    if (!recipient)
        throw new errorHandler_1.AppError("Recipient row not found", 404);
    try {
        const ai_message = await (0, aiMessage_1.generateCardMessage)({
            recipientName: recipient.first_name,
            occasion: recipient.original_message
                ? `${bulk.occasion} (context: ${recipient.original_message})`
                : bulk.occasion,
            tone: aiTone || "Professional",
            language: language || "English",
            relationship: recipient.department
                ? `Colleague in ${recipient.department}`
                : "Colleague",
        });
        recipient.ai_message = ai_message;
        await recipient.save();
    }
    catch (err) {
        throw new errorHandler_1.AppError("AI Regeneration failed. Please try again.", 500);
    }
    res.status(200).json({
        row_id: recipient.row_id,
        ai_message: recipient.ai_message,
    });
}));
/**
 * 4. GET /api/bulk/:bulk_id/summary
 */
router.get("/:bulk_id/summary", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { bulk_id } = req.params;
    const bulk = await BulkUpload_1.default.findOne({ bulk_id, userId: req.user?._id });
    if (!bulk)
        throw new errorHandler_1.AppError("Bulk upload not found", 404);
    const recipients = await BulkRecipient_1.default.find({ bulkId: bulk._id });
    const total = recipients.length;
    const gift_attached = recipients.filter((r) => r.status === "gift_attached" || r.status === "published").length;
    const pending = total - gift_attached;
    const ai_generation_status = bulk.status === "processing_ai"
        ? "processing"
        : bulk.status === "ready" ||
            bulk.status === "publishing" ||
            bulk.status === "completed"
            ? "completed"
            : "failed";
    res.status(200).json({
        bulk_id,
        total,
        gift_attached,
        pending,
        ai_generation_status,
        status: bulk.status,
        ready_to_publish: pending === 0 && total > 0 && bulk.status === "ready",
    });
}));
/**
 * 5. POST /api/bulk/:bulk_id/publish
 */
router.post("/:bulk_id/publish", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { bulk_id } = req.params;
    const { theme, font, layout, language, aiTone, expiresAt, password } = req.body;
    const bulk = await BulkUpload_1.default.findOne({ bulk_id, userId: req.user?._id });
    if (!bulk)
        throw new errorHandler_1.AppError("Bulk upload not found", 404);
    const pendingCount = await BulkRecipient_1.default.countDocuments({
        bulkId: bulk._id,
        status: "pending",
    });
    if (pendingCount > 0) {
        throw new errorHandler_1.AppError("All recipients must have gifts attached before publishing.", 400);
    }
    // Update style config and status
    bulk.styleConfig = {
        theme,
        font,
        layout,
        language,
        aiTone,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        password,
    };
    bulk.status = "publishing";
    await bulk.save();
    // Fire and forget: Process in background without blocking the response
    processBulkPublish(bulk._id, req.user?._id).catch((err) => console.error("Bulk publish trigger error:", err));
    res.status(202).json({
        message: "Publishing started in background.",
        bulk_id,
    });
}));
/**
 * 6. GET /api/bulk/:bulk_id/export
 */
router.get("/:bulk_id/export", authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { bulk_id } = req.params;
    const bulk = await BulkUpload_1.default.findOne({ bulk_id, userId: req.user?._id });
    if (!bulk)
        throw new errorHandler_1.AppError("Bulk upload not found", 404);
    if (bulk.status !== "completed") {
        throw new errorHandler_1.AppError("Bulk upload is not yet published.", 400);
    }
    const recipients = await BulkRecipient_1.default.find({ bulkId: bulk._id });
    const csvData = recipients.map((r) => ({
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        department: r.department || "",
        wishcube_link: r.wishcube_link || "",
        status: r.status,
    }));
    const filePath = path_1.default.join(__dirname, `../../temp/bulk_export_${bulk_id}.csv`);
    if (!fs_1.default.existsSync(path_1.default.join(__dirname, "../../temp"))) {
        fs_1.default.mkdirSync(path_1.default.join(__dirname, "../../temp"), { recursive: true });
    }
    const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
        path: filePath,
        header: [
            { id: "first_name", title: "first_name" },
            { id: "last_name", title: "last_name" },
            { id: "email", title: "email" },
            { id: "department", title: "department" },
            { id: "wishcube_link", title: "wishcube_link" },
            { id: "status", title: "status" },
        ],
    });
    await csvWriter.writeRecords(csvData);
    res.download(filePath, `wishcube_bulk_${bulk_id}.csv`, (err) => {
        if (err)
            console.error("Export download error:", err);
        // Delete temp file after download
        if (fs_1.default.existsSync(filePath))
            fs_1.default.unlinkSync(filePath);
    });
}));
exports.default = router;
