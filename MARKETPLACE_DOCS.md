# WishCube Marketplace API Documentation

This document covers the public endpoints for the WishCube Marketplace, including products, vendors, and digital gift vouchers.

**Base URL:** `https://api.usewishcube.com/api` (or `http://localhost:5000/api`)

---

## **🛍️ Marketplace Endpoints**

### **1. Get All Products (Marketplace)**
Retrieves a list of available products with optional filtering.

- **URL:** `/products`
- **Method:** `GET`
- **Access:** Public
- **Query Parameters:**
  - `category` (Optional): Filter by category (e.g., `Cakes`, `Flowers`).
  - `occasion` (Optional): Filter by occasion tags (e.g., `Birthday`, `Anniversary`).
  - `state` (Optional): Filter by delivery zones (e.g., `Lagos`, `Abuja`).
  - `search` (Optional): Case-insensitive search by product name.
  - `minPrice` / `maxPrice` (Optional): Price range filter.
  - `featured` (Optional): Set to `true` to get only featured products.

- **Frontend Implementation:**
  - **Search Bar**: Implement a debounced input (e.g., 300ms) to call the `search` parameter.
  - **Filter Sidebar**: Use checkboxes for categories and occasion tags.
  - **Grid Layout**: Display a 3-column or 4-column grid of products showing the price, name, and vendor info.

- **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Products retrieved successfully",
    "data": {
      "total": 12,
      "products": [
        {
          "_id": "65f...",
          "name": "Luxury Chocolate Cake",
          "price": 12000,
          "images": [{ "url": "https://res.cloudinary...", "publicId": "..." }],
          "vendorId": {
            "storeName": "Sweet Delights",
            "slug": "sweet-delights",
            "rating": 4.5
          }
        }
      ]
    }
  }
  ```

---

### **2. Get All Vendors (Marketplace)**
Retrieves a list of active and approved vendors.

- **URL:** `/vendors`
- **Method:** `GET`
- **Access:** Public
- **Query Parameters:**
  - `category` (Optional): Filter by store category.
  - `search` (Optional): Case-insensitive search by `storeName`.

- **Frontend Implementation:**
  - **Shop Directory**: List vendors with their logo and store name.
  - **Link to Store**: Use the `slug` to link to the vendor's individual storefront page (`/vendors/store/:slug`).

- **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Vendors retrieved successfully",
    "data": {
      "total": 8,
      "vendors": [
        {
          "_id": "65e...",
          "storeName": "Gifts & Blooms",
          "slug": "gifts-and-blooms",
          "logo": "https://res.cloudinary...",
          "category": "Flowers",
          "rating": 4.8
        }
      ]
    }
  }
  ```

---

### **3. Get Digital Gifts (Vouchers)**
Retrieves a list of all active digital gift vouchers uploaded by admins.

- **URL:** `/products/digital-gifts`
- **Method:** `GET`
- **Access:** Public

- **Frontend Implementation:**
  - **Gift Selection**: Use this endpoint when a user is choosing a digital gift to attach to their celebration website.
  - **No Shipping**: Digital gifts don't require delivery address collection; only a recipient's bank details for redemption.

- **Example Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Digital gifts retrieved successfully",
    "data": {
      "total": 3,
      "products": [
        {
          "_id": "660...",
          "name": "Spotify Premium Voucher",
          "price": 5000,
          "category": "Vouchers",
          "description": "3-month subscription to Spotify Premium.",
          "images": [...]
        }
      ]
    }
  }
  ```

---

## **💡 Frontend Implementation Guidelines**

### **Response Handling**
Always use the `success` and `message` fields to handle UI feedback. If `success` is `false`, display the `message` in a toast notification.

### **Populated Data**
The `/products` endpoint populates `vendorId` with the following fields: `storeName`, `slug`, `logo`, `rating`, `deliveryZones`. This is sufficient for rendering product cards without extra API calls.

### **Error Handling**
- **404 Not Found**: Handle the "No results found" state gracefully.
- **500 Server Error**: Show a generic "Something went wrong" message to the user.
