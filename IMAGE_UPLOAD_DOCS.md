# WishCube Image Upload API Documentation

This document covers all endpoints used for uploading images and media to Cloudinary across the WishCube platform.

**Base URL:** `https://api.usewishcube.com/api` (or `http://localhost:5000/api`)

---

## **🛍️ Product Images**
Used by vendors and admins to upload product photos.

- **URL:** `/products/upload`
- **Method:** `POST`
- **Access:** Private (Vendor/Admin)
- **Content-Type:** `multipart/form-data`
- **Body:** `images` (File array, max 5)

- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Images uploaded successfully",
    "data": {
      "images": [
        {
          "url": "https://res.cloudinary.com/...",
          "publicId": "products/..."
        }
      ]
    }
  }
  ```

---

## **🏪 Vendor Logo**
Used by vendors to upload or update their store logo.

- **URL:** `/vendors/logo`
- **Method:** `POST`
- **Access:** Private (Authenticated User/Vendor)
- **Content-Type:** `multipart/form-data`
- **Body:** `logo` (File)

- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logo uploaded successfully",
    "data": {
      "logo": "https://res.cloudinary.com/..."
    }
  }
  ```

---

## **🎴 Card Background**
Used to upload custom background images for digital greeting cards.

- **URL:** `/cards/:id/background`
- **Method:** `POST`
- **Access:** Private (Card owner only)
- **Content-Type:** `multipart/form-data`
- **Body:** `image` (File)

- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Background image uploaded successfully",
    "data": {
      "backgroundImageUrl": "https://res.cloudinary.com/...",
      "card": { ... }
    }
  }
  ```

---

## **👤 User Avatar**
*Currently, the profile update endpoint expects a URL string. A dedicated upload endpoint for avatars is coming soon.*

- **URL:** `/auth/update-profile`
- **Method:** `PUT`
- **Access:** Private (Authenticated User)
- **Body:** `{ "avatar": "https://..." }`
