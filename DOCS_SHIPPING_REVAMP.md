# Shipping Revamp & Delivery Tracking System

This document outlines the changes to the WishCube backend to support a more secure, OTP-based delivery flow and a comprehensive tracking system.

## 1. Data Model Changes

### Order Model (`Order.ts`)

- **Statuses**: The status enum supports a granular tracking experience:
  - `processing` (Initial)
  - `out_for_delivery` (OTP generated and sent to recipient)
  - `in_transit` (Intermediate state)
  - `awaiting_confirmation` (Package at location, awaiting final handoff or self-confirm)
  - `delivered` (Final state - **Confirmed via OTP**)
  - `disputed` (Failed OTP attempts or manual intervention)
  - `cancelled`
- **New Fields**:
  - `deliveryCode`: A 6-digit OTP generated when status moves to `out_for_delivery`.
  - `otpExpiresAt`: Date when the OTP becomes invalid (set to 7 days from generation).
  - `otpAttempts`: Tracks failed verification attempts (Max 3, then moves to `disputed`).
  - `awaitingConfirmationAt`: Timestamp when vendor sets status to `awaiting_confirmation`.
  - `confirmedBy`: Tracks who triggered the delivery (`vendor` or `recipient`).
  - `isDeliveredByReceiver`: Boolean flag indicating delivery was verified.

## 2. API Endpoints

### Centralized Order API (`/api/orders`)

#### Update Order Status

`PATCH /api/orders/:id/status`

- **Access**: Private (Authorized Vendor only).
- **Behavior**:
  - Allows vendors to move status through `out_for_delivery`, `in_transit`, and `awaiting_confirmation`.
  - **OTP Generation**: Triggers when status first becomes `out_for_delivery`.
  - **Email Trigger**: Automated "Gift Out for Delivery" email sent to recipient with OTP.

#### Confirm Delivery (Unified)

`POST /api/orders/:id/confirm`

- **Access**: Public (with `token`) or Private.
- **Body**: `{ "code": "6_DIGIT_OTP", "confirmedBy": "vendor" | "recipient", "token": "REDEEM_TOKEN" (optional for recipient) }`
- **Behavior**:
  - Verifies OTP against `deliveryCode`.
  - **Vendor Entry**: Vendor enters the code read out by the recipient at physical handoff.
  - **Recipient Self-Confirm**: Recipient can self-confirm from their tracking page only if status is `awaiting_confirmation` AND within 48 hours of `awaitingConfirmationAt`.
  - **Attempt Limit**: On the 3rd failed attempt, status moves to `disputed` and escrow is held.
  - **Success**: Updates status to `delivered`, releases escrow funds, and notifies both parties.

### Deprecated Endpoints

- `PUT /api/vendors/orders/:orderId` (Moved to `/api/orders/:id/status`)
- `POST /api/gifts/confirm-delivery/:orderId` (Moved to `/api/orders/:id/confirm`)

## 3. Email System

### Out for Delivery Notification

Template: `orderOutForDeliveryTemplate`

- **Trigger**: Status transition to `out_for_delivery`.
- **Content**: Includes tracking number, **Delivery Confirmation Code (OTP)**, and tracking link.

### Delivery Confirmed Notification

Template: `deliveryConfirmedTemplate`

- **Trigger**: Successful OTP verification.
- **Recipient**: Notifies that their gift has been confirmed.
- **Vendor**: Notifies that funds have been released to their escrow.

## 4. Operational Flow

1. **Redemption**: Recipient redeems gift; `Order` created in `processing`.
2. **Out for Delivery**: Vendor marks as `out_for_delivery`.
   - System generates 6-digit OTP (expires in 7 days).
   - Recipient receives OTP via email.
3. **Handoff**: Vendor arrives for delivery.
   - Recipient reads OTP to vendor.
   - Vendor enters OTP in dashboard → Status becomes `delivered` → Funds released.
4. **Fallback**: If unattended or vendor forgot to enter OTP:
   - Recipient can self-confirm using the same OTP from their tracking page within 48 hours of status becoming `awaiting_confirmation`.
5. **Dispute**: If 3 incorrect OTP attempts occur, order is marked `disputed` for manual review.

---

_Last Updated: April 12, 2026_
