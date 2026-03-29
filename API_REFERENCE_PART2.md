# WishCube API Reference — Part 2: Gifts · Vendors · Products · Wallet · Subscriptions · Admin · Waitlist

> **Base URL:** `https://api.usewishcube.com`  
> **Auth:** `Authorization: Bearer <accessToken>` on all 🔒 routes
>
> ← See **Part 1** for: Auth · Cards · Websites

---

## 4. GIFTS `/api/gifts`

**Full Gift Object**

```json
{
  "_id": "67c3d4e5f6a7b8c9d0e1f2a3",
  "senderId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "websiteId": "66b2c3d4e5f6a7b8c9d0e1f2",
  "type": "physical",
  "amount": null,
  "currency": "NGN",
  "productId": "68d4e5f6a7b8c9d0e1f2a3b4",
  "productSnapshot": {
    "name": "Bouquet of Roses",
    "price": 8000,
    "imageUrl": "https://res.cloudinary.com/.../roses.jpg",
    "vendorId": "69e5f6a7b8c9d0e1f2a3b4c5",
    "storeName": "Bloom & Co."
  },
  "paymentMethod": "paystack",
  "paymentReference": "PSK_abc123xyz",
  "amountPaid": 8000,
  "escrowStatus": "holding",
  "giftMessage": "Enjoy your special day!",
  "status": "pending",
  "redeemToken": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "redeemedAt": null,
  "expiresAt": "2026-04-27T13:00:00.000Z",
  "recipientBankDetails": {
    "accountName": null,
    "accountNumber": null,
    "bankCode": null,
    "bankName": null
  },
  "payoutReference": null,
  "payoutStatus": "pending",
  "deliveryAddress": {
    "fullName": null,
    "phone": null,
    "address": null,
    "city": null,
    "state": null
  },
  "createdAt": "2026-03-28T13:00:00.000Z",
  "updatedAt": "2026-03-28T13:00:00.000Z"
}
```

---

### POST `/api/gifts` 🔒 Private · Purchase a gift

> Gifts can be purchased without a `websiteId` and attached to a website later.

**Payload**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `websiteId` | string | ❌ | Link immediately (optional) |
| `type` | string | ✅ | `digital` or `physical` |
| `paymentMethod` | string | ✅ | `paystack` or `wallet` |
| `amount` | number | ✅ if digital | Min ₦100 |
| `productId` | string | ✅ if physical | Must be in stock |
| `giftMessage` | string | ❌ | |

**Response `201` — Paystack payment**

```json
{
  "success": true,
  "message": "Gift created successfully",
  "data": {
    "gift": {
      "_id": "67c3d4e5f6a7b8c9d0e1f2a3",
      "websiteId": null,
      "status": "pending",
      "...full gift object..."
    },
    "paymentUrl": "https://checkout.paystack.com/abc123",
    "reference": "PSK_abc123xyz"
    }
  }
}
```

**Response `201` — Wallet payment** _(no paymentUrl)_

```json
{
  "success": true,
  "message": "Gift created successfully",
  "data": {
    "gift": {
      "_id": "67c3d4e5f6a7b8c9d0e1f2a3",
      "paymentMethod": "wallet",
      "paymentReference": null,
      "amountPaid": 5000,
      "status": "pending",
      "escrowStatus": "holding",
      "...all other gift fields..."
    }
  }
}
```

---

### GET `/api/gifts/unattached` 🔒 Private

Retrieves all gifts purchased by the user that are not yet linked to any celebration website.

**Response `200`**

```json
{
  "success": true,
  "message": "Unattached gifts retrieved successfully",
  "data": {
    "total": 1,
    "gifts": [
      {
        "_id": "67c3d4e5f6a7b8c9d0e1f2a3",
        "senderId": "64f1a2b3c4d5e6f7a8b9c0d1",
        "websiteId": null,
        "type": "physical",
        "productSnapshot": { "name": "Bouquet of Roses", "price": 8000 },
        "status": "pending",
        "...other fields..."
      }
    ]
  }
}
```

---

### POST `/api/gifts/verify-payment` 🔒 Private

**Payload**
| Field | Type | Required |
|-------|------|----------|
| `reference` | string | ✅ |

**Response `200`**

```json
{
  "success": true,
  "message": "Payment verified, gift is active",
  "data": {
    "gift": {
      "_id": "67c3d4e5f6a7b8c9d0e1f2a3",
      "status": "pending",
      "escrowStatus": "holding",
      "paymentReference": "PSK_abc123xyz",
      "...all other gift fields..."
    }
  }
}
```

---

### GET `/api/gifts/sent` 🔒 Private

**Response `200`**

```json
{
  "success": true,
  "message": "Sent gifts retrieved successfully",
  "data": {
    "total": 2,
    "gifts": [
      {
        "_id": "67c3d4e5f6a7b8c9d0e1f2a3",
        "senderId": "64f1a2b3c4d5e6f7a8b9c0d1",
        "type": "physical",
        "amount": null,
        "currency": "NGN",
        "paymentMethod": "paystack",
        "paymentReference": "PSK_abc123xyz",
        "amountPaid": 8000,
        "escrowStatus": "holding",
        "giftMessage": "Enjoy your special day!",
        "status": "pending",
        "redeemToken": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "redeemedAt": null,
        "expiresAt": "2026-04-27T13:00:00.000Z",
        "payoutReference": null,
        "payoutStatus": "pending",
        "websiteId": {
          "_id": "66b2c3d4e5f6a7b8c9d0e1f2",
          "recipientName": "John",
          "occasion": "Birthday",
          "slug": "john-birthday-a3f2b1",
          "publicUrl": "https://usewishcube.com/w/john-birthday-a3f2b1"
        },
        "productId": {
          "_id": "68d4e5f6a7b8c9d0e1f2a3b4",
          "name": "Bouquet of Roses",
          "images": [
            {
              "url": "https://res.cloudinary.com/.../roses.jpg",
              "publicId": "products/roses"
            }
          ]
        },
        "productSnapshot": {
          "name": "Bouquet of Roses",
          "price": 8000,
          "imageUrl": "https://res.cloudinary.com/.../roses.jpg",
          "vendorId": "69e5f6a7b8c9d0e1f2a3b4c5",
          "storeName": "Bloom & Co."
        },
        "createdAt": "2026-03-28T13:00:00.000Z",
        "updatedAt": "2026-03-28T13:00:00.000Z"
      }
    ]
  }
}
```

---

### POST `/api/gifts/redeem/:token` 🌐 Public

**URL Param:** `:token` — UUID from the website gift link

**Payload — Digital gift**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `bankDetails` | object | ✅ | `{ bankName, bankCode, accountNumber, accountName }` |

**Payload — Physical gift**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `deliveryAddress` | object | ✅ | `{ fullName, phone, address, city, state }` |

**Response `200` — Digital gift**

```json
{
  "success": true,
  "message": "Gift redeemed successfully",
  "data": {
    "gift": {
      "_id": "67c3d4e5f6a7b8c9d0e1f2a3",
      "type": "digital",
      "status": "redeemed",
      "redeemedAt": "2026-03-28T14:00:00.000Z",
      "escrowStatus": "holding",
      "amountPaid": 5000,
      "currency": "NGN",
      "recipientBankDetails": {
        "accountName": "John Smith",
        "accountNumber": "0123456789",
        "bankCode": "058",
        "bankName": "GTBank"
      },
      "payoutStatus": "pending",
      "payoutReference": null,
      "...all other gift fields..."
    }
  }
}
```

**Response `200` — Physical gift**

```json
{
  "success": true,
  "message": "Gift redeemed! Order has been placed.",
  "data": {
    "gift": {
      "_id": "67c3d4e5f6a7b8c9d0e1f2a3",
      "type": "physical",
      "status": "redeemed",
      "redeemedAt": "2026-03-28T14:00:00.000Z",
      "deliveryAddress": {
        "fullName": "John Smith",
        "phone": "08012345678",
        "address": "12 Festac Avenue",
        "city": "Lagos",
        "state": "Lagos"
      },
      "...all other gift fields..."
    },
    "order": {
      "_id": "70f6a7b8c9d0e1f2a3b4c5d6",
      "giftId": "67c3d4e5f6a7b8c9d0e1f2a3",
      "vendorId": "69e5f6a7b8c9d0e1f2a3b4c5",
      "productId": "68d4e5f6a7b8c9d0e1f2a3b4",
      "senderId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "productSnapshot": {
        "name": "Bouquet of Roses",
        "price": 8000,
        "imageUrl": "https://res.cloudinary.com/.../roses.jpg"
      },
      "deliveryAddress": {
        "fullName": "John Smith",
        "phone": "08012345678",
        "address": "12 Festac Avenue",
        "city": "Lagos",
        "state": "Lagos"
      },
      "trackingNumber": null,
      "status": "processing",
      "totalAmount": 8000,
      "commissionAmount": 800,
      "vendorEarnings": 7200,
      "vendorPaidOut": false,
      "vendorPaidOutAt": null,
      "statusHistory": [
        { "status": "processing", "updatedAt": "2026-03-28T14:00:00.000Z", "note": "Order created after gift redemption" }
      ],
      "autoConfirmAt": "2026-04-04T14:00:00.000Z",
      "createdAt": "2026-03-28T14:00:00.000Z",
      "updatedAt": "2026-03-28T14:00:00.000Z"
    }
  }
}
```

---

## 5. VENDORS `/api/vendors`

**Full Vendor Object**

```json
{
  "_id": "69e5f6a7b8c9d0e1f2a3b4c5",
  "ownerName": "Amaka Okonkwo",
  "email": "amaka@bloomco.ng",
  "storeName": "Bloom & Co.",
  "slug": "bloom-and-co",
  "description": "Premium floral arrangements for every occasion.",
  "logo": "https://res.cloudinary.com/.../logo.png",
  "logoPublicId": "logos/bloom-and-co",
  "category": "Flowers",
  "deliveryZones": ["Lagos", "Abuja"],
  "bankDetails": {
    "accountName": "Amaka Okonkwo",
    "accountNumber": "0123456789",
    "bankCode": "058",
    "bankName": "GTBank"
  },
  "status": "approved",
  "isActive": true,
  "rating": 4.8,
  "totalSales": 35,
  "totalEarnings": 280000,
  "commissionRate": 0.1,
  "rejectionReason": null,
  "approvedAt": "2026-02-01T10:00:00.000Z",
  "createdAt": "2026-01-15T09:00:00.000Z",
  "updatedAt": "2026-03-28T13:00:00.000Z"
}
```

> `password` is never returned. `bankDetails`, `commissionRate`, `rejectionReason` are hidden from public marketplace listing.

---

### POST `/api/vendors/register` 🌐 Public

**Payload**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `ownerName` | string | ✅ | |
| `email` | string | ✅ | |
| `password` | string | ✅ | Min 6 chars |
| `storeName` | string | ✅ | Generates slug automatically |
| `category` | string | ✅ | `Cakes` `Flowers` `Fashion` `Electronics` `Experiences` `Food` `Jewelry` `Other` |
| `description` | string | ❌ | |

**Response `201`**

```json
{
  "success": true,
  "message": "Vendor registered successfully",
  "data": {
    "vendor": {
      "_id": "69e5f6a7b8c9d0e1f2a3b4c5",
      "ownerName": "Amaka Okonkwo",
      "email": "amaka@bloomco.ng",
      "storeName": "Bloom & Co.",
      "slug": "bloom-and-co",
      "description": "",
      "logo": null,
      "logoPublicId": null,
      "category": "Flowers",
      "deliveryZones": [],
      "bankDetails": {
        "accountName": null,
        "accountNumber": null,
        "bankCode": null,
        "bankName": null
      },
      "status": "pending",
      "isActive": false,
      "rating": 0,
      "totalSales": 0,
      "totalEarnings": 0,
      "commissionRate": 0.1,
      "rejectionReason": null,
      "approvedAt": null,
      "createdAt": "2026-03-28T13:00:00.000Z",
      "updatedAt": "2026-03-28T13:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### POST `/api/vendors/login` 🌐 Public

**Payload**
| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✅ |
| `password` | string | ✅ |

**Response `200`**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "vendor": { "...full vendor object..." },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### POST `/api/vendors/logo` 🔒 Private (Vendor) — `multipart/form-data`

| Form Field | Type | Required |
| ---------- | ---- | -------- |
| `logo`     | file | ✅       |

**Response `200`**

```json
{
  "success": true,
  "message": "Logo uploaded successfully",
  "data": {
    "logo": "https://res.cloudinary.com/wishcube/image/upload/logos/bloom-and-co.png"
  }
}
```

---

### GET `/api/vendors/me` 🔒 Private (Vendor)

**Response `200`**

```json
{
  "success": true,
  "message": "Vendor details retrieved successfully",
  "data": {
    "vendor": { "...full vendor object..." }
  }
}
```

---

### PUT `/api/vendors/me` 🔒 Private (Vendor)

**Payload** _(only these fields accepted)_
| Field | Type |
|-------|------|
| `storeName` | string |
| `description` | string |
| `category` | string |
| `deliveryZones` | string[] |
| `bankDetails` | `{ accountName, accountNumber, bankCode, bankName }` |

**Response `200`**

```json
{
  "success": true,
  "message": "Vendor updated successfully",
  "data": {
    "vendor": { "...full updated vendor object..." }
  }
}
```

---

### GET `/api/vendors/orders` 🔒 Private/Vendor

**Query Params:** `?status=processing|shipped|delivered|cancelled`

**Response `200`**

```json
{
  "success": true,
  "message": "Vendor orders retrieved successfully",
  "data": {
    "total": 3,
    "orders": [
      {
        "_id": "70f6a7b8c9d0e1f2a3b4c5d6",
        "giftId": "67c3d4e5f6a7b8c9d0e1f2a3",
        "vendorId": "69e5f6a7b8c9d0e1f2a3b4c5",
        "productId": "68d4e5f6a7b8c9d0e1f2a3b4",
        "senderId": "64f1a2b3c4d5e6f7a8b9c0d1",
        "productSnapshot": {
          "name": "Bouquet of Roses",
          "price": 8000,
          "imageUrl": "https://res.cloudinary.com/.../roses.jpg"
        },
        "deliveryAddress": {
          "fullName": "John Smith",
          "phone": "08012345678",
          "address": "12 Festac Avenue",
          "city": "Lagos",
          "state": "Lagos"
        },
        "trackingNumber": "TRACK-12345",
        "status": "shipped",
        "totalAmount": 8000,
        "commissionAmount": 800,
        "vendorEarnings": 7200,
        "vendorPaidOut": false,
        "vendorPaidOutAt": null,
        "statusHistory": [
          {
            "status": "processing",
            "updatedAt": "2026-03-28T14:00:00.000Z",
            "note": "Order created after gift redemption"
          },
          {
            "status": "shipped",
            "updatedAt": "2026-03-29T09:00:00.000Z",
            "note": "Dispatched via GIG Logistics"
          }
        ],
        "autoConfirmAt": "2026-04-04T14:00:00.000Z",
        "createdAt": "2026-03-28T14:00:00.000Z",
        "updatedAt": "2026-03-29T09:00:00.000Z"
      }
    ]
  }
}
```

---

### PUT `/api/vendors/orders/:orderId` 🔒 Private/Vendor

**Payload**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `status` | string | ✅ | Only `shipped` or `delivered` |
| `trackingNumber` | string | ❌ | |
| `note` | string | ❌ | Added to statusHistory |

**Response `200`**

```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "order": {
      "_id": "70f6a7b8c9d0e1f2a3b4c5d6",
      "status": "shipped",
      "trackingNumber": "TRACK-12345",
      "statusHistory": [
        { "status": "processing", "updatedAt": "2026-03-28T14:00:00.000Z", "note": "Order created after gift redemption" },
        { "status": "shipped", "updatedAt": "2026-03-29T09:00:00.000Z", "note": "Dispatched via GIG Logistics" }
      ],
      "...all other order fields..."
    }
  }
}
```

---

### GET `/api/vendors` 🌐 Public

**Query Params:** `?category=Flowers&search=bloom`

**Response `200`**

```json
{
  "success": true,
  "message": "Vendors retrieved successfully",
  "data": {
    "total": 1,
    "vendors": [
      {
        "_id": "69e5f6a7b8c9d0e1f2a3b4c5",
        "ownerName": "Amaka Okonkwo",
        "email": "amaka@bloomco.ng",
        "storeName": "Bloom & Co.",
        "slug": "bloom-and-co",
        "description": "Premium floral arrangements for every occasion.",
        "logo": "https://res.cloudinary.com/.../logo.png",
        "logoPublicId": "logos/bloom-and-co",
        "category": "Flowers",
        "deliveryZones": ["Lagos", "Abuja"],
        "status": "approved",
        "isActive": true,
        "rating": 4.8,
        "totalSales": 35,
        "totalEarnings": 280000,
        "approvedAt": "2026-02-01T10:00:00.000Z",
        "createdAt": "2026-01-15T09:00:00.000Z",
        "updatedAt": "2026-03-28T13:00:00.000Z"
      }
    ]
  }
}
```

> `bankDetails`, `commissionRate`, `rejectionReason` are excluded from this listing.

---

### GET `/api/vendors/store/:slug` 🌐 Public

**Response `200`**

```json
{
  "success": true,
  "message": "Store details retrieved successfully",
  "data": {
    "vendor": { "...full public vendor object..." },
    "products": [
      {
        "_id": "68d4e5f6a7b8c9d0e1f2a3b4",
        "vendorId": "69e5f6a7b8c9d0e1f2a3b4c5",
        "name": "Bouquet of Roses",
        "description": "12 premium red roses wrapped in kraft paper.",
        "price": 8000,
        "images": [{ "url": "https://res.cloudinary.com/.../roses.jpg", "publicId": "products/roses" }],
        "category": "Flowers",
        "occasionTags": ["Birthday", "Anniversary"],
        "deliveryZones": ["Lagos"],
        "stock": 20,
        "isAvailable": true,
        "isFeatured": true,
        "createdAt": "2026-02-10T10:00:00.000Z",
        "updatedAt": "2026-03-28T13:00:00.000Z"
      }
    ]
  }
}
```

---

### PUT `/api/vendors/:id/approve` 🔒 Admin

**Response `200`**

```json
{
  "success": true,
  "message": "Vendor approved successfully",
  "data": {
    "vendor": {
      "_id": "69e5f6a7b8c9d0e1f2a3b4c5",
      "status": "approved",
      "isActive": true,
      "approvedAt": "2026-03-28T14:00:00.000Z",
      "...all other vendor fields..."
    }
  }
}
```

---

### PUT `/api/vendors/:id/reject` 🔒 Admin

**Payload**
| Field | Type | Required |
|-------|------|----------|
| `reason` | string | ✅ |

**Response `200`**

```json
{
  "success": true,
  "message": "Vendor rejected successfully",
  "data": {
    "vendor": {
      "_id": "69e5f6a7b8c9d0e1f2a3b4c5",
      "status": "rejected",
      "isActive": false,
      "rejectionReason": "Incomplete store information and no product images provided.",
      "...all other vendor fields..."
    }
  }
}
```

---

## 6. PRODUCTS `/api/products`

**Full Product Object**

```json
{
  "_id": "68d4e5f6a7b8c9d0e1f2a3b4",
  "vendorId": "69e5f6a7b8c9d0e1f2a3b4c5",
  "name": "Bouquet of Roses",
  "description": "12 premium red roses wrapped in kraft paper.",
  "price": 8000,
  "images": [
    {
      "url": "https://res.cloudinary.com/.../roses.jpg",
      "publicId": "products/roses"
    }
  ],
  "category": "Flowers",
  "occasionTags": ["Birthday", "Anniversary"],
  "deliveryZones": ["Lagos", "Abuja"],
  "stock": 20,
  "isAvailable": true,
  "isFeatured": true,
  "createdAt": "2026-02-10T10:00:00.000Z",
  "updatedAt": "2026-03-28T13:00:00.000Z"
}
```

---

### GET `/api/products` 🌐 Public

**Query Params:** `?category=Flowers&occasion=Birthday&state=Lagos&search=rose&minPrice=1000&maxPrice=10000&featured=true`

**Response `200`**

```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "total": 1,
    "products": [
      {
        "_id": "68d4e5f6a7b8c9d0e1f2a3b4",
        "name": "Bouquet of Roses",
        "description": "12 premium red roses wrapped in kraft paper.",
        "price": 8000,
        "images": [
          {
            "url": "https://res.cloudinary.com/.../roses.jpg",
            "publicId": "products/roses"
          }
        ],
        "category": "Flowers",
        "occasionTags": ["Birthday", "Anniversary"],
        "deliveryZones": ["Lagos"],
        "stock": 20,
        "isAvailable": true,
        "isFeatured": true,
        "vendorId": {
          "_id": "69e5f6a7b8c9d0e1f2a3b4c5",
          "storeName": "Bloom & Co.",
          "slug": "bloom-and-co",
          "logo": "https://res.cloudinary.com/.../logo.png",
          "rating": 4.8,
          "deliveryZones": ["Lagos", "Abuja"]
        },
        "createdAt": "2026-02-10T10:00:00.000Z",
        "updatedAt": "2026-03-28T13:00:00.000Z"
      }
    ]
  }
}
```

---

### GET `/api/products/digital-gifts` 🌐 Public

**Response `200`**

```json
{
  "success": true,
  "message": "Digital gifts retrieved successfully",
  "data": {
    "total": 2,
    "products": [
      {
        "_id": "71a7b8c9d0e1f2a3b4c5d6e7",
        "vendorId": null,
        "name": "₦5,000 WishCube Gift Voucher",
        "description": "Send the gift of choice. Redeemable for any item on WishCube.",
        "price": 5000,
        "images": [
          {
            "url": "https://res.cloudinary.com/.../voucher.jpg",
            "publicId": "products/voucher5k"
          }
        ],
        "category": "Vouchers",
        "occasionTags": [],
        "deliveryZones": [],
        "stock": null,
        "isAvailable": true,
        "isFeatured": false,
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### GET `/api/products/:id` 🌐 Public

**Response `200`**

```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "product": {
      "...full product object...",
      "vendorId": {
        "_id": "69e5f6a7b8c9d0e1f2a3b4c5",
        "storeName": "Bloom & Co.",
        "slug": "bloom-and-co",
        "logo": "https://res.cloudinary.com/.../logo.png",
        "rating": 4.8,
        "category": "Flowers",
        "deliveryZones": ["Lagos", "Abuja"]
      }
    }
  }
}
```

---

### POST `/api/products` 🔒 Private/Vendor

**Payload**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | |
| `price` | number | ✅ | In NGN |
| `category` | string | ✅ | `Cakes` `Flowers` `Fashion` `Electronics` `Experiences` `Vouchers` `Food` `Jewelry` `Other` |
| `description` | string | ❌ | |
| `images` | array | ❌ | `[{ url, publicId }]` — upload first via `/upload` |
| `occasionTags` | string[] | ❌ | e.g. `["Birthday","Wedding"]` |
| `deliveryZones` | string[] | ❌ | e.g. `["Lagos","Abuja"]` |
| `stock` | number | ❌ | Default: 0 |
| `isAvailable` | boolean | ❌ | Default: true |
| `isFeatured` | boolean | ❌ | Default: false |

**Response `201`**

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product": { "...full product object..." }
  }
}
```

---

### PUT `/api/products/:id` 🔒 Private/Vendor

Same fields as POST.

**Response `200`**

```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "product": { "...full product object..." }
  }
}
```

---

### DELETE `/api/products/:id` 🔒 Private/Vendor

**Response `200`**

```json
{
  "success": true,
  "message": "Product deleted successfully",
  "data": null
}
```

---

### POST `/api/products/upload` 🔒 Private — `multipart/form-data`

Up to 5 files. Required for getting URLs before creating/updating a product.

| Form Field | Type           |
| ---------- | -------------- |
| `images`   | file[] (max 5) |

**Response `200`**

```json
{
  "success": true,
  "message": "Images uploaded successfully",
  "data": {
    "images": [
      {
        "url": "https://res.cloudinary.com/wishcube/image/upload/products/img1.jpg",
        "publicId": "products/img1"
      },
      {
        "url": "https://res.cloudinary.com/wishcube/image/upload/products/img2.jpg",
        "publicId": "products/img2"
      }
    ]
  }
}
```

---

### POST `/api/products/media-upload` 🔒 Private — `multipart/form-data`

General upload for any authenticated user (e.g. website images).

| Form Field | Type           |
| ---------- | -------------- |
| `images`   | file[] (max 5) |

**Response `200`**

```json
{
  "success": true,
  "message": "Images uploaded successfully",
  "data": {
    "images": [
      {
        "url": "https://res.cloudinary.com/wishcube/image/upload/general/photo1.jpg",
        "publicId": "general/photo1"
      }
    ]
  }
}
```

---

## 7. WALLET `/api/wallet`

---

### GET `/api/wallet/balance` 🔒 Private

**Response `200`**

```json
{
  "success": true,
  "message": "Wallet balance retrieved successfully",
  "data": {
    "walletBalance": 12500
  }
}
```

---

### POST `/api/wallet/fund` 🔒 Private

**Payload**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `amount` | number | ✅ | Min ₦100, in NGN |

**Response `200`**

```json
{
  "success": true,
  "message": "Funding initialized",
  "data": {
    "paymentUrl": "https://checkout.paystack.com/xyz789",
    "reference": "PSK_xyz789abc"
  }
}
```

---

### POST `/api/wallet/verify` 🔒 Private

**Payload**
| Field | Type | Required |
|-------|------|----------|
| `reference` | string | ✅ |

**Response `200`**

```json
{
  "success": true,
  "message": "Wallet funded successfully",
  "data": {
    "newBalance": 15000
  }
}
```

---

## 8. SUBSCRIPTIONS `/api/subscriptions`

| Plan      | Price      | Tier      |
| --------- | ---------- | --------- |
| `pro`     | ₦10,000/mo | `pro`     |
| `premium` | ₦50,000/mo | `premium` |

---

### POST `/api/subscriptions/initialize` 🔒 Private

**Payload**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `planType` | string | ✅ | `pro` or `premium` |
| `callbackUrl` | string | ❌ | Redirect after payment |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "authorization_url": "https://checkout.paystack.com/sub_abc123",
    "access_code": "acc_xxx",
    "reference": "PSK_sub_abc123"
  }
}
```

---

### GET `/api/subscriptions/verify/:reference` 🔒 Private

**URL Param:** `:reference` — Paystack payment reference

**Response `200`**

```json
{
  "success": true,
  "message": "Successfully upgraded to pro plan",
  "data": {
    "tier": "pro",
    "status": "active",
    "expiry": "2026-04-28T14:00:00.000Z"
  }
}
```

---

### GET `/api/subscriptions/status` 🔒 Private

**Response `200`**

```json
{
  "success": true,
  "data": {
    "tier": "free",
    "status": "active",
    "expiry": null
  }
}
```

---

## 9. ADMIN `/api/admin`

---

### POST `/api/admin/digital-gifts` 🔒 Admin

**Payload**
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `price` | number | ✅ |
| `description` | string | ❌ |
| `images` | array | ❌ | `[{ url, publicId }]` |

**Response `201`**

```json
{
  "success": true,
  "message": "Digital gift created successfully",
  "data": {
    "digitalGift": {
      "_id": "71a7b8c9d0e1f2a3b4c5d6e7",
      "vendorId": null,
      "name": "₦5,000 WishCube Gift Voucher",
      "description": "Send the gift of choice.",
      "price": 5000,
      "images": [
        {
          "url": "https://res.cloudinary.com/.../voucher.jpg",
          "publicId": "products/voucher5k"
        }
      ],
      "category": "Vouchers",
      "occasionTags": [],
      "deliveryZones": [],
      "stock": null,
      "isAvailable": true,
      "isFeatured": false,
      "createdAt": "2026-03-28T14:00:00.000Z",
      "updatedAt": "2026-03-28T14:00:00.000Z"
    }
  }
}
```

---

### GET `/api/admin/digital-gifts` 🔒 Admin

**Response `200`**

```json
{
  "success": true,
  "message": "Digital gifts retrieved successfully",
  "data": {
    "total": 3,
    "digitalGifts": [
      {
        "_id": "71a7b8c9d0e1f2a3b4c5d6e7",
        "name": "₦5,000 WishCube Gift Voucher",
        "price": 5000,
        "description": "Send the gift of choice.",
        "images": [
          {
            "url": "https://res.cloudinary.com/.../voucher5k.jpg",
            "publicId": "products/voucher5k"
          }
        ],
        "category": "Vouchers",
        "occasionTags": [],
        "deliveryZones": [],
        "stock": null,
        "isAvailable": true,
        "isFeatured": false,
        "createdAt": "2026-03-28T14:00:00.000Z",
        "updatedAt": "2026-03-28T14:00:00.000Z"
      }
    ]
  }
}
```

---

### DELETE `/api/admin/digital-gifts/:id` 🔒 Admin

**Response `200`**

```json
{
  "success": true,
  "message": "Digital gift deleted successfully",
  "data": null
}
```

---

## 10. WAITLIST `/api/waitlist`

---

### POST `/api/waitlist` 🌐 Public

**Payload**
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `email` | string | ✅ |

**Response `201`**

```json
{
  "success": true,
  "message": "Successfully signed up to the waitlist",
  "data": {
    "waitlist": {
      "_id": "72b8c9d0e1f2a3b4c5d6e7f8",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "createdAt": "2026-03-28T14:00:00.000Z"
    }
  }
}
```

---

### GET `/api/waitlist` 🔒 Admin

**Response `200`**

```json
{
  "success": true,
  "message": "Waitlist retrieved successfully",
  "data": {
    "total": 120,
    "waitlist": [
      {
        "_id": "72b8c9d0e1f2a3b4c5d6e7f8",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "createdAt": "2026-03-28T14:00:00.000Z"
      }
    ]
  }
}
```

---

### GET `/api/waitlist/count` 🔒 Admin

**Response `200`**

```json
{
  "success": true,
  "message": "Waitlist count retrieved successfully",
  "data": {
    "count": 120
  }
}
```

---

## Error Format (All Endpoints)

```json
{
  "success": false,
  "message": "Human-readable error description",
  "statusCode": 400
}
```

| Code  | Meaning                                           |
| ----- | ------------------------------------------------- |
| `400` | Bad Request — missing/invalid fields              |
| `401` | Unauthorized — bad/missing token or credentials   |
| `403` | Forbidden — role or subscription tier restriction |
| `404` | Not Found                                         |
| `410` | Gone — website expired                            |
| `500` | Server Error                                      |

---

_← See **Part 1** for: Auth · Cards · Websites_
