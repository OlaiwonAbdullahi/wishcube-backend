# WishCube Backend

Wishcube is a platform for creating greeting cards, Pages(website), virtual party rooms, and integrating gifting. Make every celebration unforgettable.

[![Project Status: Active](https://img.shields.io/badge/Project%20Status-Active-brightgreen.svg)](https://github.com/OlaiwonAbdullahi/wishcube-backend)
[![Tech Stack: Node.js/Express](https://img.shields.io/badge/Tech%20Stack-Node.js%2FExpress-blue.svg)](https://expressjs.com/)
[![Built with TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)

---

## Overview

WishCube is designed to modernize how people celebrate special moments. This repository houses the RESTful API that powers Wishcube.

### Features

- **Authentication**: Secure JWT-based authentication with access/refresh token rotation and Google OAuth integration.
- **Greeting Cards**: Create and manage personalized cards with customizable templates and message generation.
- **Pages (Websites)**: Personalized greeting pages with integrated gift.
- **Gifting & Marketplace**: Full-featured product catalog with gift order management.
- **Wallet & Payments**: Integrated payment processing via Paystack, transaction tracking, and secure withdrawal workflows for vendors.
- **Vendor**: Specialized onboarding and workflow management for physical and digital product vendors.
- **AI Integration**: Google Gemini through (HackAI) AI-powered message suggestions for cards and websites.

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (via Mongoose)
- **Security**: Helmet, CORS, JWT
- **Email Service**:Resend
- **Cloud Storage**: Cloudinary (for images/assets)
- **AI Engine**: Hack AI
- **Payment Gateway**: Paystack

---

## Project Structure

```text
src/
├── app.ts            # Application Entry Point & Middleware Config
├── config/           # Database & Third-party Service Config
├── lib/              # Core Logic & Library Wrappers (AI, Cloudinary)
├── middleware/       # Custom Auth & Error Handling Middlewares
├── model/            # Mongoose Schemas & Data Models
├── routes/           # API Endpoint Definitions
├── utils/            # Helper Functions & Constants
└── seeder.ts         # Administrative Data Seeding Scripts
```

---

### Installation

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/OlaiwonAbdullahi/wishcube-backend.git
    cd wishcube-backend
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Environment Variables**:
    Create a `.env` file in the root directory based on `.env.example`:

    ```bash
    cp .env.example .env
    ```

    Fill in the required credentials:
    - `MONGODB_URI`: Your MongoDB connection string
    - `JWT_SECRET`: Secret for token signing
    - `CLOUDINARY_*`: For image uploads
    - `PAYSTACK_*`: For payment gateway
    - `HACKCLUB_API_KEY`: For AI features

4.  **Run in Development**:

    ```bash
    npm run dev
    ```

5.  **Build & Start (Production)**:
    ```bash
    npm run build
    npm start
    ```

---

## 🛣 API Documentation

- **Base Endpoint**: `/api`

### Main Route Groups

| Route           | Description                                      |
| :-------------- | :----------------------------------------------- |
| `/api/auth`     | User registration, login, and profile management |
| `/api/cards`    | Digital card creation and AI generation          |
| `/api/websites` | Event website creation and management            |
| `/api/gifts`    | Registry management and order tracking           |
| `/api/vendors`  | Vendor onboarding and dashboard tools            |
| `/api/wallet`   | Payment processing and funds management          |

---
