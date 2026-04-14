import express, { Request, Response } from "express";
import * as XLSX from "xlsx";
import { protect } from "../middleware/authMiddleware";
import { asyncHandler, AppError } from "../utils/errorHandler";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import BulkUpload from "../model/BulkUpload";
import BulkRecipient from "../model/BulkRecipient";
import { generateCardMessage } from "../utils/aiMessage";
import Website from "../model/Website";
import Gift from "../model/Gift";
import { sendEmail } from "../utils/email";
import { websitePublishedTemplate } from "../utils/emailTemplates";
import slugify from "slugify";
import { createObjectCsvWriter } from "csv-writer";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Helper function for background AI message generation.
 */
const processAIGeneration = async (bulkId: any, occasion: string) => {
  try {
    const recipients = await BulkRecipient.find({ bulkId });
    for (const recipient of recipients) {
      let ai_message = "";
      try {
        if (recipient.original_message) {
          ai_message = await generateCardMessage({
            recipientName: recipient.first_name,
            occasion: `${occasion} (refining: ${recipient.original_message})`,
            tone: "Professional",
            relationship: recipient.department
              ? `Colleague in ${recipient.department}`
              : "Colleague",
          });
        } else {
          ai_message = await generateCardMessage({
            recipientName: recipient.first_name,
            occasion: occasion,
            tone: "Professional",
            relationship: recipient.department
              ? `Colleague in ${recipient.department}`
              : "Colleague",
          });
        }
      } catch (err) {
        console.error(`AI Generation failed for row ${recipient.row_id}`, err);
        ai_message =
          recipient.original_message || `Happy ${occasion}, ${recipient.first_name}!`;
      }

      recipient.ai_message = ai_message;
      await recipient.save();
    }

    const bulk = await BulkUpload.findById(bulkId);
    if (bulk) {
      bulk.status = "ready";
      await bulk.save();
    }
  } catch (error) {
    console.error("AI processing error:", error);
  }
};

/**
 * Helper function for background bulk processing
 * This replaces BullMQ/Redis for a simpler implementation.
 */
const processBulkPublish = async (bulkId: any, userId: any) => {
  try {
    const bulk = await BulkUpload.findById(bulkId);
    if (!bulk) return;

    const recipients = await BulkRecipient.find({ bulkId });

    for (const recipient of recipients) {
      if (recipient.status === "published") continue;

      // 1. Generate slug
      const slug = slugify(
        `${recipient.first_name}-${recipient.last_name}-${uuidv4().slice(0, 6)}`,
        {
          lower: true,
          strict: true,
        },
      );

      // 2. Create Website Page (incorporating styles)
      const website = await Website.create({
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
        publicUrl: `${
          process.env.CLIENT_URL || "https://wishcube.app"
        }/w/${slug}`,
      });

      // 3. Create Gift record if gift was attached
      if (recipient.gift) {
        const giftRecord = await Gift.create({
          senderId: userId,
          websiteId: website._id,
          type:
            recipient.gift.gift_type === "physical" ? "physical" : "digital",
          amount: recipient.gift.amount,
          currency: recipient.gift.currency,
          productId:
            recipient.gift.gift_type === "physical"
              ? recipient.gift.gift_id
              : null,
          status: "pending",
          isPaid: true,
          amountPaid: recipient.gift.amount || 0,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });

        website.giftIds = [giftRecord._id as mongoose.Types.ObjectId];
        await website.save();
      }

      // 4. Update recipient
      recipient.status = "published";
      recipient.wishcube_link = website.publicUrl!;
      recipient.websiteId = website._id as mongoose.Types.ObjectId;
      await recipient.save();

      // 5. Send email
      try {
        const emailHtml = websitePublishedTemplate(
          recipient.first_name,
          "Your Company",
          ` for ${bulk.occasion}`,
          website.publicUrl!,
        );
        await sendEmail({
          to: recipient.email,
          subject: `A personalized WishCube for you!`,
          html: emailHtml,
        });
      } catch (err) {
        console.error(`Failed to send email to ${recipient.email}`, err);
      }
    }

    bulk.status = "completed";
    bulk.published_at = new Date();
    await bulk.save();
  } catch (error) {
    console.error("Bulk processing error:", error);
  }
};

/**
 * 1. GET /api/bulk/template
 * Returns a downloadable Excel (.xlsx) template file.
 */
router.get(
  "/template",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
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

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="bulk_template.xlsx"',
    );
    res.send(buf);
  }),
);

/**
 * 2. POST /api/bulk/upload
 * Accepts the filled Excel file.
 */
router.post(
  "/upload",
  protect,
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    if (user.subscriptionTier === "free") {
      throw new AppError(
        "Bulk upload is only available for Pro and Premium users.",
        403,
      );
    }

    if (!req.file) {
      throw new AppError("Please upload an Excel file.", 400);
    }

    const { occasion } = req.body;
    if (!occasion) {
      throw new AppError("Please provide an occasion context.", 400);
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (rows.length > 500) {
      throw new AppError("Maximum 500 rows allowed per bulk upload.", 400);
    }

    const bulk_id = `blk_${uuidv4().slice(0, 8)}`;
    const bulkUpload = await BulkUpload.create({
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
      if (!first_name && !last_name && !email) continue;

      // Validation
      if (!first_name || !last_name || !email) {
        throw new AppError(
          `Row ${rowIndex} is missing required fields (first_name, last_name, email).`,
          400,
        );
      }

      const recipient = await BulkRecipient.create({
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
    processAIGeneration(bulkUpload._id, occasion).catch((err) =>
      console.error("Background AI generation trigger error:", err),
    );

    res.status(200).json({
      bulk_id: bulkUpload.bulk_id,
      occasion,
      total: recipientInputs.length,
      recipients: recipientInputs,
    });
  }),
);

/**
 * 3. PATCH /api/bulk/:bulk_id/recipient/:row_id/gift
 */
router.patch(
  "/:bulk_id/recipient/:row_id/gift",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { bulk_id, row_id } = req.params;
    const { gift_type, amount, currency, gift_id } = req.body;

    if (!gift_type) throw new AppError("gift_type is required", 400);
    if ((gift_type === "voucher" || gift_type === "wallet_credit") && !amount) {
      throw new AppError(
        "amount is required for voucher or wallet_credit",
        400,
      );
    }
    if (gift_type === "physical" && !gift_id) {
      throw new AppError("gift_id is required for physical gifts", 400);
    }

    const bulk = await BulkUpload.findOne({ bulk_id, userId: req.user?._id });
    if (!bulk) throw new AppError("Bulk upload not found", 404);

    const recipient = await BulkRecipient.findOne({ bulkId: bulk._id, row_id });
    if (!recipient) throw new AppError("Recipient row not found", 404);

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
  }),
);

/**
 * NEW: PATCH /api/bulk/:bulk_id/recipient/:row_id/message
 * Manually update a recipient's AI message.
 */
router.patch(
  "/:bulk_id/recipient/:row_id/message",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { bulk_id, row_id } = req.params;
    const { message } = req.body;

    if (!message) throw new AppError("message is required", 400);

    const bulk = await BulkUpload.findOne({ bulk_id, userId: req.user?._id });
    if (!bulk) throw new AppError("Bulk upload not found", 404);

    const recipient = await BulkRecipient.findOne({ bulkId: bulk._id, row_id });
    if (!recipient) throw new AppError("Recipient row not found", 404);

    recipient.ai_message = message;
    await recipient.save();

    res.status(200).json({
      row_id: recipient.row_id,
      ai_message: recipient.ai_message,
    });
  }),
);

/**
 * NEW: POST /api/bulk/:bulk_id/recipient/:row_id/regenerate
 * Regenerate AI message for a specific recipient.
 */
router.post(
  "/:bulk_id/recipient/:row_id/regenerate",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { bulk_id, row_id } = req.params;
    const { aiTone, language } = req.body;

    const bulk = await BulkUpload.findOne({ bulk_id, userId: req.user?._id });
    if (!bulk) throw new AppError("Bulk upload not found", 404);

    const recipient = await BulkRecipient.findOne({ bulkId: bulk._id, row_id });
    if (!recipient) throw new AppError("Recipient row not found", 404);

    try {
      const ai_message = await generateCardMessage({
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
    } catch (err) {
      throw new AppError("AI Regeneration failed. Please try again.", 500);
    }

    res.status(200).json({
      row_id: recipient.row_id,
      ai_message: recipient.ai_message,
    });
  }),
);

/**
 * 4. GET /api/bulk/:bulk_id/summary
 */
router.get(
  "/:bulk_id/summary",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { bulk_id } = req.params;
    const bulk = await BulkUpload.findOne({ bulk_id, userId: req.user?._id });
    if (!bulk) throw new AppError("Bulk upload not found", 404);

    const recipients = await BulkRecipient.find({ bulkId: bulk._id });
    const total = recipients.length;
    const gift_attached = recipients.filter(
      (r) => r.status === "gift_attached" || r.status === "published",
    ).length;
    const pending = total - gift_attached;

    const ai_generation_status =
      bulk.status === "processing_ai"
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
      ready_to_publish:
        pending === 0 && total > 0 && bulk.status === "ready",
    });
  }),
);

/**
 * 5. POST /api/bulk/:bulk_id/publish
 */
router.post(
  "/:bulk_id/publish",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { bulk_id } = req.params;
    const { theme, font, layout, language, aiTone, expiresAt, password } =
      req.body;

    const bulk = await BulkUpload.findOne({ bulk_id, userId: req.user?._id });
    if (!bulk) throw new AppError("Bulk upload not found", 404);

    const pendingCount = await BulkRecipient.countDocuments({
      bulkId: bulk._id,
      status: "pending",
    });

    if (pendingCount > 0) {
      throw new AppError(
        "All recipients must have gifts attached before publishing.",
        400,
      );
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
    processBulkPublish(bulk._id, req.user?._id).catch((err) =>
      console.error("Bulk publish trigger error:", err),
    );

    res.status(202).json({
      message: "Publishing started in background.",
      bulk_id,
    });
  }),
);

/**
 * 6. GET /api/bulk/:bulk_id/export
 */
router.get(
  "/:bulk_id/export",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { bulk_id } = req.params;
    const bulk = await BulkUpload.findOne({ bulk_id, userId: req.user?._id });
    if (!bulk) throw new AppError("Bulk upload not found", 404);

    if (bulk.status !== "completed") {
      throw new AppError("Bulk upload is not yet published.", 400);
    }

    const recipients = await BulkRecipient.find({ bulkId: bulk._id });

    const csvData = recipients.map((r) => ({
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      department: r.department || "",
      wishcube_link: r.wishcube_link || "",
      status: r.status,
    }));

    const filePath = path.join(
      __dirname,
      `../../temp/bulk_export_${bulk_id}.csv`,
    );
    if (!fs.existsSync(path.join(__dirname, "../../temp"))) {
      fs.mkdirSync(path.join(__dirname, "../../temp"), { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
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
      if (err) console.error("Export download error:", err);
      // Delete temp file after download
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  }),
);

export default router;
