# WishCube Comprehensive Technical Documentation

This document provides an in-depth guide to the WishCube platform, covering core modules, integration flows, and frontend-backend interaction specifications.

---

## **1. Celebration Websites**

Personalized celebration pages are the core of the WishCube experience. Users can create, customize, and publish these pages for various occasions.

### **API Endpoints**

#### **Create a Website**

- **Endpoint**: `POST /api/websites`
- **Request Body**:
  ```json
  {
    "recipientName": "John Doe",
    "occasion": "Birthday",
    "relationship": "Friend",
    "language": "English",
    "message": "Happy Birthday John!",
    "isAiGenerated": false,
    "aiTone": "Heartfelt",
    "images": [
      {
        "url": "https://res.cloudinary.com/...",
        "publicId": "card_image_1",
        "order": 1
      }
    ],
    "videoUrl": null,
    "videoPublicId": null,
    "voiceMessageUrl": null,
    "voiceMessagePublicId": null,
    "musicTrack": "Birthday Song",
    "musicUrl": "https://res.cloudinary.com/...",
    "theme": "classic",
    "font": "Inter",
    "primaryColor": "#6366f1",
    "countdownDate": "2026-04-01T00:00:00.000Z",
    "isPasswordProtected": false,
    "password": null,
    "customSlug": "john-birthday-2026",
    "expiresAt": "2026-05-01T00:00:00.000Z"
  }
  ```
- **Response Example**:
  ```json
  {
    "success": true,
    "message": "Website created successfully",
    "data": {
      "website": {
        "_id": "65f...",
        "recipientName": "John Doe",
        "status": "draft",
        "views": 0,
        "reaction": { "emoji": null, "reactedAt": null },
        "recipientReply": { "message": null, "repliedAt": null },
        ...
      }
    }
  }
  ```

#### **Publish a Website**

- **Endpoint**: `POST /api/websites/:id/publish`
- **Request Body**:
  ```json
  {
    "customSlug": "john-birthday-2026",
    "expiresAt": "2026-05-01T00:00:00.000Z"
  }
  ```
- **Response Example**:
  ```json
  {
    "success": true,
    "message": "Website published successfully",
    "data": {
      "website": {
        "slug": "john-birthday-2026",
        "status": "live",
        "publicUrl": "https://usewishcube.com/w/john-birthday-2026",
        ...
      },
      "shareUrl": "https://usewishcube.com/w/john-birthday-2026"
    }
  }
  ```

#### **Get Live Website (Public)**

- **Endpoint**: `GET /api/websites/live/:slug`
- **Response Example**:
  ```json
  {
    "success": true,
    "data": {
      "website": {
        "recipientName": "John Doe",
        "occasion": "Birthday",
        "message": "...",
        "giftId": {
          "type": "digital",
          "amount": 5000,
          "currency": "NGN",
          "status": "pending",
          ...
        }
      }
    }
  }
  ```

#### **Submit Reaction**

- **Endpoint**: `POST /api/websites/live/:slug/react`
- **Request Body**:
  ```json
  {
    "emoji": "❤️"
  }
  ```
- **Response Example**:
  ```json
  {
    "success": true,
    "message": "Reaction submitted successfully",
    "data": {
      "reaction": {
        "emoji": "❤️",
        "reactedAt": "2026-03-22T12:00:00.000Z"
      }
    }
  }
  ```

#### **Submit Reply**

- **Endpoint**: `POST /api/websites/live/:slug/reply`
- **Request Body**:
  ```json
  {
    "message": "Thank you so much!"
  }
  ```
- **Response Example**:
  ```json
  {
    "success": true,
    "message": "Reply submitted successfully",
    "data": {
      "recipientReply": {
        "message": "Thank you so much!",
        "repliedAt": "2026-03-22T12:05:00.000Z"
      }
    }
  }
  ```

---

## **2. Gift Integration & Redemption**

### **API Endpoints**

#### **Attach a Gift**

- **Endpoint**: `POST /api/gifts`
- **Request Body**:
  ```json
  {
    "websiteId": "65f...",
    "type": "digital",
    "amount": 5000,
    "currency": "NGN",
    "productId": null,
    "paymentMethod": "paystack",
    "giftMessage": "Enjoy your birthday gift!"
  }
  ```
- **Response Example (Paystack)**:
  ```json
  {
    "success": true,
    "data": {
      "gift": {
        "_id": "65g...",
        "type": "digital",
        "amountPaid": 5000,
        "currency": "NGN",
        "status": "pending",
        "escrowStatus": "holding"
      },
      "paymentUrl": "https://checkout.paystack.com/...",
      "reference": "pstk_ref_123"
    }
  }
  ```

#### **Redeem a Gift (Recipient)**

- **Endpoint**: `POST /api/gifts/redeem/:token`
- **Request Body (Digital)**:
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
- **Request Body (Physical)**:
  ```json
  {
    "deliveryAddress": {
      "fullName": "John Doe",
      "phone": "08012345678",
      "address": "123 Main St",
      "city": "Ikeja",
      "state": "Lagos"
    }
  }
  ```
- **Response Example**:
  ```json
  {
    "success": true,
    "message": "Gift redeemed successfully",
    "data": {
      "gift": {
        "status": "redeemed",
        "redeemedAt": "2026-03-22T14:00:00.000Z",
        ...
      }
    }
  }
  ```

---

## **3. Marketplace & Vendor System**

### **API Endpoints**

#### **Get Products**

- **Endpoint**: `GET /api/products`
- **Query Params**: `category`, `occasion`, `state`, `search`, `minPrice`, `maxPrice`, `featured`
- **Response Example**:
  ```json
  {
    "success": true,
    "data": {
      "total": 1,
      "products": [
        {
          "_id": "65h...",
          "name": "Chocolate Cake",
          "description": "Rich dark chocolate cake",
          "price": 12000,
          "images": [{ "url": "...", "publicId": "..." }],
          "category": "Cakes",
          "occasionTags": ["Birthday"],
          "deliveryZones": ["Lagos"],
          "stock": 10,
          "isAvailable": true,
          "vendorId": {
            "storeName": "Sweet Delights",
            "slug": "sweet-delights",
            "logo": "...",
            "rating": 4.5
          }
        }
      ]
    }
  }
  ```

#### **Apply as Vendor**

- **Endpoint**: `POST /api/vendors/apply`
- **Request Body**:
  ```json
  {
    "ownerName": "Jane Smith",
    "email": "jane@example.com",
    "password": "securepassword123",
    "storeName": "My Gift Shop",
    "description": "Unique gifts for all",
    "category": "Gifts",
    "deliveryZones": ["Lagos", "Abuja"],
    "bankDetails": {
      "accountName": "My Shop LTD",
      "accountNumber": "1234567890",
      "bankCode": "058",
      "bankName": "GTBank"
    }
  }
  ```
- **Response Example**:
  ```json
  {
    "success": true,
    "message": "Application submitted successfully",
    "data": {
      "vendor": {
        "storeName": "My Gift Shop",
        "status": "pending",
        ...
      }
    }
  }
  ```

---

## **4. Payment Systems & Wallet**

### **Wallet API Endpoints**

#### **Get Balance**

- **Endpoint**: `GET /api/wallet/balance`
- **Response Example**:
  ```json
  {
    "success": true,
    "data": {
      "walletBalance": 15000
    }
  }
  ```

#### **Fund Wallet**

- **Endpoint**: `POST /api/wallet/fund`
- **Request Body**:
  ```json
  {
    "amount": 10000
  }
  ```
- **Response Example**:
  ```json
  {
    "success": true,
    "data": {
      "paymentUrl": "https://checkout.paystack.com/...",
      "reference": "fund_ref_123"
    }
  }
  ```

#### **Verify Funding**

- **Endpoint**: `POST /api/wallet/verify`
- **Request Body**:
  ```json
  {
    "reference": "fund_ref_123"
  }
  ```
- **Response Example**:
  ```json
  {
    "success": true,
    "message": "Wallet funded successfully",
    "data": {
      "newBalance": 25000
    }
  }
  ```

---

## **5. Frontend Interaction Specifications**

### **Handling Payments (Workflow)**

1. **Initiate**: Call `POST /api/gifts` or `POST /api/wallet/fund`.
2. **Redirect**: Use `data.paymentUrl` for Paystack.
3. **Verify**: On return, call `POST /api/gifts/verify-payment` or `POST /api/wallet/verify` with the `reference`.

---

_Version 1.3.0 | Last Updated: March 2026_
