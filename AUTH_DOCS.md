# WishCube Authentication API Documentation

This document provides detailed information about the authentication endpoints available in the WishCube Backend.

## **Base URL**

`{{API_URL}}/api/auth`

---

## **Endpoints Overview**

| Method | Endpoint                 | Description                                  | Access  |
| :----- | :----------------------- | :------------------------------------------- | :------ |
| `POST` | `/register`              | Register a new user with email/password      | Public  |
| `POST` | `/login`                 | Authenticate existing user                   | Public  |
| `POST` | `/google`                | Authenticate via Google OAuth token          | Public  |
| `POST` | `/refresh`               | Get a new access token using a refresh token | Public  |
| `GET`  | `/me`                    | Get currently authenticated user details     | Private |
| `PUT`  | `/update-profile`        | Update user name and avatar                  | Private |
| `POST` | `/forgot-password`       | Request password reset email                 | Public  |
| `POST` | `/reset-password/:token` | Reset password using token                   | Public  |

---

## **Detailed Endpoints**

### **1. Register User**

Creates a new local user account. Also sends a welcome email.

- **URL**: `/register`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "user": {
      "id": "65f...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "authProvider": "local"
    }
  }
  ```

### **2. Login User**

Authenticates a user and returns tokens. Updates `lastLogin` timestamp.

- **URL**: `/login`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "securepassword123"
  }
  ```
- **Success Response (200 OK)**: Same structure as Register.

### **3. Google Authentication**

Authenticates a user using a Google ID token from the frontend. Sends a welcome email for first-time users.

- **URL**: `/google`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "token": "GOOGLE_ID_TOKEN_HERE"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "accessToken": "...",
    "refreshToken": "...",
    "user": {
      "authProvider": "google",
      "googleId": "...",
      "avatar": "https://..."
    }
  }
  ```

### **4. Refresh Token**

Generates a new short-lived access token using a valid refresh token.

- **URL**: `/refresh`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "refreshToken": "VALID_REFRESH_TOKEN"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "accessToken": "NEW_ACCESS_TOKEN"
  }
  ```

### **5. Get Current User (Protected)**

Returns details of the currently logged-in user.

- **URL**: `/me`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <ACCESS_TOKEN>`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "...",
      "name": "...",
      "email": "..."
    }
  }
  ```

### **6. Update Profile (Protected)**

Updates the name or avatar of the currently logged-in user.

- **URL**: `/update-profile`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer <ACCESS_TOKEN>`
- **Request Body**:
  ```json
  {
    "name": "John Updated",
    "avatar": "https://api.dicebear.com/..."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Profile updated successfully",
    "data": { ... }
  }
  ```

### **7. Forgot Password**

Requests a password reset link to be sent via email. For security, it returns success even if the email doesn't exist.

- **URL**: `/forgot-password`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "john@example.com"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "If an account exists with that email, a reset link has been sent"
  }
  ```

### **8. Reset Password**

Sets a new password using a token received via email.

- **URL**: `/reset-password/:token`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "password": "newsecurepassword123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password updated successfully. You can now log in."
  }
  ```

---

## **Error Handling**

The API uses standard HTTP status codes:

- **400 Bad Request**: Missing required fields or invalid data.
- **401 Unauthorized**: Invalid credentials or expired token.
- **403 Forbidden**: Account deactivated or insufficient permissions.
- **404 Not Found**: User not found.
- **500 Internal Server Error**: Unexpected server error (e.g., email sending failed).

**Error Response Format**:

```json
{
  "status": "fail",
  "message": "Specific error message here"
}
```

---

## **Security Implementation**

- **Passwords**: Hashed using `bcryptjs` with 12 salt rounds.
- **JWT**:
  - Access Token: Expires in 15 minutes.
  - Refresh Token: Expires in 7 days.
- **Middleware**: [authMiddleware.ts](file:///c:/Users/HP/Desktop/wishcube-backend/src/middleware/authMiddleware.ts) handles token verification and role authorization.
- **Password Reset Tokens**: Securely generated and stored hashed in the database. Expires in 1 hour.
