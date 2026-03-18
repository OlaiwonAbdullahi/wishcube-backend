# WishCube Product API Documentation

This document covers the endpoints for managing products on the WishCube platform. These endpoints are used by both the public marketplace and vendors to manage their inventory.

**Base URL:** `https://api.usewishcube.com/api/products` (or `http://localhost:5000/api/products`)

---

## **📦 Product Model Fields**

| Field           | Type       | Description                                                                                                  |
| :-------------- | :--------- | :----------------------------------------------------------------------------------------------------------- |
| `id`            | `String`   | Unique MongoDB ObjectId.                                                                                     |
| `vendorId`      | `ObjectId` | Reference to the owning vendor.                                                                              |
| `name`          | `String`   | Product name (required).                                                                                     |
| `description`   | `String`   | Detailed product description.                                                                                |
| `price`         | `Number`   | Price in NGN (required).                                                                                     |
| `images`        | `Array`    | List of image objects `[{ url, publicId }]`.                                                                 |
| `category`      | `String`   | One of: `Cakes`, `Flowers`, `Fashion`, `Electronics`, `Experiences`, `Vouchers`, `Food`, `Jewelry`, `Other`. |
| `occasionTags`  | `Array`    | Tags for matching occasions (e.g., `["Birthday", "Anniversary"]`).                                           |
| `deliveryZones` | `Array`    | States/cities where this product can be delivered.                                                           |
| `stock`         | `Number`   | Available inventory count.                                                                                   |
| `isAvailable`   | `Boolean`  | Visibility on the marketplace (default: `true`).                                                             |
| `isFeatured`    | `Boolean`  | Whether the product is highlighted.                                                                          |
| `createdAt`     | `Date`     | Creation timestamp.                                                                                          |

---

## **🌍 Public Endpoints**

### **1. Get All Products (Marketplace)**

Retrieves a list of available products with optional filtering.

- **URL:** `/`
- **Method:** `GET`
- **Access:** Public
- **Query Parameters:**

  - `category`: Filter by product category.
  - `occasion`: Filter by occasion tags.
  - `state`: Filter by delivery zones.
  - `search`: Case-insensitive search on product name.
  - `minPrice`: Minimum price filter.
  - `maxPrice`: Maximum price filter.
  - `featured`: If `true`, returns only featured products.

- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Products retrieved successfully",
    "data": {
      "total": 10,
      "products": [ ... ]
    }
  }
  ```

### **2. Get Digital Gifts (Vouchers)**

Retrieves a list of all active digital gift vouchers uploaded by admins.

- **URL:** `/digital-gifts`
- **Method:** `GET`
- **Access:** Public

- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Digital gifts retrieved successfully",
    "data": {
      "total": 5,
      "products": [ ... ]
    }
  }
  ```

### **3. Get Single Product**

Retrieves detailed information for a specific product.

- **URL:** `/:id`
- **Method:** `GET`
- **Access:** Public

- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Product retrieved successfully",
    "data": {
      "product": { ... }
    }
  }
  ```

---

## **🏬 Vendor Endpoints (Private)**

> **Note:** These endpoints require an `Authorization: Bearer <VENDOR_TOKEN>` header. The user must have an **approved** vendor account.

### **1. Upload Product Images**
Uploads up to 5 images to Cloudinary. These images should be uploaded *before* calling the Create/Update Product endpoints.

- **URL:** `/upload`
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

### **2. Create Product**
Creates a new product for the authenticated vendor.

- **URL:** `/`
- **Method:** `POST`
- **Access:** Private (Vendor)
- **Request Body:**

  ```json
  {
    "name": "Luxury Cake",
    "price": 25000,
    "category": "Cakes",
    "description": "Delicious 2-tier chocolate cake.",
    "images": [{ "url": "...", "publicId": "..." }],
    "stock": 5,
    "deliveryZones": ["Lagos"]
  }
  ```

- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Product created successfully",
    "data": { "product": { ... } }
  }
  ```

### **3. Update Product**
Updates an existing product's details. Only the owning vendor can update their products.

- **URL:** `/:id`
- **Method:** `PUT`
- **Access:** Private (Vendor)
- **Request Body:** Same as Create Product (all fields optional).

- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Product updated successfully",
    "data": { "product": { ... } }
  }
  ```

### **4. Delete Product**

Permanently deletes a product and its associated images from Cloudinary.

- **URL:** `/:id`
- **Method:** `DELETE`
- **Access:** Private (Vendor)

- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Product deleted successfully",
    "data": null
  }
  ```
