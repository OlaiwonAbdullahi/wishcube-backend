# WishCube API Reference — Part 1: Auth · Cards · Websites

> **Base URL:** `https://api.usewishcube.com`  
> **Auth:** `Authorization: Bearer <accessToken>` on all 🔒 routes  
> **Content-Type:** `application/json` unless noted `multipart/form-data`
>
> → See **Part 2** for: Gifts · Vendors · Products · Wallet · Subscriptions · Admin · Waitlist

---

## 1. AUTH `/api/auth`

---

### POST `/api/auth/register` 🌐 Public

**Payload**
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `email` | string | ✅ |
| `password` | string | ✅ min 6 chars |

**Response `201`**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "avatar": "https://api.dicebear.com/9.x/glass/svg?seed=Jane Doe",
      "role": "user",
      "isActive": true,
      "authProvider": "local",
      "googleId": null,
      "walletBalance": 0,
      "subscriptionTier": "free",
      "subscriptionStatus": "active",
      "subscriptionExpiry": null,
      "paystackCustomerCode": null,
      "lastLogin": "2026-03-28T13:00:00.000Z",
      "createdAt": "2026-03-28T13:00:00.000Z",
      "updatedAt": "2026-03-28T13:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
> `password` and `resetPasswordToken` are never returned.

---

### POST `/api/auth/login` 🌐 Public

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
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "avatar": "https://api.dicebear.com/9.x/glass/svg?seed=Jane Doe",
      "role": "user",
      "isActive": true,
      "authProvider": "local",
      "googleId": null,
      "walletBalance": 2500,
      "subscriptionTier": "pro",
      "subscriptionStatus": "active",
      "subscriptionExpiry": "2026-04-28T13:00:00.000Z",
      "paystackCustomerCode": "CUS_xxxx",
      "lastLogin": "2026-03-28T13:00:00.000Z",
      "createdAt": "2026-01-10T08:00:00.000Z",
      "updatedAt": "2026-03-28T13:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### POST `/api/auth/google` 🌐 Public

**Payload**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `token` | string | ✅ | Google ID token from client SDK |

**Response `200`** *(same shape as login)*
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Jane Doe",
      "email": "jane@gmail.com",
      "avatar": "https://lh3.googleusercontent.com/a/photo",
      "role": "user",
      "isActive": true,
      "authProvider": "google",
      "googleId": "109876543210987654321",
      "walletBalance": 0,
      "subscriptionTier": "free",
      "subscriptionStatus": "active",
      "subscriptionExpiry": null,
      "paystackCustomerCode": null,
      "lastLogin": "2026-03-28T13:00:00.000Z",
      "createdAt": "2026-03-28T13:00:00.000Z",
      "updatedAt": "2026-03-28T13:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### GET `/api/auth/me` 🔒 Private

**Response `200`**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "avatar": "https://api.dicebear.com/9.x/glass/svg?seed=Jane Doe",
      "role": "user",
      "isActive": true,
      "authProvider": "local",
      "googleId": null,
      "walletBalance": 2500,
      "subscriptionTier": "pro",
      "subscriptionStatus": "active",
      "subscriptionExpiry": "2026-04-28T13:00:00.000Z",
      "paystackCustomerCode": "CUS_xxxx",
      "lastLogin": "2026-03-28T13:00:00.000Z",
      "createdAt": "2026-01-10T08:00:00.000Z",
      "updatedAt": "2026-03-28T13:00:00.000Z"
    }
  }
}
```

---

### PUT `/api/auth/update-profile` 🔒 Private

**Payload**
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ❌ |
| `avatar` | string (URL) | ❌ |

**Response `200`**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Jane Updated",
      "email": "jane@example.com",
      "avatar": "https://example.com/my-photo.jpg",
      "role": "user",
      "isActive": true,
      "authProvider": "local",
      "googleId": null,
      "walletBalance": 2500,
      "subscriptionTier": "pro",
      "subscriptionStatus": "active",
      "subscriptionExpiry": "2026-04-28T13:00:00.000Z",
      "paystackCustomerCode": "CUS_xxxx",
      "lastLogin": "2026-03-28T13:00:00.000Z",
      "createdAt": "2026-01-10T08:00:00.000Z",
      "updatedAt": "2026-03-28T14:00:00.000Z"
    }
  }
}
```

---

### POST `/api/auth/refresh` 🌐 Public

**Payload**
| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | ✅ |

**Response `200`**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### POST `/api/auth/forgot-password` 🌐 Public

**Payload**
| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✅ |

**Response `200`** *(same whether user exists or not)*
```json
{
  "success": true,
  "message": "If an account exists with that email, a reset link has been sent"
}
```

---

### POST `/api/auth/reset-password/:token` 🌐 Public

**URL Param:** `:token` — raw token from the reset email link

**Payload**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `password` | string | ✅ | Min 6 chars |

**Response `200`**
```json
{
  "success": true,
  "message": "Password updated successfully. You can now log in."
}
```

---

### GET `/api/auth` 🔒 Admin Only

**Response `200`**
```json
{
  "success": true,
  "message": "All users retrieved successfully",
  "data": {
    "total": 2,
    "users": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "avatar": "https://api.dicebear.com/9.x/glass/svg?seed=Jane Doe",
        "role": "user",
        "isActive": true,
        "authProvider": "local",
        "googleId": null,
        "walletBalance": 2500,
        "subscriptionTier": "pro",
        "subscriptionStatus": "active",
        "subscriptionExpiry": "2026-04-28T13:00:00.000Z",
        "paystackCustomerCode": "CUS_xxxx",
        "lastLogin": "2026-03-28T13:00:00.000Z",
        "createdAt": "2026-01-10T08:00:00.000Z",
        "updatedAt": "2026-03-28T13:00:00.000Z"
      }
    ]
  }
}
```

---

## 2. CARDS `/api/cards`

> All card endpoints require 🔒 authentication.

**Full Card Object** *(returned by all card endpoints)*
```json
{
  "_id": "65a1b2c3d4e5f6a7b8c9d0e1",
  "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "senderName": "Jane",
  "recipientName": "John",
  "recipientPhotoUrl": "https://res.cloudinary.com/.../photo.jpg",
  "recipientPhotoPublicId": "recipient-photos/abc123",
  "relationship": "Friend",
  "occasion": "Birthday",
  "language": "English",
  "volumeNumber": 1,
  "cardYear": "MMXXVI",
  "cardSubtitle": "A special message for",
  "message": "Wishing you all the joy in the world...",
  "closingLine": "With love",
  "brandingText": "Designed with Wishcube",
  "isAiGenerated": true,
  "aiTone": "Heartfelt",
  "theme": "classic",
  "orientation": "portrait",
  "backgroundImageUrl": "https://res.cloudinary.com/.../bg.jpg",
  "backgroundImagePublicId": "cards/bg123",
  "backgroundColor": "#1c1c1c",
  "font": "Georgia",
  "accentColor": "#C9A84C",
  "textColor": "#FFFFFF",
  "textSize": "medium",
  "textBold": false,
  "textItalic": false,
  "textAlign": "left",
  "headlineColor": "#FFFFFF",
  "headlineSizeOverride": null,
  "headlineBold": false,
  "recipientNameColor": "#C9A84C",
  "recipientNameItalic": true,
  "status": "draft",
  "downloadCount": 0,
  "createdAt": "2026-03-28T13:00:00.000Z",
  "updatedAt": "2026-03-28T13:00:00.000Z"
}
```

---

### GET `/api/cards`

**Query Params:** `?status=draft|completed`

**Response `200`**
```json
{
  "success": true,
  "message": "Cards retrieved successfully",
  "data": {
    "total": 1,
    "cards": [ { "...full card object above..." } ]
  }
}
```

---

### POST `/api/cards`

**Payload** *(Required fields only — all others use defaults shown in the Full Card Object)*
| Field | Type | Required | Enum |
|-------|------|----------|------|
| `senderName` | string | ✅ | |
| `recipientName` | string | ✅ | |
| `occasion` | string | ✅ | `Birthday` `Anniversary` `Wedding` `Graduation` `Thank You` `Congratulations` `Holiday` `Just Because` |
| `relationship` | string | ❌ | `Friend` `Partner` `Parent` `Sibling` `Child` `Colleague` `Mentor` `Other` |
| `language` | string | ❌ | `English` `Yoruba` `Igbo` `Hausa` `Pidgin` `French` |
| `message` | string | ❌ | |
| `cardSubtitle` | string | ❌ | |
| `closingLine` | string | ❌ | |
| `brandingText` | string | ❌ | |
| `volumeNumber` | number | ❌ | |
| `cardYear` | string | ❌ | Roman numeral string e.g. `MMXXVI` |
| `isAiGenerated` | boolean | ❌ | |
| `aiTone` | string | ❌ | `Heartfelt` `Funny` `Poetic` `Professional` `Playful` |
| `theme` | string | ❌ | |
| `orientation` | string | ❌ | `portrait` `landscape` `square` |
| `backgroundColor` | string | ❌ | Hex |
| `font` | string | ❌ | |
| `accentColor` | string | ❌ | Hex |
| `textColor` | string | ❌ | Hex |
| `textSize` | string | ❌ | `small` `medium` `large` |
| `textBold` | boolean | ❌ | |
| `textItalic` | boolean | ❌ | |
| `textAlign` | string | ❌ | `left` `center` `right` |
| `headlineColor` | string | ❌ | Hex |
| `headlineSizeOverride` | string\|null | ❌ | `small` `medium` `large` `null` |
| `headlineBold` | boolean | ❌ | |
| `recipientNameColor` | string | ❌ | Hex — falls back to `accentColor` |
| `recipientNameItalic` | boolean | ❌ | |

**Response `201`**
```json
{
  "success": true,
  "message": "Card created successfully",
  "data": {
    "card": { "...full card object..." }
  }
}
```

---

### GET `/api/cards/:id`

**Response `200`**
```json
{
  "success": true,
  "message": "Card retrieved successfully",
  "data": {
    "card": { "...full card object..." }
  }
}
```

---

### PUT `/api/cards/:id`

Accepts any subset of the POST payload fields.

**Response `200`**
```json
{
  "success": true,
  "message": "Card updated successfully",
  "data": {
    "card": { "...full card object..." }
  }
}
```

---

### DELETE `/api/cards/:id`

**Response `200`**
```json
{
  "success": true,
  "message": "Card deleted successfully",
  "data": null
}
```

---

### POST `/api/cards/:id/background` — `multipart/form-data`

| Form Field | Type | Required |
|------------|------|----------|
| `image` | file | ✅ |

**Response `200`**
```json
{
  "success": true,
  "message": "Background image uploaded successfully",
  "data": {
    "backgroundImageUrl": "https://res.cloudinary.com/wishcube/image/upload/cards/bg123.jpg",
    "card": { "...full card object with updated backgroundImageUrl and backgroundImagePublicId..." }
  }
}
```

---

### DELETE `/api/cards/:id/background`

**Response `200`**
```json
{
  "success": true,
  "message": "Background image removed successfully",
  "data": {
    "card": { "...full card object with backgroundImageUrl: null, backgroundImagePublicId: null..." }
  }
}
```

---

### POST `/api/cards/:id/recipient-photo` — `multipart/form-data`

| Form Field | Type | Required |
|------------|------|----------|
| `image` | file | ✅ |

**Response `200`**
```json
{
  "success": true,
  "message": "Recipient photo uploaded successfully",
  "data": {
    "recipientPhotoUrl": "https://res.cloudinary.com/wishcube/image/upload/recipient-photos/ph456.jpg",
    "card": { "...full card object with updated recipientPhotoUrl and recipientPhotoPublicId..." }
  }
}
```

---

### DELETE `/api/cards/:id/recipient-photo`

**Response `200`**
```json
{
  "success": true,
  "message": "Recipient photo removed successfully",
  "data": {
    "card": { "...full card object with recipientPhotoUrl: null, recipientPhotoPublicId: null..." }
  }
}
```

---

### POST `/api/cards/ai/generate`

> [!IMPORTANT]
> Call this **before** creating the card. Use returned suggestions as the `message` field.

**Payload**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `recipientName` | string | ✅ | |
| `occasion` | string | ✅ | |
| `senderName` | string | ❌ | |
| `relationship` | string | ❌ | |
| `language` | string | ❌ | |
| `tone` | string | ❌ | `Heartfelt` `Funny` `Poetic` `Professional` `Playful` |

**Response `200`**
```json
{
  "success": true,
  "message": "AI suggestions generated successfully",
  "data": {
    "suggestions": [
      "Happy Birthday, John! May this year bring you laughter, love, and every dream you've been chasing...",
      "John, another year older and even more wonderful! Wishing you a birthday as bright as your smile...",
      "To my dearest friend John — here's to celebrating YOU today and every day. Happy Birthday! 🎂"
    ]
  }
}
```

---

### POST `/api/cards/:id/complete`

**Response `200`**
```json
{
  "success": true,
  "message": "Card marked as completed",
  "data": {
    "card": {
      "_id": "65a1b2c3d4e5f6a7b8c9d0e1",
      "status": "completed",
      "downloadCount": 1,
      "...all other card fields..."
    }
  }
}
```

---

### POST `/api/cards/:id/track-download`

**Response `200`**
```json
{
  "success": true,
  "message": "Download tracked successfully",
  "data": {
    "downloadCount": 3
  }
}
```

---

## 3. WEBSITES `/api/websites`

**Full Website Object** *(returned by all website endpoints)*
```json
{
  "_id": "66b2c3d4e5f6a7b8c9d0e1f2",
  "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "recipientName": "John",
  "occasion": "Birthday",
  "relationship": "Friend",
  "language": "English",
  "message": "Happy birthday, John! This page is made just for you.",
  "isAiGenerated": false,
  "aiTone": "Heartfelt",
  "images": [
    { "url": "https://res.cloudinary.com/.../img1.jpg", "publicId": "general/img1", "order": 0 },
    { "url": "https://res.cloudinary.com/.../img2.jpg", "publicId": "general/img2", "order": 1 }
  ],
  "videoUrl": null,
  "videoPublicId": null,
  "voiceMessageUrl": null,
  "voiceMessagePublicId": null,
  "musicTrack": "Happy Birthday",
  "musicUrl": "https://example.com/happy-birthday.mp3",
  "theme": "classic",
  "font": "Inter",
  "primaryColor": "#6C63FF",
  "countdownDate": null,
  "isPasswordProtected": false,
  "password": null,
  "customSlug": null,
  "expiresAt": "2026-04-27T13:00:00.000Z",
  "giftId": null,
  "status": "draft",
  "slug": null,
  "publicUrl": null,
  "views": 0,
  "viewedAt": null,
  "reaction": {
    "emoji": null,
    "reactedAt": null
  },
  "recipientReply": {
    "message": null,
    "repliedAt": null
  },
  "createdAt": "2026-03-28T13:00:00.000Z",
  "updatedAt": "2026-03-28T13:00:00.000Z"
}
```

---

### GET `/api/websites` 🔒 Private

**Query Params:** `?status=draft|live|archived|expired`

**Response `200`**
```json
{
  "success": true,
  "message": "Websites retrieved successfully",
  "data": {
    "total": 2,
    "websites": [ { "...full website object..." } ]
  }
}
```

---

### POST `/api/websites` 🔒 Private

> Free tier: max 1 live website. `isPasswordProtected` & `customSlug` require Pro.

**Payload**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `recipientName` | string | ✅ | |
| `occasion` | string | ✅ | `Birthday` `Anniversary` `Congratulations` `Appreciation` `Wedding` `Get Well` `Professional Greeting` `Holiday` `Other` |
| `relationship` | string | ❌ | `Friend` `Partner` `Parent` `Sibling` `Child` `Colleague` `Mentor` `Other` |
| `language` | string | ❌ | `English` `Yoruba` `Igbo` `Hausa` `Pidgin` `French` |
| `message` | string | ❌ | |
| `isAiGenerated` | boolean | ❌ | |
| `aiTone` | string | ❌ | `Heartfelt` `Funny` `Poetic` `Professional` `Playful` |
| `images` | array | ❌ | `[{ url, publicId, order }]` — upload first via `/api/products/media-upload` |
| `videoUrl` | string | ❌ | |
| `voiceMessageUrl` | string | ❌ | |
| `musicTrack` | string | ❌ | |
| `musicUrl` | string | ❌ | |
| `theme` | string | ❌ | Default: `classic` |
| `font` | string | ❌ | Default: `Inter` |
| `primaryColor` | string | ❌ | Hex, default `#6C63FF` |
| `countdownDate` | ISO date | ❌ | |
| `isPasswordProtected` | boolean | ❌ | **Pro only** |
| `password` | string | ❌ | Required if above is true |
| `customSlug` | string | ❌ | **Pro only** |

**Response `201`**
```json
{
  "success": true,
  "message": "Website created successfully",
  "data": {
    "website": { "...full website object..." }
  }
}
```

---

### GET `/api/websites/:id` 🔒 Private

**Response `200`**
```json
{
  "success": true,
  "message": "Website retrieved successfully",
  "data": {
    "website": {
      "...full website object...",
      "giftId": {
        "_id": "67c3d4e5f6a7b8c9d0e1f2a3",
        "type": "digital",
        "status": "pending",
        "amountPaid": 5000,
        "currency": "NGN"
      }
    }
  }
}
```

---

### PUT `/api/websites/:id` 🔒 Private

Accepts any subset of POST payload fields.

**Response `200`**
```json
{
  "success": true,
  "message": "Website updated successfully",
  "data": {
    "website": { "...full website object..." }
  }
}
```

---

### DELETE `/api/websites/:id` 🔒 Private

**Response `200`**
```json
{
  "success": true,
  "message": "Website deleted successfully",
  "data": null
}
```

---

### POST `/api/websites/:id/publish` 🔒 Private

**Payload**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `customSlug` | string | ❌ | Pro only |
| `expiresAt` | ISO date | ❌ | Defaults to 30 days from now |

**Response `200`**
```json
{
  "success": true,
  "message": "Website published successfully",
  "data": {
    "website": {
      "_id": "66b2c3d4e5f6a7b8c9d0e1f2",
      "status": "live",
      "slug": "john-birthday-a3f2b1",
      "publicUrl": "https://usewishcube.com/w/john-birthday-a3f2b1",
      "expiresAt": "2026-04-27T13:00:00.000Z",
      "...all other website fields..."
    },
    "shareUrl": "https://usewishcube.com/w/john-birthday-a3f2b1"
  }
}
```

---

### GET `/api/websites/live/:slug` 🌐 Public

**Response `200`**
```json
{
  "success": true,
  "message": "Live website retrieved successfully",
  "data": {
    "website": {
      "_id": "66b2c3d4e5f6a7b8c9d0e1f2",
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "recipientName": "John",
      "occasion": "Birthday",
      "relationship": "Friend",
      "language": "English",
      "message": "Happy birthday, John!",
      "isAiGenerated": false,
      "aiTone": "Heartfelt",
      "images": [
        { "url": "https://res.cloudinary.com/.../img1.jpg", "publicId": "general/img1", "order": 0 }
      ],
      "videoUrl": null,
      "videoPublicId": null,
      "voiceMessageUrl": null,
      "voiceMessagePublicId": null,
      "musicTrack": "Happy Birthday",
      "musicUrl": "https://example.com/happy-birthday.mp3",
      "theme": "classic",
      "font": "Inter",
      "primaryColor": "#6C63FF",
      "countdownDate": null,
      "isPasswordProtected": false,
      "customSlug": null,
      "expiresAt": "2026-04-27T13:00:00.000Z",
      "giftId": {
        "_id": "67c3d4e5f6a7b8c9d0e1f2a3",
        "type": "digital",
        "amountPaid": 5000,
        "currency": "NGN",
        "giftMessage": "Enjoy your day!",
        "status": "pending",
        "escrowStatus": "holding",
        "redeemToken": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "expiresAt": "2026-04-27T13:00:00.000Z"
      },
      "status": "live",
      "slug": "john-birthday-a3f2b1",
      "publicUrl": "https://usewishcube.com/w/john-birthday-a3f2b1",
      "views": 5,
      "viewedAt": "2026-03-28T12:00:00.000Z",
      "reaction": { "emoji": "🎉", "reactedAt": "2026-03-28T12:30:00.000Z" },
      "recipientReply": { "message": "Thank you so much!", "repliedAt": "2026-03-28T13:00:00.000Z" },
      "createdAt": "2026-03-28T10:00:00.000Z",
      "updatedAt": "2026-03-28T13:00:00.000Z"
    }
  }
}
```
> `recipientBankDetails`, `payoutReference`, `redeemToken` are stripped from the populated `giftId`.

> Returns `410 Gone` if the site has expired.

---

### POST `/api/websites/live/:slug/reply` 🌐 Public

**Payload**
| Field | Type | Required |
|-------|------|----------|
| `message` | string | ✅ |

**Response `200`**
```json
{
  "success": true,
  "message": "Reply submitted successfully",
  "data": {
    "recipientReply": {
      "message": "Thank you so much! This made my day! 🥹",
      "repliedAt": "2026-03-28T14:00:00.000Z"
    }
  }
}
```

---

### POST `/api/websites/live/:slug/react` 🌐 Public

**Payload**
| Field | Type | Required |
|-------|------|----------|
| `emoji` | string | ✅ |

**Response `200`**
```json
{
  "success": true,
  "message": "Reaction submitted successfully",
  "data": {
    "reaction": {
      "emoji": "🎉",
      "reactedAt": "2026-03-28T14:05:00.000Z"
    }
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

| Code | Meaning |
|------|---------|
| `400` | Bad Request — missing/invalid fields |
| `401` | Unauthorized — bad/missing token |
| `403` | Forbidden — role or tier restriction |
| `404` | Not Found |
| `410` | Gone — website expired |
| `500` | Server Error |

---
*→ Continue to **Part 2** for: Gifts · Vendors · Products · Wallet · Subscriptions · Admin · Waitlist*
