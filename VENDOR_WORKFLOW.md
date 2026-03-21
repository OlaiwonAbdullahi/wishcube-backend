# WishCube Vendor Application & Management Workflow

This document provides a step-by-step guide to the vendor registration, approval, and management process on the WishCube platform, with an emphasis on API fields and example responses.

---

## **Vendor Onboarding Flow**

Becoming a vendor is a direct registration process, completely separate from standard user accounts.

### **Step 1: Register as a Vendor**

A prospective vendor initiates the process by creating a dedicated vendor account.

- **Endpoint**: `POST /api/vendors/register`
- **Access**: Public

#### **Request Body Fields:**

- `ownerName` (String, Required): The full name of the vendor/owner.
- `email` (String, Required): The primary contact email for the vendor. Must be unique.
- `password` (String, Required): The password for the vendor account (min. 6 characters).
- `storeName` (String, Required): The name of the vendor's store. Must be unique.
- `category` (String, Required): The primary category of products the store sells (e.g., "Cakes", "Flowers", "Fashion").
- `description` (String, Optional): A brief description of the store.

#### **Example Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Vendor registered successfully",
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "vendor": {
      "id": "60d5f1b3e6b3f1b3e6b3f1b3",
      "ownerName": "John Doe",
      "email": "john.doe@example.com",
      "logo": null,
      "isActive": false
    }
  }
}
```

---

### **Step 2: Upload Store Logo**

Immediately after registration, the vendor can upload their store logo using the `accessToken` from the previous step.

- **Endpoint**: `POST /api/vendors/logo`
- **Access**: Private (Authenticated Vendor)
- **Content-Type**: `multipart/form-data`

#### **Request Body:**

- `logo` (File): The image file for the store's logo.

#### **Example Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Logo uploaded successfully",
  "data": {
    "logo": "https://res.cloudinary.com/your-cloud/image/upload/v12345/path/to/logo.jpg"
  }
}
```

---

## **Admin Vendor Management**

Administrators have full control over vendor applications.

### **Step 3: Admin Review**

An admin fetches all vendor applications to review their details.

- **Endpoint**: `GET /api/admin/vendors` (Assumed)
- **Access**: Private (Admin only)
- **Description**: Retrieves a list of all vendors.

### **Step 4: Approve or Reject Application**

- **Approve Endpoint**: `PUT /api/vendors/:id/approve`
  - **Access**: Private (Admin only)
  - **Action**: Sets the vendor's `status` to `"approved"` and `isActive` to `true`.
  - **Example Success Response (200 OK):**
    ```json
    {
        "success": true,
        "message": "Vendor approved successfully",
        "data": {
            "vendor": { ... updated vendor object ... }
        }
    }
    ```

- **Reject Endpoint**: `PUT /api/vendors/:id/reject`
  - **Access**: Private (Admin only)
  - **Action**: Sets the vendor's `status` to `"rejected"`.
  - **Request Body Field**: `reason` (String, Required): A clear explanation for the rejection.
  - **Example Success Response (200 OK):**
    ```json
    {
        "success": true,
        "message": "Vendor rejected successfully",
        "data": {
            "vendor": { ... updated vendor object ... }
        }
    }
    ```

---

## **Vendor Dashboard Access**

Once approved, the vendor can log in to manage their store.

- **Login Endpoint**: `POST /api/vendors/login`
  - **Request Body Fields**: `email`, `password`
  - **Response**: Same structure as the registration response, providing tokens and vendor data.

- **Get My Profile**: `GET /api/vendors/me`
  - **Access**: Private (Authenticated Vendor)
  - **Example Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Vendor details retrieved successfully",
      "data": {
        "vendor": {
          "_id": "60d5f1b3e6b3f1b3e6b3f1b3",
          "ownerName": "John Doe",
          "email": "john.doe@example.com",
          "storeName": "John's Gadgets",
          "slug": "johns-gadgets",
          "category": "Electronics",
          "status": "approved",
          "isActive": true
          // ... other vendor fields
        }
      }
    }
    ```

This decoupled flow ensures a clear separation between users and vendors, providing a dedicated and secure system for marketplace management.
