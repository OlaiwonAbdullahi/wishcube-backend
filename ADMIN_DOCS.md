# WishCube Admin API Documentation & Frontend Integration

This document covers the endpoints restricted to administrators only. It includes specific guidelines for frontend developers to ensure a smooth integration with the admin dashboard.

**Base URL:** `https://api.usewishcube.com/api` (or `http://localhost:5000/api`)

---

## **🚀 Global Integration Guidelines**

### **1. Authentication Headers**

Every admin request **MUST** include the following header:

```http
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
Content-Type: application/json
```

> **Note:** If the token is missing or expired, the backend will return `401 Unauthorized`. The frontend should redirect the user to the login page.

### **2. Global Response Format**

All endpoints follow a consistent response shape to simplify state management:

**Success Response:**

```json
{
  "success": true,
  "message": "Human-readable success message",
  "data": { ... } // Payload
}
```

**Error Response:**

```json
{
  "success": false, // or missing in some error cases
  "status": "fail" | "error",
  "message": "Detailed error message for the user"
}
```

---

## **🔒 Authentication & User Management**

### **User Model Fields**

| Field          | Type      | Description                            |
| :------------- | :-------- | :------------------------------------- |
| `id`           | `String`  | Unique MongoDB ObjectId                |
| `name`         | `String`  | Full name of the user                  |
| `email`        | `String`  | Registered email address               |
| `role`         | `String`  | `user`, `admin`, `moderator`, `vendor` |
| `isActive`     | `Boolean` | Account status (True/False)            |
| `authProvider` | `String`  | `local` or `google`                    |
| `avatar`       | `String`  | URL to profile picture                 |
| `lastLogin`    | `Date`    | Timestamp of the last successful login |
| `createdAt`    | `Date`    | Account creation timestamp             |

### **1. Get All Users**

Retrieves a list of all registered users on the platform.

- **URL**: `/auth`
- **Method**: `GET`
- **Frontend Expectation:**

  - **UI:** Render a table or list of users.
  - **Fields to show:** `name`, `email`, `role`, `isActive`, `lastLogin`.
  - **Action:** Allow clicking a user to view detailed logs (if implemented).

- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "All users retrieved successfully",
    "data": {
      "total": 42,
      "users": [
        {
          "id": "65f...",
          "name": "John Doe",
          "email": "john@example.com",
          "role": "user",
          "isActive": true,
          "lastLogin": "2024-03-15T10:00:00Z"
        }
      ]
    }
  }
  ```

---

## **🏬 Vendor Management**

### **Vendor Model Fields**

| Field             | Type      | Description                                              |
| :---------------- | :-------- | :------------------------------------------------------- |
| `id`              | `String`  | Unique MongoDB ObjectId                                  |
| `userId`          | `Object`  | Populated User details (`name`, `email`)                 |
| `storeName`       | `String`  | Display name of the shop                                 |
| `slug`            | `String`  | URL-friendly name (e.g., `sweet-bakery`)                 |
| `description`     | `String`  | Store bio/description                                    |
| `logo`            | `String`  | Cloudinary URL for store logo                            |
| `category`        | `String`  | `Cakes`, `Flowers`, `Fashion`, etc.                      |
| `deliveryZones`   | `Array`   | List of states/cities covered                            |
| `bankDetails`     | `Object`  | Payout info (`accountName`, `accountNumber`, `bankCode`) |
| `status`          | `String`  | `pending`, `approved`, `rejected`, `suspended`           |
| `isActive`        | `Boolean` | Store visibility status                                  |
| `rating`          | `Number`  | Average store rating (0-5)                               |
| `totalSales`      | `Number`  | Total number of items sold                               |
| `totalEarnings`   | `Number`  | Total NGN earned by vendor                               |
| `commissionRate`  | `Number`  | Platform fee percentage (default `0.1`)                  |
| `rejectionReason` | `String`  | Why the app was rejected (if applicable)                 |
| `approvedAt`      | `Date`    | Timestamp of admin approval                              |

### **1. Get All Vendors**

Retrieves all vendor applications and active stores.

- **URL**: `/vendors`
- **Method**: `GET`
- **Query Parameters**:
  - `status` (Optional): `pending`, `approved`, `rejected`, `suspended`
- **Frontend Expectation:**

  - **Filtering:** Use the `status` query param to build tabs (e.g., "Pending Apps", "Active Stores").
  - **UI:** Show store name, category, and application date.

- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "All vendors retrieved successfully",
    "data": {
      "total": 12,
      "vendors": [ ... ]
    }
  }
  ```

### **2. Approve Vendor Application**

Approves a pending application and upgrades the user.

- **URL**: `/vendors/:id/approve`
- **Method**: `PUT`
- **Frontend Expectation:**

  - **Action:** Show a confirmation dialog ("Are you sure you want to approve this store?").
  - **Feedback:** On success, show a success toast and refresh the "Pending" list.

- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Vendor approved successfully",
    "data": { "vendor": { ... } }
  }
  ```

### **3. Reject Vendor Application**

Rejects an application with a mandatory reason.

- **URL**: `/vendors/:id/reject`
- **Method**: `PUT`
- **Frontend Expectation:**

  - **Action:** Open a modal with a `textarea` for the rejection reason.
  - **Validation:** Disable the "Submit" button if the reason is empty.

- **Request Body**:
  ```json
  {
    "reason": "Invalid business documentation."
  }
  ```

---

## **📝 Waitlist Management**

### **Waitlist Model Fields**

| Field       | Type     | Description                 |
| :---------- | :------- | :-------------------------- |
| `id`        | `String` | Unique MongoDB ObjectId     |
| `name`      | `String` | Full name of the subscriber |
| `email`     | `String` | Subscriber email address    |
| `createdAt` | `Date`   | Signup timestamp            |

### **1. Get All Waitlist Signups**

- **URL**: `/waitlist`
- **Method**: `GET`
- **Frontend Expectation:**

  - **UI:** Simple table showing `name`, `email`, and `signupDate`.
  - **Feature:** Add a "Copy Emails" button to easily grab all emails for marketing.

- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Waitlist retrieved successfully",
    "data": {
      "total": 150,
      "waitlist": [ ... ]
    }
  }
  ```

---

## **⚠️ Error Handling for Frontend**

| Status Code | Meaning      | Frontend Action                                                                      |
| :---------- | :----------- | :----------------------------------------------------------------------------------- |
| **401**     | Unauthorized | Clear local storage/cookies and redirect to `/login`.                                |
| **403**     | Forbidden    | Show "Access Denied" page. This happens if a non-admin tries to access these routes. |
| **404**     | Not Found    | Show "Resource not found" toast.                                                     |
| **400**     | Bad Request  | Show the `message` from the response in a red alert/toast.                           |
| **500**     | Server Error | Show a generic "Something went wrong" message.                                       |
