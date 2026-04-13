# Frontend Integration Guide: New Authentication & Security Features

This document outlines the changes to the authentication flow and new security measures implemented in the WishCube backend. These changes impact registration, login, and password management.

---

## **1. Registration Flow Changes**

### **Updated Password Requirements**

Passwords must now meet the following complexity criteria:

- **Minimum 8 characters**
- **1 Uppercase letter** (`A-Z`)
- **1 Lowercase letter** (`a-z`)
- **1 Number** (`0-9`)
- **1 Special character** (e.g., `!@#$%^&*`)

### **Registration Response**

The `/api/auth/register` endpoint no longer returns an access token immediately. Instead, it informs the user to check their email for verification.

**Request:** `POST /api/auth/register`
**Response (201 Created):**

```json
{
  "success": true,
  "message": "User registered. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "...",
      "name": "...",
      "email": "...",
      "isVerified": false
    }
  }
}
```

---

## **2. Email Verification**

Users must verify their email before they can log in.

### **Verify Email**

**Endpoint:** `GET /api/auth/verify-email/:token`

- The `:token` is extracted from the link sent to the user's email.
- **Frontend Action:** Create a dedicated route (e.g., `/verify-email/:token`) that calls this API and displays a success/failure message.

### **Resend Verification Email**

**Endpoint:** `POST /api/auth/resend-verification`

- **Body:** `{ "email": "user@example.com" }`
- **Usage:** Provide a button on the login or "pending verification" page for users who didn't receive the email.

---

## **3. Login & Security Measures**

### **Unverified Accounts**

If a user tries to log in without verifying their email, the API returns a `401 Unauthorized`.
**Response:**

```json
{
  "success": false,
  "message": "Please verify your email to log in"
}
```

### **Account Locking (Brute-Force Protection)**

Accounts are locked for **1 hour** after **5 consecutive failed login attempts**.
**Response (403 Forbidden):**

```json
{
  "success": false,
  "message": "Account is locked due to multiple failed attempts. Please try again in 58 minutes"
}
```

### **Rate Limiting**

IP-based rate limits are enforced:

- **Login/Register:** Max 10 attempts per 15 minutes.
- **Forgot Password/Resend Verification:** Max 5 attempts per 15 minutes.
- **Response (429 Too Many Requests):**

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again after 15 minutes"
}
```

---

## **4. Token Management**

### **Token Lifespan**

- **Access Token:** Expires in **1 hour** (previously 7 days).
- **Refresh Token:** Expires in **7 days**.

### **Refresh Logic**

Ensure the frontend properly handles token expiration by using the `/api/auth/refresh` endpoint when an API call returns a `401`.

---

## **5. Password Reset Enhancement**

The `/api/auth/reset-password/:token` route now enforces the same **Password Complexity** rules as registration. Ensure the frontend validation matches these rules to provide immediate feedback to the user.
