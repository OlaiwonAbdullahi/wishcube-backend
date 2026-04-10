"use strict";
/**
 * Email Template Utility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.genericNotificationTemplate = exports.websiteReactionTemplate = exports.websiteReplyTemplate = exports.orderShippedTemplate = exports.giftRedeemedSenderTemplate = exports.vendorOrderNotificationTemplate = exports.vendorRejectedTemplate = exports.vendorApprovedTemplate = exports.passwordResetTemplate = exports.subscriptionActiveTemplate = exports.userWelcomeTemplate = exports.vendorWelcomeTemplate = exports.walletFundedTemplate = exports.giftSuccessTemplate = exports.websitePublishedTemplate = void 0;
const baseEmailLayout = ({ title, subtitle, content, icon = "🎁", footerText = `&copy; ${new Date().getFullYear()} WishCube. All rights reserved.`, }) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#F3F3F3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #191A23;border-bottom:5px solid #191A23;box-shadow:4px 4px 0 rgba(25,26,35,.15);max-width:560px;width:100%;">
          <tr>
            <td style="background:#191A23;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">WishCube</p>
              <div style="display:inline-block;background:#E6D1FF;border:2px solid #fff;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;margin-bottom:14px;">${icon}</div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">${title}</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">${subtitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;background:#ffffff;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background:#F3F3F3;border-top:2px solid #191A23;text-align:center;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;">${footerText}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
/**
 * Generates a standard button for email templates
 */
const renderButton = (text, url) => {
    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
      <tr>
        <td align="center">
          <a href="${url}" style="display:inline-block;background:#191A23;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:14px 36px;border:2px solid #191A23;border-bottom:4px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.2);">
            ${text} &rarr;
          </a>
        </td>
      </tr>
    </table>`;
};
/**
 * Template for website published notification
 */
const websitePublishedTemplate = (recipientName, senderName, occasionText, publicUrl) => {
    const content = `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${recipientName},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      <strong>${senderName}</strong> has put together a personalized Wishcube website just for you${occasionText}! Click below to unwrap your digital experience.
    </p>
    ${renderButton("View Your WishCube", publicUrl)}`;
    return baseEmailLayout({
        title: "Surprise!",
        subtitle: `${senderName} has created something special for you`,
        content,
    });
};
exports.websitePublishedTemplate = websitePublishedTemplate;
/**
 * Template for gift purchase success
 */
const giftSuccessTemplate = (senderName, dashboardUrl) => {
    const content = `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${senderName},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      Your payment for the gift was successful. The gift is now active and ready to be redeemed by the recipient.
    </p>
    ${renderButton("View My Gifts", dashboardUrl)}`;
    return baseEmailLayout({
        title: "Payment Confirmed!",
        subtitle: "Your gift is ready to be sent",
        content,
    });
};
exports.giftSuccessTemplate = giftSuccessTemplate;
/**
 * Template for wallet funding success
 */
const walletFundedTemplate = (name, amount, balance, reference, fundedAt, dashboardUrl = "") => {
    const content = `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${name || "there"},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      Your wallet has been successfully credited via Paystack. You can now use your balance to celebrate your loved ones!
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;border:2px solid #191A23;border-bottom:4px solid #191A23;margin-bottom:28px;">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 16px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#191A23;">Transaction Details</p>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
            <tr>
              <td style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#52525b;">Amount Funded</td>
              <td align="right" style="font-size:18px;font-weight:800;color:#191A23;">₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
          <div style="border-top:1px solid #D4D4D8;margin-bottom:12px;"></div>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
            <tr>
              <td style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#52525b;">New Balance</td>
              <td align="right" style="font-size:15px;font-weight:700;color:#16a34a;">₦${balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
          ${reference
        ? `
          <div style="border-top:1px solid #D4D4D8;margin-bottom:12px;"></div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
            <tr>
              <td style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#52525b;">Reference</td>
              <td align="right" style="font-size:12px;font-family:monospace;color:#191A23;word-break:break-all;">${reference}</td>
            </tr>
          </table>`
        : ""}
          ${fundedAt
        ? `
          <div style="border-top:1px solid #D4D4D8;margin-bottom:12px;"></div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#52525b;">Date & Time</td>
              <td align="right" style="font-size:13px;color:#191A23;">${fundedAt}</td>
            </tr>
          </table>`
        : ""}
        </td>
      </tr>
    </table>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      You can now use your wallet balance to purchase gifts, send cards, and more on WishCube.
    </p>
    ${renderButton("View My Wallet", dashboardUrl)}`;
    return baseEmailLayout({
        title: "Wallet Funded!",
        subtitle: "Your account has been topped up",
        content,
        icon: "💰",
    });
};
exports.walletFundedTemplate = walletFundedTemplate;
/**
 * Template for vendor welcome notification
 */
const vendorWelcomeTemplate = (ownerName, storeName, dashboardUrl) => {
    const content = `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${ownerName},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      We're thrilled to have your store, <strong>${storeName}</strong>, onboard! Our team is currently reviewing your details.
    </p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      Once approved, you'll be able to list your products and start helping our users send the perfect gifts to their loved ones.
    </p>
    ${renderButton("Vendor Dashboard", dashboardUrl)}`;
    return baseEmailLayout({
        title: "Welcome, Vendor!",
        subtitle: "Your application is under review",
        content,
        icon: "🛍️",
    });
};
exports.vendorWelcomeTemplate = vendorWelcomeTemplate;
/**
 * Template for user welcome notification
 */
const userWelcomeTemplate = (name, dashboardUrl, isGoogle = false) => {
    const content = isGoogle
        ? `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${name},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      We're thrilled to have you join our community! Start managing your celebrations and sending thoughtful digital experiences today.
    </p>
    ${renderButton("Go to Dashboard", dashboardUrl)}`
        : `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${name},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      With WishCube, you can manage celebrations, send digital greeting cards & websites, and find the perfect gifts for your loved ones. We're excited to help you celebrate those special moments!
    </p>
    ${renderButton("Go to Dashboard", dashboardUrl)}
    <p style="margin:28px 0 0;color:#52525b;font-size:13px;line-height:1.7;text-align:center;">
      If you have any questions, just reply to this email. We're here to help!
    </p>`;
    return baseEmailLayout({
        title: "Welcome to WishCube!",
        subtitle: isGoogle
            ? `You've joined via Google, ${name}`
            : `We're thrilled to have you onboard, ${name}`,
        content,
        icon: isGoogle ? "✨" : "🎉",
    });
};
exports.userWelcomeTemplate = userWelcomeTemplate;
/**
 * Template for subscription activation
 */
const subscriptionActiveTemplate = (name, planType, expiryDate, dashboardUrl) => {
    const content = `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${name},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      Your upgrade to the <strong>${planType.toUpperCase()}</strong> plan was successful. You now have full access to all premium features!
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;border:2px solid #191A23;margin-bottom:28px;">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#191A23;">Plan Summary</p>
          <p style="margin:0 0 5px;font-size:14px;color:#191A23;"><strong>Tier:</strong> ${planType.toUpperCase()}</p>
          <p style="margin:0 0 5px;font-size:14px;color:#191A23;"><strong>Expiry:</strong> ${expiryDate}</p>
          <p style="margin:0;font-size:14px;color:#191A23;"><strong>Status:</strong> Active</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 12px;color:#191A23;font-size:14px;font-weight:700;">Your Premium Perks:</p>
    <ul style="margin:0 0 28px;padding-left:20px;color:#52525b;font-size:13px;line-height:1.8;">
      <li>Create unlimited celebration websites</li>
      <li>Use custom slugs for your links</li>
      <li>Password protect your pages</li>
      <li>Access advanced AI messaging tools</li>
    </ul>
    ${renderButton("Start Creating", dashboardUrl)}`;
    return baseEmailLayout({
        title: "Subscription Active!",
        subtitle: `Welcome to the ${planType.toUpperCase()} experience`,
        content,
        icon: "🚀",
    });
};
exports.subscriptionActiveTemplate = subscriptionActiveTemplate;
/**
 * Template for password reset
 */
const passwordResetTemplate = (name, resetUrl) => {
    const content = `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${name || "there"},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      You're receiving this email because a password reset was requested for your account. This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
    </p>
    ${renderButton("Reset Password", resetUrl)}
    <div style="margin:28px 0 0;padding-top:20px;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">
        If the button doesn't work, copy and paste this link: <br/> ${resetUrl}
      </p>
    </div>`;
    return baseEmailLayout({
        title: "Password Reset",
        subtitle: "Secure your account access",
        content,
        icon: "🔐",
    });
};
exports.passwordResetTemplate = passwordResetTemplate;
/**
 * Template for vendor approval
 */
const vendorApprovedTemplate = (ownerName, storeName, dashboardUrl) => {
    const content = `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${ownerName},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      Congratulations! Your store, <strong>${storeName}</strong>, has been approved. You can now start listing your products on the WishCube marketplace.
    </p>
    ${renderButton("Go to Dashboard", dashboardUrl)}`;
    return baseEmailLayout({
        title: "Store Approved!",
        subtitle: `Your store "${storeName}" is live`,
        content,
        icon: "🎉",
    });
};
exports.vendorApprovedTemplate = vendorApprovedTemplate;
/**
 * Template for vendor rejection
 */
const vendorRejectedTemplate = (ownerName, storeName, reason) => {
    const content = `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${ownerName},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      We've reviewed your application for <strong>${storeName}</strong>. Unfortunately, we cannot approve it at this time for the following reason:
    </p>
    <div style="background:#FFF1F2;border:2px solid #F43F5E;padding:20px;margin-bottom:28px;color:#9F1239;font-size:14px;">
      <strong>Reason:</strong> ${reason}
    </div>
    <p style="margin:0;color:#52525b;font-size:14px;line-height:1.7;">
      If you'd like to update your details and re-apply, please visit your dashboard.
    </p>`;
    return baseEmailLayout({
        title: "Application Status",
        subtitle: "Update on your vendor application",
        content,
        icon: "❌",
    });
};
exports.vendorRejectedTemplate = vendorRejectedTemplate;
/**
 * Template for vendor order notification
 */
const vendorOrderNotificationTemplate = (ownerName, productName, customerName, address, phone, orderUrl) => {
    const content = `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${ownerName},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      Good news! A customer just redeemed a gift for one of your products.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;border:2px solid #191A23;margin-bottom:28px;">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#191A23;">Order Details</p>
          <p style="margin:0 0 5px;font-size:15px;color:#191A23;"><strong>Product:</strong> ${productName}</p>
          <p style="margin:0 0 5px;font-size:14px;color:#52525b;"><strong>Deliver to:</strong> ${customerName}</p>
          <p style="margin:0 0 5px;font-size:14px;color:#52525b;"><strong>Address:</strong> ${address}</p>
          <p style="margin:0;font-size:14px;color:#52525b;"><strong>Phone:</strong> ${phone}</p>
        </td>
      </tr>
    </table>
    ${renderButton("Process Order", orderUrl)}`;
    return baseEmailLayout({
        title: "New Order!",
        subtitle: "You have a new product to fulfill",
        content,
        icon: "📦",
    });
};
exports.vendorOrderNotificationTemplate = vendorOrderNotificationTemplate;
/**
 * Template for sender gift redeemed notification
 */
const giftRedeemedSenderTemplate = (senderName, productName, dashboardUrl) => {
    const content = `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${senderName},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      Your gift of <strong>${productName}</strong> has been redeemed. The vendor has been notified to begin delivery. We'll keep you updated on the progress!
    </p>
    ${renderButton("View Gift Status", dashboardUrl)}`;
    return baseEmailLayout({
        title: "Gift Redeemed!",
        subtitle: "The recipient has claimed your gift",
        content,
        icon: "🚀",
    });
};
exports.giftRedeemedSenderTemplate = giftRedeemedSenderTemplate;
/**
 * Template for order shipped notification to recipient
 */
const orderShippedTemplate = (recipientName, productName, trackingNumber, deliveryCode, trackingUrl) => {
    const content = `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${recipientName},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      Exciting news! Your gift of <strong>${productName}</strong> has been shipped and is on its way to you.
    </p>
    
    <div style="background:#F3F3F3;border:2px solid #191A23;padding:24px;margin-bottom:28px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#191A23;">Delivery Details</p>
      ${trackingNumber ? `<p style="margin:0 0 10px;font-size:14px;color:#191A23;"><strong>Tracking #:</strong> ${trackingNumber}</p>` : ""}
      <p style="margin:0 0 12px;font-size:14px;color:#191A23;"><strong>Delivery Confirmation Code:</strong></p>
      <div style="background:#191A23;color:#ffffff;display:inline-block;padding:12px 24px;font-size:24px;font-weight:800;letter-spacing:4px;border-radius:4px;">
        ${deliveryCode}
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#52525b;">Please provide this code to the delivery agent or enter it on your tracking page to confirm receipt.</p>
    </div>
    
    ${renderButton("Track My Gift", trackingUrl)}`;
    return baseEmailLayout({
        title: "Gift Shipped! 🚚",
        subtitle: "Your package is on the way",
        content,
        icon: "🚚",
    });
};
exports.orderShippedTemplate = orderShippedTemplate;
/**
 * Template for website reply notification
 */
const websiteReplyTemplate = (recipientName, senderName, occasion, message, repliedAt, dashboardUrl) => {
    const content = `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${senderName || "there"},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      Great news! <strong>${recipientName}</strong> just replied to your <strong>${occasion}</strong> greeting.
    </p>

    <!-- Reply bubble -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;border:2px solid #191A23;border-bottom:4px solid #191A23;margin-bottom:28px;">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#191A23;">Their Message</p>
          <p style="margin:0;font-size:16px;color:#191A23;line-height:1.7;font-style:italic;">&ldquo;${message}&rdquo;</p>
          <p style="margin:12px 0 0;font-size:11px;color:#a1a1aa;">${repliedAt}</p>
        </td>
      </tr>
    </table>
    ${renderButton("Go to Dashboard", dashboardUrl)}`;
    return baseEmailLayout({
        title: "They Replied!",
        subtitle: `${recipientName} sent you a message`,
        content,
        icon: "💌",
    });
};
exports.websiteReplyTemplate = websiteReplyTemplate;
/**
 * Template for website reaction notification
 */
const websiteReactionTemplate = (recipientName, senderName, occasion, emoji, reactedAt, dashboardUrl) => {
    const content = `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${senderName || "there"},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">
      <strong>${recipientName}</strong> just reacted to your <strong>${occasion}</strong> greeting with:
    </p>

    <!-- Emoji highlight -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;border:2px solid #191A23;border-bottom:4px solid #191A23;margin-bottom:28px;">
      <tr>
        <td style="padding:32px;text-align:center;">
          <span style="font-size:64px;line-height:1;">${emoji}</span>
          <p style="margin:16px 0 0;font-size:13px;color:#52525b;">Sent on ${reactedAt}</p>
        </td>
      </tr>
    </table>
    ${renderButton("View My Websites", dashboardUrl)}`;
    return baseEmailLayout({
        title: "You Got a Reaction!",
        subtitle: `${recipientName} reacted to your greeting`,
        content,
        icon: emoji,
    });
};
exports.websiteReactionTemplate = websiteReactionTemplate;
/**
 * Template for generic notification
 */
const genericNotificationTemplate = (name, message, buttonText, buttonUrl) => {
    const content = `
    <p style="margin:0 0 6px;color:#191A23;font-size:15px;font-weight:700;">Hi ${name},</p>
    <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.7;">${message}</p>
    ${buttonText && buttonUrl ? renderButton(buttonText, buttonUrl) : ""}`;
    return baseEmailLayout({
        title: "Notification",
        subtitle: "Important update from WishCube",
        content,
    });
};
exports.genericNotificationTemplate = genericNotificationTemplate;
