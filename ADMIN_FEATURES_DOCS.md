# WishCube Admin Features Documentation

This document covers endpoints and features that are exclusive to administrators.

**Base URL:** `https://api.usewishcube.com/api/admin` (or `http://localhost:5000/api/admin`)

---

## **🎁 Digital Gift Management**

### **1. Create Digital Gift Product**

Allows an admin to create a new digital gift, which is stored as a product with the category `Vouchers` and has unlimited stock.

- **URL**: `/digital-gifts`
- **Method**: `POST`
- **Access**: Private (Admin only)
- **Authentication**: Requires a valid `Authorization: Bearer <ADMIN_TOKEN>` header.

- **Request Body**:
  ```json
  {
    "name": "Spotify Premium Voucher",
    "price": 5000,
    "description": "3-month subscription to Spotify Premium.",
    "images": [
      {
        "url": "https://res.cloudinary.com/demo/image/upload/spotify_voucher.jpg",
        "publicId": "vouchers/spotify"
      }
    ]
  }
  ```

- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Digital gift created successfully",
    "data": {
      "digitalGift": {
        "id": "660...",
        "name": "Spotify Premium Voucher",
        "price": 5000,
        "category": "Vouchers",
        "stock": "Infinity",
        ...
      }
    }
  }
  ```

### **2. Get All Digital Gifts**

Retrieves a list of all digital gifts (Vouchers) created by admins.

- **URL**: `/digital-gifts`
- **Method**: `GET`
- **Access**: Private (Admin only)
- **Authentication**: Requires a valid `Authorization: Bearer <ADMIN_TOKEN>` header.

- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Digital gifts retrieved successfully",
    "data": {
      "total": 5,
      "digitalGifts": [ ... ]
    }
  }
  ```

### **3. Delete Digital Gift**

Deletes a specific digital gift voucher.

- **URL**: `/digital-gifts/:id`
- **Method**: `DELETE`
- **Access**: Private (Admin only)
- **Authentication**: Requires a valid `Authorization: Bearer <ADMIN_TOKEN>` header.

- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Digital gift deleted successfully",
    "data": null
  }
  ```

- **Error Responses**:
  - **400 Bad Request**: If `name` or `price` are missing.
  - **401 Unauthorized**: If the admin token is missing or invalid.
  - **403 Forbidden**: If the user is not an admin.
