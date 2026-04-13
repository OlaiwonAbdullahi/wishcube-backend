# Bulk WishCube Generation Feature Documentation

This document outlines the bulk generation feature for WishCube, which allows companies on a subscription plan to generate personalized website pages in bulk via Excel upload.

## Overview

The feature follows a multi-step process:
1. **Template Download**: Get the Excel template.
2. **Bulk Upload**: Upload the filled Excel file and process with AI.
3. **Gift Attachment**: Individually attach gifts to recipients.
4. **Publishing**: Trigger background page generation and email distribution.
5. **Export**: Download a master list of all generated links.

---

## 1. Data Models

### **BulkUpload** (`BulkUpload.ts`)
Tracks the overall status of a batch.
- `userId`: The company/user ID who initiated the upload.
- `bulk_id`: A unique string identifier (e.g., `blk_abc123`).
- `occasion`: The context for AI personalization (e.g., `christmas`, `onboarding`).
- `total`: Total number of recipients in the batch.
- `status`: `pending` or `published`.
- `published_at`: Timestamp when the batch was fully processed.

### **BulkRecipient** (`BulkRecipient.ts`)
Stores details for each recipient in a batch.
- `bulkId`: Reference to the parent `BulkUpload`.
- `row_id`: A unique row identifier (e.g., `row_001`).
- `first_name`, `last_name`, `email`, `department`: Recipient details.
- `original_message`: The message provided in the Excel file.
- `ai_message`: The AI-refined or generated message.
- `gift`: Stores type, amount, currency, and optional gift ID.
- `status`: `pending`, `gift_attached`, or `published`.
- `wishcube_link`: The final generated URL.
- `websiteId`: Reference to the generated `Website` document.

---

## 2. API Endpoints

### **GET /api/bulk/template**
Returns a downloadable `.xlsx` template file.
- **Access**: Private (Authenticated).
- **Columns**: `first_name`, `last_name`, `email`, `department`, `custom_message`.

### **POST /api/bulk/upload**
Uploads and parses an Excel file.
- **Access**: Private (Pro/Premium subscribers).
- **Body**: `multipart/form-data` with `file` (.xlsx) and `occasion`.
- **Logic**:
    - Validates required fields (`first_name`, `last_name`, `email`).
    - Skips trailing empty rows.
    - Limits to 500 rows.
    - Runs AI personalization for each row (refining existing messages or generating new ones).
- **Response**: Returns a preview payload with `bulk_id` and all processed recipients.

### **PATCH /api/bulk/:bulk_id/recipient/:row_id/gift**
Attaches a gift to a specific row.
- **Access**: Private.
- **Body**: `{ gift_type, amount, currency, gift_id }`.
- **Validation**: Ensures all required fields for the gift type are present.
- **Effect**: Updates row status to `gift_attached`.

### **GET /api/bulk/:bulk_id/summary**
Returns a summary of the batch's progress.
- **Response**: `{ bulk_id, total, gift_attached, pending, ready_to_publish }`.
- `ready_to_publish` is true only when `pending === 0`.

### **POST /api/bulk/:bulk_id/publish**
Triggers the background generation process.
- **Access**: Private.
- **Behavior**: Starts an async process that loops through recipients to:
    1. Generate a unique slug.
    2. Create a `Website` page.
    3. Create a `Gift` record (if attached).
    4. Link the gift to the website.
    5. Send a personalized email to the recipient.
    6. Mark row as `published`.
- **Response**: Returns `202 Accepted` immediately.

### **GET /api/bulk/:bulk_id/export**
Downloads a CSV with all generated links.
- **Access**: Private.
- **Availability**: Only after the batch status is `published`.
- **Columns**: `first_name`, `last_name`, `email`, `department`, `wishcube_link`, `status`.

---

## 3. Background Processing

This feature uses **Native Async Background Processing** rather than a separate queue service like Redis/BullMQ to minimize infrastructure requirements.

- When `/publish` is called, the server fires an async function (`processBulkPublish`) and returns a response immediately.
- The function continues to run on the server instance, processing each recipient sequentially to avoid overwhelming the AI or database.
- Errors during background processing are logged, and the `BulkUpload` status remains `pending` if not all rows are completed successfully.
