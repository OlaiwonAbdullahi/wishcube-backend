# WishCube Cards & AI API Documentation

This document provides detailed information about the digital greeting card management and AI message generation endpoints.

## **Base URL**

`{{API_URL}}/api/cards`

---

## **Endpoints Overview**

| Method   | Endpoint              | Description                                   | Access  |
| :------- | :-------------------- | :-------------------------------------------- | :------ |
| `GET`    | `/`                   | Get all cards for the authenticated user      | Private |
| `POST`   | `/`                   | Create a new card draft                       | Private |
| `GET`    | `/:id`                | Get details of a specific card                | Private |
| `PUT`    | `/:id`                | Update card details (text, font, theme, etc.) | Private |
| `DELETE` | `/:id`                | Delete a card and its background image        | Private |
| `POST`   | `/:id/background`     | Upload a background image to Cloudinary       | Private |
| `DELETE` | `/:id/background`     | Remove background image                       | Private |
| `POST`   | `/ai/generate`        | Generate 3 AI message suggestions             | Private |
| `POST`   | `/:id/complete`       | Mark card as completed and increment download | Private |
| `POST`   | `/:id/track-download` | Increment download count                      | Private |

---

## **Card Object Schema**

This is the structure of the `card` object returned in API responses:

```json
{
  "_id": "65f8a1b2c3d4e5f6g7h8i9j0",
  "userId": "65f8a0a1b2c3d4e5f6g7h8i9",
  "senderName": "Alex",
  "recipientName": "Sarah",
  "relationship": "Sibling",
  "occasion": "Birthday",
  "language": "English",
  "message": "Happy Birthday Sarah!",
  "isAiGenerated": false,
  "aiTone": "Heartfelt",
  "theme": "modern",
  "orientation": "portrait",
  "backgroundImageUrl": "https://res.cloudinary.com/...",
  "backgroundImagePublicId": "cards/abc123xyz",
  "font": "Dancing Script",
  "textColor": "#000000",
  "textSize": "medium",
  "status": "draft",
  "downloadCount": 0,
  "createdAt": "2024-03-17T10:00:00.000Z",
  "updatedAt": "2024-03-17T10:00:00.000Z"
}
```

---

## **Detailed POST Endpoints**

### **1. Generate AI Messages**

Generates three unique message suggestions based on the context provided.

- **URL**: `/ai/generate`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "recipientName": "Sarah", // Required
    "senderName": "Alex", // Optional
    "occasion": "Birthday", // Required
    "relationship": "Sister", // Optional (See Enum Values)
    "language": "English", // Optional (See Enum Values)
    "tone": "Funny" // Optional (See Enum Values)
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "AI suggestions generated successfully",
    "data": {
      "suggestions": [
        "Happy Birthday Sarah! Hope your day is as amazing as you are...",
        "To the best sister ever, have a fantastic birthday!",
        "Sarah, another year older but still as awesome as ever..."
      ]
    }
  }
  ```

### **2. Create Card**

Initialize a new greeting card draft. You can pass any fields from the **Card Object Schema** in the body.

- **URL**: `/`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "senderName": "Alex",
    "recipientName": "Sarah",
    "occasion": "Birthday",
    "relationship": "Sibling",
    "theme": "modern",
    "font": "Dancing Script",
    "message": "Happy Birthday Sarah!",
    "orientation": "portrait",
    "textSize": "medium"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Card created successfully",
    "data": {
      "card": { ... } // Full Card Object
    }
  }
  ```

### **3. Upload Background Image**

Uploads an image file to Cloudinary and links it to the card.

- **URL**: `/:id/background`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `image`: (File) The image to upload.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Background image uploaded successfully",
    "data": {
      "backgroundImageUrl": "https://res.cloudinary.com/...",
      "card": { ... } // Updated Card Object
    }
  }
  ```

### **4. Mark Card as Completed**

Marks the card status as `completed` and increments the download count by 1.

- **URL**: `/:id/complete`
- **Method**: `POST`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Card marked as completed",
    "data": {
      "card": { ... } // Updated Card Object with status 'completed'
    }
  }
  ```

### **5. Track Card Download**

Increments the `downloadCount` field for a card.

- **URL**: `/:id/track-download`
- **Method**: `POST`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Download tracked successfully",
    "data": {
      "downloadCount": 1
    }
  }
  ```

---

## **Enum Values**

Use these exact strings for request bodies:

- **Occasions**: `Birthday`, `Anniversary`, `Wedding`, `Graduation`, `Thank You`, `Congratulations`, `Holiday`, `Just Because`
- **Relationships**: `Friend`, `Partner`, `Parent`, `Sibling`, `Child`, `Colleague`, `Mentor`, `Other`
- **Languages**: `English`, `Yoruba`, `Igbo`, `Hausa`, `Pidgin`, `French`
- **AI Tones**: `Heartfelt`, `Funny`, `Poetic`, `Professional`, `Playful`
- **Orientations**: `portrait`, `landscape`, `square`
- **Text Sizes**: `small`, `medium`, `large`
