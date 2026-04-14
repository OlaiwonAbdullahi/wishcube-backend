# Bulk Builder Flow & Backend Documentation

This document outlines the operational flow of the **Bulk Builder** module and provides technical specifications for the API endpoints.

## 1. Operational Flow

### Phase 1: Batch Initialization (Upload)
1. **Template Download**: User downloads the standardized Excel/CSV template.
   - **Endpoint**: `GET /api/bulk/template`
2. **File Upload**: User uploads the filled file along with an `occasion`.
   - **Endpoint**: `POST /api/bulk/upload`
   - **Backend Task**: Create `BulkUpload` record, parse recipients, and trigger background AI message generation.
   - **Response**: Returns `bulk_id` and recipient preview (with "Generating..." placeholders).

### Phase 2: Refinement & Customization (Preview)
1. **Progress Monitoring**: The dashboard polls the batch status.
   - **Endpoint**: `GET /api/bulk/:bulkId/summary` (Every 5-10 seconds).
2. **Individual Recipient Actions**:
   - **Attach Gift**: Link a gift (voucher, physical, or wallet) to a recipient.
     - **Endpoint**: `PATCH /api/bulk/:bulkId/recipient/:rowId/gift`
   - **Edit Message**: Manually refine the AI generated message.
     - **Endpoint**: `PATCH /api/bulk/:bulkId/recipient/:rowId/message`
   - **Regenerate Message**: Re-run AI with different tone/language.
     - **Endpoint**: `POST /api/bulk/:bulkId/recipient/:rowId/regenerate`

### Phase 3: Background Publishing
1. **Trigger Generation**: User clicks "Publish All Pages" and sends global style config.
   - **Endpoint**: `POST /api/bulk/:bulkId/publish`
   - **Backend Task**: background worker generates public WishCube URLs for every recipient.

### Phase 4: Distribution
1. **Link Export**: User downloads the final list of generated links.
   - **Endpoint**: `GET /api/bulk/:bulkId/export`

---

## 2. API Reference

### 1. Download Template
- **URL**: `/api/bulk/template`
- **Method**: `GET`
- **Response**: Binary stream (Excel file)

### 2. Upload Recipients
- **URL**: `/api/bulk/upload`
- **Method**: `POST`
- **Payload (FormData)**:
  - `file`: Excel file (max 500 rows)
  - `occasion`: String (e.g., "Easter", "Monthly Rewards")
- **Response (`200 OK`)**:
```json
{
  "bulk_id": "blk_82c2f5bc",
  "occasion": "Easter Rewards",
  "total": 50,
  "recipients": [
    {
      "row_id": "row_001",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "department": "Engineering",
      "ai_message": "Generating...",
      "status": "pending"
    }
  ]
}
```

### 3. Get Summary (Polling)
- **URL**: `/api/bulk/:bulkId/summary`
- **Method**: `GET`
- **Response (`200 OK`)**:
```json
{
  "bulk_id": "blk_82c2f5bc",
  "total": 50,
  "gift_attached": 12,
  "pending": 38,
  "ai_generation_status": "processing | completed | failed",
  "status": "processing_ai | ready | publishing | completed",
  "ready_to_publish": true // Logic: all gifts attached + status is 'ready'
}
```

### 4. Attach Gift
- **URL**: `/api/bulk/:bulkId/recipient/:rowId/gift`
- **Method**: `PATCH`
- **Payload**:
```json
{
  "gift_type": "voucher | physical | wallet_credit",
  "amount": 5000,
  "currency": "NGN",
  "gift_id": "prod_uuid_here" // Only for physical gifts
}
```
- **Response (`200 OK`)**:
```json
{
  "row_id": "row_001",
  "status": "gift_attached",
  "gift": { ... }
}
```

### 5. Update Message Manually
- **URL**: `/api/bulk/:bulkId/recipient/:rowId/message`
- **Method**: `PATCH`
- **Payload**:
```json
{
  "message": "Custom message text here..."
}
```

### 6. Regenerate AI Message
- **URL**: `/api/bulk/:bulkId/recipient/:rowId/regenerate`
- **Method**: `POST`
- **Payload**:
```json
{
  "aiTone": "Funny | Professional | Emotional", // Optional
  "language": "English | Yoruba | French" // Optional
}
```

### 7. Publish Batch
- **URL**: `/api/bulk/:bulkId/publish`
- **Method**: `POST`
- **Payload (Global Styles)**:
```json
{
  "theme": "modern",
  "font": "Inter",
  "layout": "centered",
  "language": "English",
  "expiresAt": "2024-12-31T23:59:59Z", // Optional
  "password": "optional_secure_pass"
}
```
- **Response (`202 Accepted`)**:
```json
{
  "message": "Publishing started in background.",
  "bulk_id": "blk_82c2f5bc"
}
```

### 8. Export Links
- **URL**: `/api/bulk/:bulkId/export`
- **Method**: `GET`
- **Response**: CSV file download with columns: `first_name`, `last_name`, `email`, `department`, `wishcube_link`, `status`.
