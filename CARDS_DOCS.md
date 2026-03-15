# WishCube Cards & AI API Documentation

This document provides detailed information about the digital greeting card management and AI message generation endpoints.

## **Base URL**
`{{API_URL}}/api/cards`

---

## **Endpoints Overview**

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Get all cards for the authenticated user | Private |
| `POST` | `/` | Create a new card draft | Private |
| `GET` | `/:id` | Get details of a specific card | Private |
| `PUT` | `/:id` | Update card details (text, font, theme, etc.) | Private |
| `DELETE` | `/:id` | Delete a card and its background image | Private |
| `POST` | `/:id/background` | Upload a background image to Cloudinary | Private |
| `DELETE` | `/:id/background` | Remove background image | Private |
| `POST` | `/ai/generate` | Generate 3 AI message suggestions | Private |
| `POST` | `/:id/complete` | Mark card as completed and increment download | Private |
| `POST` | `/:id/track-download`| Increment download count | Private |

---

## **Detailed Endpoints**

### **1. Generate AI Messages**
Generates three unique message suggestions using Hack Club AI (GPT-5-mini).

- **URL**: `/ai/generate`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "recipientName": "Sarah",
    "senderName": "Alex",
    "occasion": "Birthday",
    "relationship": "Sister",
    "language": "English",
    "tone": "Funny"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "suggestions": [
      "Message variant 1...",
      "Message variant 2...",
      "Message variant 3..."
    ]
  }
  ```

### **2. Create Card**
Initialize a new greeting card.

- **URL**: `/`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "senderName": "Alex",
    "recipientName": "Sarah",
    "occasion": "Birthday",
    "theme": "modern",
    "font": "handwritten"
  }
  ```

### **3. Upload Background Image**
Uploads an image file to Cloudinary and links it to the card.

- **URL**: `/:id/background`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Body**: `image` (File)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "backgroundImageUrl": "https://res.cloudinary.com/...",
    "card": { ... }
  }
  ```

---

## **Enum Values**

To ensure validation passes, use these exact strings for request bodies:

- **Occasions**: `Birthday`, `Anniversary`, `Wedding`, `Graduation`, `Thank You`, `Congratulations`, `Holiday`, `Just Because`
- **Relationships**: `Friend`, `Partner`, `Parent`, `Sibling`, `Child`, `Colleague`, `Mentor`, `Other`
- **Languages**: `English`, `Yoruba`, `Igbo`, `Hausa`, `Pidgin`, `French`
- **AI Tones**: `Heartfelt`, `Funny`, `Poetic`, `Professional`, `Playful`
- **Fonts**: `serif`, `sans-serif`, `handwritten`, `script`, `monospace`
- **Orientations**: `portrait`, `landscape`, `square`
