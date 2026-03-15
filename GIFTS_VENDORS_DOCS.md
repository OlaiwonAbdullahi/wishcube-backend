# WishCube Gifts, Vendors & Storefront Documentation

This document covers the endpoints for managing gifts, vendor applications, marketplace operations, and storefront interactions.

**Base URL:** `https://api.usewishcube.com/api` (or `http://localhost:5000/api`)

---

## 🎁 Gifts

### 1. Attach a Gift to a Website
**Endpoint:** `POST /gifts`  
**Access:** Private (Authenticated User)  
**Description:** Attaches a digital or physical gift to a celebration website.

**Request Body:**
```json
{
  "websiteId": "website_id_here",
  "type": "digital", // or "physical"
  "amount": 5000, // Required if type is digital (in NGN)
  "productId": "product_id_here", // Required if type is physical
  "paymentMethod": "paystack", // or "wallet"
  "giftMessage": "Congratulations on your new job!"
}
```

**Response (Paystack):**
```json
{
  "success": true,
  "message": "Gift created successfully",
  "data": {
    "gift": { ... },
    "paymentUrl": "https://checkout.paystack.com/...",
    "reference": "paystack_reference_here"
  }
}
```

---

### 2. Verify Paystack Payment
**Endpoint:** `POST /gifts/verify-payment`  
**Access:** Private  
**Description:** Verifies a Paystack transaction and activates the gift.

**Request Body:**
```json
{
  "reference": "paystack_reference_here"
}
```

---

### 3. Redeem a Gift (Recipient)
**Endpoint:** `POST /gifts/redeem/:token`  
**Access:** Public  
**Description:** Used by the recipient to claim their gift.

**Request Body (Digital Gift):**
```json
{
  "bankDetails": {
    "accountName": "John Doe",
    "accountNumber": "0123456789",
    "bankCode": "058",
    "bankName": "GTBank"
  }
}
```

**Request Body (Physical Gift):**
```json
{
  "deliveryAddress": {
    "fullName": "Jane Smith",
    "phone": "08012345678",
    "address": "123 Main Street",
    "city": "Lagos",
    "state": "Lagos"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Gift redeemed! Order has been placed.",
  "data": {
    "gift": { ... },
    "order": { ... } // Only for physical gifts
  }
}
```

---

## 🏬 Vendors

### 1. Apply to be a Vendor
**Endpoint:** `POST /vendors/apply`  
**Access:** Private  
**Description:** Submit an application to open a store on WishCube.

**Request Body:**
```json
{
  "storeName": "Sweet Delights Bakery",
  "description": "Premium cakes and pastries",
  "category": "Cakes",
  "deliveryZones": ["Lagos", "Abuja"],
  "bankDetails": {
    "accountName": "Sweet Delights Ltd",
    "accountNumber": "0011223344",
    "bankCode": "058"
  }
}
```

---

### 2. Get Public Storefront
**Endpoint:** `GET /vendors/store/:slug`  
**Access:** Public  
**Description:** Retrieves vendor details and their active products for the marketplace.

**Response:**
```json
{
  "success": true,
  "message": "Store details retrieved successfully",
  "data": {
    "vendor": { ... },
    "products": [ ... ]
  }
}
```

---

### 3. Update Order Status (Vendor)
**Endpoint:** `PUT /vendors/orders/:orderId`  
**Access:** Private (Vendor only)  
**Description:** Vendors use this to update fulfillment status.

**Request Body:**
```json
{
  "status": "shipped", // or "delivered"
  "trackingNumber": "TRACK123",
  "note": "Package is with the courier"
}
```

---

### 4. Admin: Approve Vendor
**Endpoint:** `PUT /vendors/:id/approve`  
**Access:** Private (Admin only)  
**Description:** Approves a vendor application and grants them the `vendor` role.

---

### 5. Admin: Reject Vendor
**Endpoint:** `PUT /vendors/:id/reject`  
**Access:** Private (Admin only)  
**Description:** Rejects a vendor application with a reason.

**Request Body:**
```json
{
  "reason": "Incomplete documentation or invalid bank details."
}
```

---

## 🌐 Website Interactions (Recipient)

### 1. Submit a Reply
**Endpoint:** `POST /websites/live/:slug/reply`  
**Access:** Public  
**Description:** Recipient can leave a thank-you message on their celebration page.

**Request Body:**
```json
{
  "message": "Thank you so much for this beautiful surprise!"
}
```

---

### 2. Submit a Reaction
**Endpoint:** `POST /websites/live/:slug/react`  
**Access:** Public  
**Description:** Recipient can react to the page with an emoji.

**Request Body:**
```json
{
  "emoji": "❤️"
}
```
