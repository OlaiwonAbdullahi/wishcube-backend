# Shipping Revamp & Delivery Tracking System

This document outlines the recent changes to the WishCube backend to support a more secure, recipient-led shipping confirmation process and a mini delivery tracking system.

## 1. Data Model Changes

### Order Model (`Order.ts`)
- **New Statuses**: The status enum has been expanded to support a more granular tracking experience:
    - `processing` (Initial)
    - `shipped` (Marked by vendor)
    - `in_transit` (Optional intermediate state)
    - `out_for_delivery` (Optional intermediate state)
    - `delivered` (Final state - **Strictly recipient confirmed**)
    - `cancelled`
- **Delivery Confirmation Code**: A 6-digit `deliveryCode` is now generated when an order is moved to the `shipped` status.
- **Verification Flag**: `isDeliveredByReceiver` (Boolean) tracks if the delivery was verified via the code.
- **Recipient Email**: The `deliveryAddress` schema now includes an `email` field to support shipment notifications.

### Gift Model (`Gift.ts`)
- **Recipient Email**: Added `email` to the `deliveryAddress` schema. This is captured during the gift redemption process.

## 2. Updated API Endpoints

### Vendor API (`/api/vendors`)

#### Update Order Status
`PUT /api/vendors/orders/:orderId`
- **Behavior**:
    - Vendors can now set statuses to `shipped`, `in_transit`, or `out_for_delivery`.
    - **Generating Code**: When an order is first marked as `shipped`, the system generates a random 6-digit `deliveryCode`.
    - **Email Trigger**: Moving an order to `shipped` for the first time triggers an automated "Gift Shipped" email to the recipient.
    - **Strict Mode**: Vendors are strictly blocked from marking an order as `delivered`. This is to ensure verification happens at the recipient's end.

### Public/Gifts API (`/api/gifts`)

#### Track Order (Public)
`GET /api/gifts/track/:orderId?token=REDEEM_TOKEN`
- **Security**: Requires the `redeemToken` associated with the gift.
- **Response**: Returns the current `status`, `statusHistory` (timeline), `productSnapshot`, and `trackingNumber`. Used by the frontend to render the delivery timeline.

#### Confirm Delivery (Recipient)
`POST /api/gifts/confirm-delivery/:orderId`
- **Body**: `{ "token": "REDEEM_TOKEN", "code": "6_DIGIT_CODE" }`
- **Behavior**:
    - Verifies that the provided `code` matches the `deliveryCode` stored in the order.
    - Updates the order status to `delivered`.
    - Sets `isDeliveredByReceiver` to `true`.
    - Releases the gift escrow/funds (marks `gift.escrowStatus = "released"`).

## 3. Email System

### Order Shipped Notification
A new template `orderShippedTemplate` has been added to `emailTemplates.ts`.
- **Content**: Notifies the recipient that their gift is on the way.
- **Key Info**: Includes the `trackingNumber` (if provided) and the **Delivery Confirmation Code**.
- **Call to Action**: Direct link to the tracking page on the WishCube dashboard.

## 4. Operational Flow

1. **Redemption**: Recipient redeems a physical gift, providing an address and **email**.
2. **Order Creation**: An `Order` is created in `processing` state.
3. **Shipment**: Vendor ships the item and updates status to `shipped` via dashboard.
    - System generates `deliveryCode`.
    - System emails `deliveryCode` and tracking link to recipient.
4. **Tracking**: Recipient monitors progress via the tracking timeline on their WishCube website.
5. **Confirmation**: Upon receipt, recipient enters the 6-digit code on the tracking page.
    - Order status becomes `delivered`.
    - Funds are released to the vendor.

---
*Last Updated: April 10, 2026*
